import { MemoryEmbeddingPipeline } from './memoryPipeline';

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
    const rawResults = await this.pipeline.searchMemories(userId, query, 50);

    const rankedResults = rawResults.map((res) => {
      const recencyScore = this.calculateRecency(res.metadata.timestamp as string);
      const importanceScore = (res.metadata.importance as number) || 0.5;

      const compositeScore =
        (res.similarity * this.weights.similarity) +
        (recencyScore * this.weights.recency) +
        (importanceScore * this.weights.importance);

      return { ...res, compositeScore };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    const contextBlocks: string[] = [];
    let currentTokens = 0;

    for (const res of rankedResults) {
      const estimatedTokens = res.content.length / 4;
      if (currentTokens + estimatedTokens > tokenLimit) break;

      if (contextBlocks.some(block => block.includes(res.content.substring(0, 20)))) continue;

      contextBlocks.push(`[${(res.metadata.type as string).toUpperCase()}] (${res.metadata.timestamp as string}): ${res.content}`);
      currentTokens += estimatedTokens;
    }

    return contextBlocks.join('\n---\n');
  }

  private calculateRecency(timestamp: string): number {
    const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    return 1 / (1 + Math.log(1 + hours));
  }
}
