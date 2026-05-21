import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { MemoryEmbeddingPipeline } = await import('@/lib/memoryPipeline');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY not configured' },
        { status: 503 }
      );
    }

    const pipeline = new MemoryEmbeddingPipeline({
      openaiApiKey: apiKey,
      chromaHost: process.env.VECTORDB_HOST || 'localhost',
      chromaPort: parseInt(process.env.CHROMA_PORT || '8001'),
      maxRetries: 3,
    });

    await pipeline.initialize();

    const body = await req.json();
    const { userId, content, tags, memoryType, importance, conversationId } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and content are mandatory.' },
        { status: 400 }
      );
    }

    const memoryId = await pipeline.processMemory({
      rawContent: content,
      metadata: {
        userId,
        conversationId,
        type: (memoryType as 'episodic' | 'semantic' | 'procedural') || 'episodic',
        importance: importance || 0.5,
        tags: tags || [],
        source: 'web_client',
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Memory saved successfully',
      data: { memoryId, userId, type: memoryType || 'episodic' },
    }, { status: 201 });

  } catch (error) {
    console.error('[API Memory Save] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to save memory', details: errorMessage },
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
