import { NextRequest, NextResponse } from 'next/server';
import { MemoryEmbeddingPipeline } from '@/lib/memoryPipeline';

/**
 * --- Configuration ---
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
    const { userId, query, nResults } = body;

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and query are mandatory.' },
        { status: 400 }
      );
    }

    // 2. Ensure Pipeline is Ready
    await initPromise;

    // 3. Perform Semantic Search
    const results = await pipeline.searchMemories(
      userId,
      query,
      nResults || 5
    );

    // 4. Return Results
    return NextResponse.json({
      success: true,
      data: results,
      query: {
        text: query,
        limit: nResults || 5
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[API Memory Search] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search memories',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
