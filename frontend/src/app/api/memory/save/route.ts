import { NextRequest, NextResponse } from 'next/server';
import { MemoryEmbeddingPipeline, MemoryType } from '@/lib/memoryPipeline';

/**
 * --- Configuration ---
 * In a real application, ensure these environment variables are set.
 */
const pipeline = new MemoryEmbeddingPipeline({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  chromaHost: process.env.VECTORDB_HOST || 'localhost',
  chromaPort: parseInt(process.env.CHROMA_PORT || '8001'),
  maxRetries: 3,
});

// Initialize the pipeline once
const initPromise = pipeline.initialize();

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and Validate Input
    const body = await req.json();
    const { userId, content, tags, memoryType, importance, conversationId } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and content are mandatory.' },
        { status: 400 }
      );
    }

    // 2. Ensure Pipeline is Ready
    await initPromise;

    // 3. Process Memory through Pipeline
    // This handles cleaning, embedding, and storage in ChromaDB + Postgres logic
    const memoryId = await pipeline.processMemory({
      rawContent: content,
      metadata: {
        userId,
        conversationId,
        type: (memoryType as MemoryType) || 'episodic',
        importance: importance || 0.5,
        tags: tags || [],
        source: 'web_client',
        timestamp: new Date().toISOString(),
      },
    });

    // 4. Return Success Response
    return NextResponse.json({
      success: true,
      message: 'Memory saved successfully',
      data: {
        memoryId,
        userId,
        type: memoryType || 'episodic',
      },
    }, { status: 201 });

  } catch (error) {
    console.error('[API Memory Save] Error:', error);

    // Differentiate between validation, external API, and internal errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save memory',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

/**
 * --- Best Practices for Next.js API Routes ---
 * 1. Middleware: Use middleware for authentication (e.g., verifying Clerk or Firebase tokens).
 * 2. Rate Limiting: Implement rate limiting to prevent OpenAI cost spikes.
 * 3. Logging: Use a service like Axiom or Sentry to track pipeline failures in production.
 */
