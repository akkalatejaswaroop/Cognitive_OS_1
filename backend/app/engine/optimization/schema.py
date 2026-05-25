from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

class OptimizationStrategy(str, Enum):
    PASS_THROUGH = "none"
    PRUNE_LOW_RELEVANCE = "prune"
    HIERARCHICAL_SUMMARIZATION = "summarize"
    TOKEN_CAP_ENFORCEMENT = "cap"

class TokenBudget(BaseModel):
    total_budget: int = 128000
    system_prompt_limit: int = 2000
    memory_limit: int = 10000
    output_reserve: int = 4000
    available_for_context: int = 112000

class ContextComponent(BaseModel):
    name: str
    content: str
    priority: int  # 1 = Highest, 10 = Lowest
    relevance_score: float = 1.0
    token_count: Optional[int] = None

class OptimizationReport(BaseModel):
    original_tokens: int
    optimized_tokens: int
    reduction_percentage: float
    strategy_applied: OptimizationStrategy
    cost_saved_est: float # Est. USD per 1k calls
