"""
Summary Agent for Cognitive OS
Distills multiple data sources into clean, structured Markdown summaries.
Extracts key insights and bullet-point summaries for meetings and workflows.
"""
from __future__ import annotations

import asyncio
import logging
import os
from enum import Enum
from typing import Optional

# Assuming OpenAI SDK is installed
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.agents.base import BaseAgent

logger = logging.getLogger(__name__)

# ============================================================================ #
#  1. PROMPT TEMPLATES & SCHEMAS
# ============================================================================ #

class SummaryType(str, Enum):
    MEETING = "MEETING"
    WORKFLOW = "WORKFLOW"
    DAILY_DIGEST = "DAILY_DIGEST"
    TASK = "TASK"

class KeyInsight(BaseModel):
    """A single key insight extracted from the text."""
    title: str = Field(..., description="Short, bold title for the insight.")
    description: str = Field(..., description="1-2 sentence description of the insight.")

class StructuredSummary(BaseModel):
    """The structured Pydantic schema for the LLM output."""
    title: str = Field(..., description="A concise title for the overall summary.")
    executive_summary: str = Field(..., description="A 2-3 sentence high-level overview.")
    bullet_points: list[str] = Field(..., description="List of the most important points discussed.")
    key_insights: list[KeyInsight] = Field(..., description="List of derived key insights.")
    action_items: list[str] = Field(default_factory=list, description="Any next steps or action items identified.")


SUMMARY_SYSTEM_PROMPT = """
You are the elite Communication and Synthesis Specialist for Cognitive OS.
Your objective is to read raw input text (transcripts, task logs, emails) and 
distill it into a highly structured, professional summary.

Formatting Requirements:
1. Be extremely concise. Remove all fluff.
2. Ensure bullet points are actionable and clear.
3. Extract hidden 'Key Insights' that might not be obvious at first glance.
4. If there are no obvious action items, return an empty list.

Summary Type Requested: {summary_type}
"""

# ============================================================================ #
#  2. SUMMARY AGENT IMPLEMENTATION
# ============================================================================ #

class SummaryAgent(BaseAgent):
    """
    Receives raw text and uses OpenAI Structured Outputs to generate a 
    clean, categorized Markdown summary.
    Falls back gracefully when OpenAI is unavailable.
    """

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o-mini"):
        super().__init__(name="summary-agent", role="Synthesis Specialist")
        self._api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._model = model
        self._client: AsyncOpenAI | None = None

    def _ensure_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not self._api_key:
                raise RuntimeError(
                    "SummaryAgent requires OPENAI_API_KEY. "
                    "Set it in your .env file or environment variables."
                )
            self._client = AsyncOpenAI(api_key=self._api_key)
        return self._client

    async def execute(self, task: str, task_id: str | None = None) -> str:
        summary = await self.generate_summary(task)
        if summary is None:
            return "Failed to generate summary."
        return self.format_as_markdown(summary)

    async def generate_summary(
        self, 
        raw_text: str, 
        summary_type: SummaryType = SummaryType.MEETING
    ) -> StructuredSummary | None:
        """Calls OpenAI to generate a validated structured summary."""
        try:
            client = self._ensure_client()
            logger.info(f"Generating {summary_type.value} summary...")
            
            response = await client.beta.chat.completions.parse(
                model=self._model,
                messages=[
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT.format(summary_type=summary_type.value)},
                    {"role": "user", "content": raw_text},
                ],
                response_format=StructuredSummary,
                temperature=0.3, # Low temperature for analytical consistency
            )
            
            return response.choices[0].message.parsed
        except Exception as exc:
            logger.error(f"Failed to generate structured summary: {exc}")
            return None

    def format_as_markdown(self, summary: StructuredSummary) -> str:
        """Converts the structured Pydantic schema into clean Markdown."""
        md = []
        md.append(f"# {summary.title}\n")
        
        md.append("## Executive Summary")
        md.append(f"{summary.executive_summary}\n")
        
        md.append("## Key Points")
        for point in summary.bullet_points:
            md.append(f"- {point}")
        md.append("\n")
            
        md.append("## 💡 Key Insights")
        for insight in summary.key_insights:
            md.append(f"- **{insight.title}**: {insight.description}")
        md.append("\n")
            
        if summary.action_items:
            md.append("## 📌 Action Items")
            for item in summary.action_items:
                md.append(f"- [ ] {item}")
            md.append("\n")
            
        return "\n".join(md)


# ============================================================================ #
#  3. EXAMPLE OUTPUTS / USAGE
# ============================================================================ #

async def example_usage():
    import sys
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    
    if not os.getenv("OPENAI_API_KEY"):
        print("\n[WARNING] OPENAI_API_KEY is not set. The LLM call will fail.")
        print("Set it in your terminal or .env file before running.")
        return

    print("\n=== Initializing Summary Agent ===")
    agent = SummaryAgent()
    
    mock_transcript = (
        "Alice: Hey everyone, let's go over the Cognitive OS launch. "
        "Bob: We are slightly delayed on the vector database integration. Chroma is throwing timeouts. "
        "Alice: Can we switch to Pinecone temporarily? "
        "Charlie: Pinecone would cost too much. Let's just fix the Chroma retry logic in the Execution Agent. "
        "Alice: Okay, Bob, can you implement exponential backoff on Chroma by Thursday? "
        "Bob: Yes, I'll push the PR tomorrow. "
        "Alice: Great, and Charlie, please update the docs to reflect this architecture change."
    )
    
    print("\n=== Raw Input ===")
    print(mock_transcript)
    
    print("\n=== Executing API Integration... ===")
    structured_data = await agent.generate_summary(
        raw_text=mock_transcript, 
        summary_type=SummaryType.MEETING
    )
    
    if not structured_data:
        print("Summary generation failed.")
        return

    print("\n=== Generated Markdown Output ===")
    markdown_result = agent.format_as_markdown(structured_data)
    print(markdown_result)

if __name__ == "__main__":
    asyncio.run(example_usage())
