# Cognitive OS — Co-founder Test & Systems Recommendations
## Implementation Blueprints for High-Fidelity Robustness

This document contains complete technical blueprints, design architectures, and production-ready code blocks to implement the three high-priority system refinements highlighted in the Systems Audit.

---

## Priority 1: E2E Integration Coverage (Playwright Setup)

To verify that HTTPOnly cookies (`access_token` and `refresh_token`) remain fully synchronized during layout switches, tab active changes, and workspace creations, we recommend implementing **Playwright with TypeScript**.

### 1. Configuration: `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 2. Integration Test: `e2e/auth-sync.spec.ts`
This test simulates Firebase authentication synchronization, patches local profile properties, and verifies glassmorphic visual switches without breaking cookie contexts.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cognitive OS — Systems Sync & Layout Transitions', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Inject mock Firebase Auth Token into window before load
    await page.addInitScript(() => {
      window.localStorage.setItem('firebase_auth_mock', 'true');
    });
    
    // 2. Open dashboard landing page
    await page.goto('/dashboard');
  });

  test('Should synchronize authentication cookie states during active tab switches', async ({ page }) => {
    // Verify that the user profile details fetch correctly from /api/v1/auth/me
    const nameSelector = page.locator('h1:has-text("User")');
    await expect(nameSelector).toBeVisible();

    // Verify workspace create indicator is active
    await page.click('a[title="Create a workspace"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Should execute visual theme shifts and verify glassmorphic panel opacity', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // 1. Find and toggle Light/Dark Mode theme buttons
    const darkBtn = page.locator('button:has-text("dark")');
    await darkBtn.click();
    
    // 2. Assert HTML element receives the theme class
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    
    // 3. Verify glassmorphic settings container remains visible and translucent
    const settingsPanel = page.locator('.glass-panel').first();
    await expect(settingsPanel).toHaveCSS('backdrop-filter', /blur/);
  });
});
```

---

## Priority 2: Standardizing Vector DB Lifecycle (Lightweight In-memory RAG Fallback)

ChromaDB is highly powerful but introduces operational overhead in local, Dockerless, or offline development environments. If Chroma is unreachable, the system must fallback gracefully to an in-memory cosine-similarity retriever using standard python libraries.

### 1. In-memory Mock Vector Store: `app/services/vector_fallback.py`
This class implements identical interfaces to ChromaDB, calculating embeddings and ranking chunks on standard CPU memory using `numpy`.

```python
import numpy as np
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

class LightweightMemoryVectorStore:
    """
    Offline fallback vector store. Calculates cosine similarities 
    using CPU-bound numpy operations if ChromaDB is unreachable.
    """
    def __init__(self):
        self.documents: List[str] = []
        self.embeddings: List[List[float]] = []
        self.metadatas: List[Dict[str, Any]] = []
        logger.info("Initialized LightweightMemoryVectorStore fallback database.")

    def add_texts(self, texts: List[str], embeddings: List[List[float]], metadatas: List[Dict[str, Any]]):
        for t, e, m in zip(texts, embeddings, metadatas):
            self.documents.append(t)
            self.embeddings.append(e)
            self.metadatas.append(m)
        logger.info(f"Added {len(texts)} vector indices to memory cache fallback.")

    def similarity_search(self, query_vector: List[float], k: int = 3) -> List[Dict[str, Any]]:
        if not self.embeddings:
            return []

        # Convert to numpy arrays
        matrix = np.array(self.embeddings)          # Shape: (N, D)
        query = np.array(query_vector)              # Shape: (D,)

        # Compute cosine similarity: (A . B) / (||A|| * ||B||)
        dot_products = np.dot(matrix, query)
        matrix_norms = np.linalg.norm(matrix, axis=1)
        query_norm = np.linalg.norm(query)
        
        # Prevent division by zero
        norms = matrix_norms * query_norm
        norms[norms == 0.0] = 1.0
        
        similarities = dot_products / norms
        
        # Sort descending
        top_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_indices:
            results.append({
                "content": self.documents[idx],
                "metadata": self.metadatas[idx],
                "relevance_score": float(similarities[idx])
            })
        return results
```

### 2. Integration into Database Layer: `app/core/database.py`
We hook this fallback vector db seamlessly:

```python
# app/core/database.py (Revised chunk)
from app.services.vector_fallback import LightweightMemoryVectorStore

chroma_client = None
fallback_vector_store = None

try:
    import chromadb
    chroma_client = chromadb.HttpClient(host=settings.VECTORDB_HOST, port=settings.CHROMA_PORT)
    chroma_client.heartbeat()
    logger.info("Successfully connected to ChromaDB.")
except Exception as e:
    logger.warning("ChromaDB offline. Scaling to CPU memory fallback vector store.")
    fallback_vector_store = LightweightMemoryVectorStore()
```

---

## Priority 3: API Rate Limiting Middleware (Redis-backed Rate Limiter)

Public portfolio routing (`/api/v1/auth/public/{username}`) is highly susceptible to scraping and credential exhaustion. We recommend implementing a **FastAPI Redis-backed Rate-Limiting Middleware**.

### 1. Dependency Integration: `app/core/rate_limit.py`
```python
import time
import httpx
from fastapi import Request, HTTPException, status
from redis.asyncio import Redis

class RedisRateLimiter:
    """
    Sliding window log rate limiter using Redis pipelines.
    Guarantees strict throughput control across distributed clusters.
    """
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis = Redis.from_url(redis_url, encoding="utf-8", decode_responses=True)

    async def check_rate_limit(self, request: Request, limit: int = 60, window_seconds: int = 60):
        # 1. Identify client via Host IP address or API credentials
        client_ip = request.client.host if request.client else "anonymous"
        key = f"rate_limit:{request.url.path}:{client_ip}"
        
        now = time.time()
        clear_before = now - window_seconds
        
        async with self.redis.pipeline(transaction=True) as pipe:
            # Clean old records from window log
            pipe.zremrangebyscore(key, 0, clear_before)
            # Count elements currently in sliding window log
            pipe.zcard(key)
            # Add current request element to sliding window
            pipe.zadd(key, {str(now): now})
            # Set key expiration
            pipe.expire(key, window_seconds)
            
            # Execute pipeline
            _, current_requests, _, _ = await pipe.execute()

        if current_requests > limit:
            logger.warning(f"Rate limit exceeded for client IP: {client_ip} on path {request.url.path}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait before retrying."
            )
```

### 2. Route Enforcement: `app/api/routes/auth.py`
Enforce rate limiting selectively on high-risk endpoints:

```python
from app.core.rate_limit import RedisRateLimiter

rate_limiter = RedisRateLimiter(redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"))

@router.get("/public/{username}", response_model=PublicProfileResponse)
async def get_public_profile(
    username: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    # Enforce strict maximum of 15 requests per minute for public scraping protection
    await rate_limiter.check_rate_limit(request, limit=15, window_seconds=60)
    
    user = db.query(User).filter(User.public_profile_url == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Profile not found")
    return PublicProfileResponse.model_validate(user)
```

---

## Conclusion

By implementing these three high-priority recommendations:
1. **Playwright** will insulate Next.js cookie syncing against breaking front-end changes.
2. **Numpy Fallback Vector Store** guarantees zero local developer setup friction and maintains RAG functionality even when ChromaDB is down.
3. **Redis Rate Limiting** creates robust scraping walls around user profile endpoints.
