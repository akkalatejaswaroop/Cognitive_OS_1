import asyncio
import json
from app.engine.prompts.builder import MasterSystemPromptBuilder

async def generate_cognitive_os_prompt():
    # Mock data to demonstrate the generator
    user_context = {
        "user_id": "usr_9f2e1c",
        "user_name": "Alex Chen"
    }
    
    memory_data = {
        "user_profile": "Alex is a Senior Software Engineer specializing in AI. Prefers Python and React.",
        "episodic_memory": "Discussed RAG optimization on May 24th. Alex wants to use Pinecone.",
        "preferences": "Concise communication. Prefers code examples over long prose."
    }
    
    rag_data = {
        "context_block": "[doc_042] Cognitive OS Architecture v1.0. Memory system uses tiered storage.",
        "confidence_score": 0.95
    }

    builder = MasterSystemPromptBuilder(user_context=user_context)
    
    master_prompt = builder.assemble(
        mode="COLLABORATIVE",
        session_id="sess_20260525_xyz",
        memory_data=memory_data,
        rag_data=rag_data,
        available_tokens=128000
    )
    
    print("="*80)
    print("GENERATED MASTER SYSTEM PROMPT FOR COGNITIVE OS")
    print("="*80)
    print(master_prompt)
    print("="*80)

if __name__ == "__main__":
    asyncio.run(generate_cognitive_os_prompt())
