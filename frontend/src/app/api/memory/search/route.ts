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
    const { userId, query, nResults } = body;

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and query are mandatory.' },
        { status: 400 }
      );
    }

    const results = await pipeline.searchMemories(userId, query, nResults || 5);

    return NextResponse.json({
      success: true,
      data: results,
      query: { text: query, limit: nResults || 5 }
    }, { status: 200 });

  } catch (error) {
    console.error('[API Memory Search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to search memories', details: errorMessage },
      { status: 500 }
    );
  }
}
