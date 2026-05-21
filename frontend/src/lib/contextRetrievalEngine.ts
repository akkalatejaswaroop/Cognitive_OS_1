# Context Retrieval Engine Design - Cognitive OS

The Context Retrieval Engine (CRE) is the "working memory" of Cognitive OS. It selects the most relevant fragments from the long-term vector store and formats them for immediate AI reasoning.

## 1. The Algorithm
1. **Candidate Retrieval**: Fetch the top 50-100 candidates from ChromaDB using semantic similarity.
2. **Multi-Factor Scoring**: Re-rank candidates based on a weighted formula.
3. **Semantic De-duplication**: Remove memories that are too similar to each other to save token space.
4. **Token Budgeting**: Iterate through ranked memories and pack them into the prompt until the token limit is reached.
5. **Contextual Grouping**: Organize the final selection by memory type (e.g., "Facts", "User Preferences", "Recent Events").

## 2. Scoring Formula
The **Composite Relevance Score ($CR$)** is defined as:

$$CR = (w_{sim} \cdot S) + (w_{rec} \cdot R) + (w_{imp} \cdot I)$$

Where:
- $S$: Semantic Similarity (0 to 1).
- $R$: Recency Score. Calculated as $1 / (1 + \ln(1 + \Delta t))$, where $\Delta t$ is hours since creation.
- $I$: Importance Score (0 to 1).
- $w$: Weight parameters (typically $w_{sim}=0.5, w_{rec}=0.3, w_{imp}=0.2$).

## 3. Pseudocode
```
Function RetrieveContext(query, userId, tokenLimit):
    candidates = ChromaDB.Query(query, userId, limit=100)
    for each c in candidates:
        c.score = CalculateCompositeScore(c)
    
    candidates.SortByScoreDescending()
    
    finalSelection = []
    currentTokenCount = 0
    
    for each c in candidates:
        if IsDuplicate(c, finalSelection): continue
        if (currentTokenCount + c.tokens) > tokenLimit: break
        
        finalSelection.Add(c)
        currentTokenCount += c.tokens
        
    return GroupByContext(finalSelection)
```

## 4. TypeScript Implementation
The engine leverages the existing `MemoryEmbeddingPipeline` for base retrieval.

```typescript
import { MemoryEmbeddingPipeline, MemoryMetadata } from './memoryPipeline';

export interface ContextResult {
  content: string;
  score: number;
  type: string;
  timestamp: string;
}

export class ContextRetrievalEngine {
  private pipeline: MemoryEmbeddingPipeline;
  private weights = { similarity: 0.5, recency: 0.3, importance: 0.2 };

  constructor(pipeline: MemoryEmbeddingPipeline) {
    this.pipeline = pipeline;
  }

  async getReasoningContext(userId: string, query: string, tokenLimit: number = 2000): Promise<string> {
    // 1. Fetch candidates (Wide net)
    const rawResults = await this.pipeline.searchMemories(userId, query, 50);

    // 2. Score and Rank
    const rankedResults = rawResults.map(res => {
      const recencyScore = this.calculateRecency(res.metadata.timestamp);
      const importanceScore = res.metadata.importance || 0.5;
      
      const compositeScore = 
        (res.similarity * this.weights.similarity) +
        (recencyScore * this.weights.recency) +
        (importanceScore * this.weights.importance);

      return { ...res, compositeScore };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    // 3. De-duplicate and Token Pack
    const contextBlocks: string[] = [];
    let currentTokens = 0;

    for (const res of rankedResults) {
      const estimatedTokens = res.content.length / 4; // Rough estimate
      if (currentTokens + estimatedTokens > tokenLimit) break;
      
      // Simple duplicate check (can be improved with semantic threshold)
      if (contextBlocks.some(block => block.includes(res.content.substring(0, 20)))) continue;

      contextBlocks.push(`[${res.metadata.type.toUpperCase()}] (${res.metadata.timestamp}): ${res.content}`);
      currentTokens += estimatedTokens;
    }

    return contextBlocks.join('\n---\n');
  }

  private calculateRecency(timestamp: string): number {
    const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    return 1 / (1 + Math.log(1 + hours));
  }
}
```

## 5. Optimization Strategy
- **Vector Indexing**: Use HNSW with cosine similarity for fast candidate retrieval.
- **Lazy Scoring**: Only calculate composite scores for the top 50 candidates, not the whole database.
- **Cache Layer**: Store the "Last 5 Contexts" in Redis for conversation continuity without re-embedding.
- **Batch Embedding**: If searching for multiple queries (Multi-query retrieval), batch the OpenAI API calls.
- **Semantic Filtering**: Use a similarity threshold (e.g., 0.9) between candidates to prune redundant memories before they hit the token counter.
