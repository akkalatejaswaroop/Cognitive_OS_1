# Standard Operating Procedure: Cognitive Memory Engine (CME)

## 1. System Overview
The Cognitive Memory Engine (CME) is the persistent knowledge layer of Cognitive OS. It provides agents with a "digital mind" by storing and retrieving semantically relevant information from past interactions. It utilizes a hybrid architecture:
- **Relational (PostgreSQL)**: Manages metadata, importance scores, and audit logs.
- **Vector (ChromaDB)**: Stores high-dimensional embeddings for semantic search.
- **Inference (OpenAI)**: Generates 1536-dimensional vectors using `text-embedding-3-small`.

## 2. Memory Lifecycle
1.  **Acquisition**: Raw interaction data is captured from agents or user inputs.
2.  **Consolidation**: Information is cleaned, summarized, and assigned an importance score.
3.  **Encoding**: The content is transformed into a vector representation.
4.  **Storage**: Synchronized entry into Postgres (metadata) and ChromaDB (vectors).
5.  **Retrieval**: Semantic query results are ranked and assembled into agent context.
6.  **Decay**: (Future) Importance scores are adjusted over time based on non-usage.

## 3. Embedding Workflow
- **Input**: Raw text + Metadata (userId, type, tags).
- **Cleaning**: Normalize whitespace, remove special characters, and trim.
- **API Call**: Send to OpenAI `embeddings` endpoint.
- **Retry Logic**: Exponential backoff (1s, 2s, 4s) for network or rate-limit failures.
- **Finalization**: Return unique `memoryId` and token usage metrics.

## 4. Retrieval Workflow
- **Query**: Natural language string from user/agent.
- **Filtering**: **MANDATORY** `where={"userId": currentUserId}` filter to ensure isolation.
- **Top-K Search**: Retrieve the top 50 semantic candidates from ChromaDB.
- **Composite Ranking**: Apply the formula: `Score = (0.5 * Similarity) + (0.3 * Recency) + (0.2 * Importance)`.
- **Assembly**: Pack into a structured block, removing duplicates and compressing low-score items to fit the token budget.

## 5. Failure Handling
- **OpenAI Down**: CME enters "Graceful Degradation" mode. Semantic search is disabled; system falls back to keyword matching in Postgres or recent conversation history.
- **ChromaDB Down**: Log critical error. Vector storage is queued (if async) or rejected.
- **Database Errors**: All write operations are wrapped in transactions (where applicable) or logged for manual reconciliation.

## 6. Debugging
- **Logs**: Monitor `logs/cognitive_os.log` for `[MemoryService]` or `[ChromaEngine]` tags.
- **Inspection**: Use the internal `ChromaMemoryManager.search_memories` with `n_results=100` to inspect raw vector distributions.
- **UI**: Use the **Memory Dashboard** timeline to verify chronological consistency.

## 7. Monitoring
- **Token Usage**: Tracked per-user and per-request to manage API costs.
- **Index Density**: Monitored via the Dashboard to ensure the vector index remains efficient.
- **Recall Accuracy**: Periodic "Golden Set" testing to ensure queries return expected results.

## 8. Performance Optimization
- **HNSW Indexing**: Ensure ChromaDB is configured with `hnsw:space: cosine` for high-speed retrieval.
- **Lazy Re-ranking**: Only re-rank the top 50 candidates, never the full result set.
- **Batch Processing**: Use background workers (FastAPI `BackgroundTasks`) for the embedding and storage phase to keep API response times < 200ms.

## 9. Security Best Practices
- **User Isolation**: Never allow a vector query that does not include a `userId` filter.
- **Token Safety**: Never log raw API keys or PII (Personally Identifiable Information) in the plain-text logs.
- **Sanitization**: All metadata fields must be sanitized before being stored in Postgres to prevent SQL injection.

## 10. Future Scalability
- **Horizontal Scaling**: Move from a local ChromaDB instance to a distributed managed service (e.g., Pinecone or Chroma Cloud) as user volume increases.
- **Memory Merging**: Implement a background "Consolidation Agent" that merges redundant memories into a single high-density summary.
- **Tiered Storage**: Move old, low-importance memories to "cold storage" (Postgres only) to keep the vector index lean.
