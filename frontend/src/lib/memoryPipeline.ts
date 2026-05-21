import { OpenAI } from 'openai';
import { ChromaClient, Collection } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';

/**
 * --- Interfaces & Types ---
 */

export type MemoryType = 'episodic' | 'semantic' | 'procedural';

export interface MemoryMetadata {
  userId: string;
  conversationId?: string;
  type: MemoryType;
  importance: number;
  tags?: string[];
  [key: string]: any;
}

export interface MemoryPayload {
  rawContent: string;
  metadata: MemoryMetadata;
}

export interface EmbeddingResult {
  id: string;
  embedding: number[];
  cleanedContent: string;
  tokenUsage: number;
}

export interface PipelineConfig {
  openaiApiKey: string;
  chromaHost: string;
  chromaPort: number;
  maxRetries?: number;
}

/**
 * --- Utility: Text Cleaner ---
 */
class TextCleaner {
  static clean(text: string): string {
    return text
      .replace(/[\r\n]+/g, ' ') // Remove newlines
      .replace(/\s+/g, ' ')      // Normalize spaces
      .trim();
  }
}

/**
 * --- Memory Embedding Pipeline ---
 */
export class MemoryEmbeddingPipeline {
  private openai: OpenAI;
  private chroma: ChromaClient;
  private collection: Collection | null = null;
  private maxRetries: number;

  constructor(config: PipelineConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.chroma = new ChromaClient({
      path: `http://${config.chromaHost}:${config.chromaPort}`
    });
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Initialize ChromaDB Collection
   */
  async initialize(collectionName: string = 'cognitive_memory_v1') {
    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: collectionName,
        metadata: { "hnsw:space": "cosine" }
      });
      console.log(`[Pipeline] Initialized collection: ${collectionName}`);
    } catch (error) {
      console.error('[Pipeline] Failed to initialize ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Core Pipeline: Clean -> Embed -> Store
   */
  async processMemory(payload: MemoryPayload): Promise<string> {
    const memoryId = uuidv4();
    const cleanedContent = TextCleaner.clean(payload.rawContent);

    try {
      // 1. Generate Embedding with Retry Logic
      const embeddingData = await this.generateEmbeddingWithRetry(cleanedContent);

      // 2. Store in ChromaDB (Vector Store)
      await this.storeInChroma(memoryId, cleanedContent, embeddingData.embedding, payload.metadata);

      // 3. Store in PostgreSQL (Metadata Store)
      await this.storeInPostgres(memoryId, cleanedContent, payload.metadata, embeddingData.tokenUsage);

      console.log(`[Pipeline] Successfully processed memory: ${memoryId}`);
      return memoryId;

    } catch (error) {
      console.error(`[Pipeline] Fatal error processing memory:`, error);
      throw new Error(`Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Embedding with exponential backoff
   */
  private async generateEmbeddingWithRetry(text: string, attempt: number = 1): Promise<Omit<EmbeddingResult, 'id' | 'cleanedContent'>> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        tokenUsage: response.usage.total_tokens
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[Pipeline] OpenAI API failed. Retrying in ${delay}ms... (Attempt ${attempt})`);
        await new Promise(res => setTimeout(res, delay));
        return this.generateEmbeddingWithRetry(text, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Vector Storage (ChromaDB)
   */
  private async storeInChroma(id: string, content: string, embedding: number[], metadata: MemoryMetadata) {
    if (!this.collection) throw new Error('Collection not initialized');

    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
      documents: [content]
    });
  }

  /**
   * Semantic Search
   */
  async searchMemories(userId: string, query: string, nResults: number = 5): Promise<any[]> {
    if (!this.collection) throw new Error('Collection not initialized');

    try {
      // 1. Generate Query Embedding
      const embeddingData = await this.generateEmbeddingWithRetry(query);

      // 2. Query ChromaDB
      const results = await this.collection.query({
        queryEmbeddings: [embeddingData.embedding],
        nResults,
        where: { userId: userId }, // Strict user isolation
      });

      // 3. Format Results
      const formatted = results.ids[0].map((id, i) => ({
        id,
        content: results.documents[0][i],
        metadata: results.metadatas[0][i],
        similarity: 1 - (results.distances?.[0][i] || 0) // Cosine similarity
      }));

      return formatted;
    } catch (error) {
      console.error('[Pipeline] Search error:', error);
      throw error;
    }
  }

  /**
   * Metadata Storage (PostgreSQL Placeholder)
   * In a real app, use an ORM like Prisma or a direct SQL driver.
   */
  private async storeInPostgres(id: string, summary: string, metadata: MemoryMetadata, tokens: number) {
    // This is where you would perform your SQL INSERT
    // Example (pseudo-code):
    // await db.memory.create({ data: { id, userId: metadata.userId, summary, tokens, ... } });
    console.log(`[Pipeline] Logged metadata to PostgreSQL for ${id}. Usage: ${tokens} tokens.`);
  }
}

/**
 * --- Production Example Usage ---
 */
/*
const pipeline = new MemoryEmbeddingPipeline({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  chromaHost: 'localhost',
  chromaPort: 8001
});

await pipeline.initialize();
await pipeline.processMemory({
  rawContent: "Remind me to call the architect about the rooftop garden design.",
  metadata: {
    userId: "user_uuid_123",
    type: "episodic",
    importance: 0.8,
    tags: ["architecture", "personal"]
  }
});
*/
