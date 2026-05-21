import { ContextRetrievalEngine } from './contextRetrievalEngine';
import { MemoryEmbeddingPipeline } from './memoryPipeline';

/**
 * --- Interfaces & Types ---
 */

export interface ContextChunk {
  content: string;
  sourceId: string;
  score: number;
  tokens: number;
  type: string;
}

export interface AssembledContext {
  contextString: string;
  totalTokens: number;
  priorityScore: number; // Average quality of retrieved context (0-1)
  chunkCount: number;
}

export interface AssemblerOptions {
  maxTokens: number;
  compressionRatio?: number; // 0.1 to 1.0 (1.0 = no compression)
  includeMetadata?: boolean;
}

/**
 * --- Utility: Simple Token Estimator ---
 * Fallback for when tiktoken/gpt-tokenizer is not available.
 */
class TokenCounter {
  static estimate(text: string): number {
    // Standard OpenAI estimate: 1 token ~= 4 chars or 0.75 words
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(Math.max(charCount / 4, wordCount / 0.75));
  }
}

/**
 * --- Memory Context Assembler ---
 */
export class MemoryContextAssembler {
  private retrievalEngine: ContextRetrievalEngine;
  private pipeline: MemoryEmbeddingPipeline;

  constructor(pipeline: MemoryEmbeddingPipeline) {
    this.pipeline = pipeline;
    this.retrievalEngine = new ContextRetrievalEngine(pipeline);
  }

  /**
   * Assembler: Fetches, compresses, and packs memories into a prompt-ready string.
   */
  async assemble(
    userId: string,
    query: string,
    options: AssemblerOptions = { maxTokens: 1500, compressionRatio: 0.8 }
  ): Promise<AssembledContext> {
    const { maxTokens, compressionRatio = 1.0, includeMetadata = true } = options;

    // 1. Retrieve ranked candidates from CRE
    // The CRE returns a formatted string. For more granular control, 
    // we would ideally have it return the raw array of ranked objects.
    
    // 2. Fetch raw memories for granular processing
    const candidates = await this.pipeline.searchMemories(userId, query, 30);

    // 3. Re-rank with CRE logic (Composite Score)
    const scoredChunks: ContextChunk[] = candidates.map((c) => {
      const recency = this.calculateRecency(c.metadata.timestamp as string);
      const importance = (c.metadata.importance as number) || 0.5;
      const score = (c.similarity * 0.5) + (recency * 0.3) + (importance * 0.2);
      
      // Semantic Compression: Truncate content based on compressionRatio if score is lower
      let processedContent = c.content;
      if (compressionRatio < 1.0 && score < 0.7) {
        const targetLength = Math.floor(c.content.length * compressionRatio);
        processedContent = c.content.substring(0, targetLength) + "... [Compressed]";
      }

      return {
        content: processedContent,
        sourceId: c.id,
        score: score,
        tokens: TokenCounter.estimate(processedContent),
        type: c.metadata.type as string
      };
    }).sort((a, b) => b.score - a.score);

    // 4. Pack into Token Budget with Duplicate Filtering
    const finalChunks: ContextChunk[] = [];
    let currentTokens = 0;
    let totalScoreSum = 0;

    for (const chunk of scoredChunks) {
      // De-duplication check
      if (finalChunks.some(fc => this.isDuplicate(fc.content, chunk.content))) continue;

      if (currentTokens + chunk.tokens > maxTokens) continue;

      finalChunks.push(chunk);
      currentTokens += chunk.tokens;
      totalScoreSum += chunk.score;
    }

    // 5. Construct Final Context String
    const contextString = this.formatPromptBlock(finalChunks, includeMetadata);
    
    return {
      contextString,
      totalTokens: currentTokens,
      priorityScore: finalChunks.length > 0 ? totalScoreSum / finalChunks.length : 0,
      chunkCount: finalChunks.length
    };
  }

  private isDuplicate(a: string, b: string): boolean {
    // Simple Jaccard-like check or prefix match
    const prefixA = a.substring(0, 30).toLowerCase();
    const prefixB = b.substring(0, 30).toLowerCase();
    return prefixA === prefixB;
  }

  private calculateRecency(timestamp: string): number {
    const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    return 1 / (1 + Math.log(1 + hours));
  }

  private formatPromptBlock(chunks: ContextChunk[], includeMetadata: boolean): string {
    if (chunks.length === 0) return "No relevant memories found.";

    const header = "### RELEVANT COGNITIVE CONTEXT\n";
    const body = chunks.map(c => {
      const meta = includeMetadata ? `[Type: ${c.type} | Score: ${c.score.toFixed(2)}]` : '';
      return `${meta}\n${c.content}`;
    }).join('\n\n---\n\n');

    const footer = "\n\n### END OF CONTEXT";
    return `${header}${body}${footer}`;
  }
}
