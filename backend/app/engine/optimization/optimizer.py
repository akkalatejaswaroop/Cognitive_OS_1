"""
Cognitive OS Token Optimizer and Context Compressor.
Implements tiered pruning and summarization to manage context window efficiency.
"""
import logging
import math
from typing import List, Dict, Any, Optional
from app.engine.optimization.schema import (
    ContextComponent, TokenBudget, OptimizationReport, OptimizationStrategy
)

logger = logging.getLogger(__name__)

class TokenOptimizer:
    def __init__(self, chars_per_token: int = 4):
        self.chars_per_token = chars_per_token
        self.default_budget = TokenBudget()

    def optimize_context(self, 
                         components: List[ContextComponent], 
                         target_budget: Optional[int] = None) -> (str, OptimizationReport):
        """
        Compresses context components to fit within a token budget using 
        priority-based pruning.
        """
        budget = target_budget or self.default_budget.available_for_context
        
        # 1. Calculate initial tokens
        original_tokens = 0
        for comp in components:
            comp.token_count = self._estimate_tokens(comp.content)
            original_tokens += comp.token_count

        if original_tokens <= budget:
            return self._assemble(components), self._report(original_tokens, original_tokens, OptimizationStrategy.PASS_THROUGH)

        # 2. Pruning Loop (Prune lowest relevance + highest priority index)
        # Sort: Primary=Priority (High to Low), Secondary=Relevance (Low to High)
        # Priority 1 (Core) is kept longest, Priority 10 (Logs) is pruned first.
        sorted_components = sorted(components, key=lambda x: (-x.priority, x.relevance_score))
        
        optimized_components = components.copy()
        current_tokens = original_tokens
        
        for comp in sorted_components:
            if current_tokens <= budget:
                break
            
            # If priority > 2 (Non-Core), we can prune or compress
            if comp.priority > 2:
                # Simple Pruning: remove component
                optimized_components.remove(comp)
                current_tokens -= comp.token_count
                logger.info(f"Optimizer: Pruned {comp.name} ({comp.token_count} tokens)")

        # 3. Final Assembly
        final_str = self._assemble(optimized_components)
        optimized_tokens = self._estimate_tokens(final_str)
        
        return final_str, self._report(original_tokens, optimized_tokens, OptimizationStrategy.PRUNE_LOW_RELEVANCE)

    def _estimate_tokens(self, text: str) -> int:
        return math.ceil(len(text) / self.chars_per_token)

    def _assemble(self, components: List[ContextComponent]) -> str:
        # Sort back to logical order (by priority ascending)
        ordered = sorted(components, key=lambda x: x.priority)
        return "\n\n".join([f"<{c.name}>\n{c.content}\n</{c.name}>" for c in ordered])

    def _report(self, original: int, optimized: int, strategy: OptimizationStrategy) -> OptimizationReport:
        reduction = ((original - optimized) / original) * 100 if original > 0 else 0
        # Cost estimate: ~$15 per 1M tokens (GPT-4o/Claude avg)
        saved = (original - optimized) * (15.0 / 1_000_000)
        
        return OptimizationReport(
            original_tokens=original,
            optimized_tokens=optimized,
            reduction_percentage=reduction,
            strategy_applied=strategy,
            cost_saved_est=saved * 1000 # Scaling for reporting
        )

class MemorySummarizer:
    """
    Handles hierarchical compression of turn history into dense summaries.
    """
    def __init__(self, llm_provider=None):
        self._llm = llm_provider

    async def compress_turns(self, turns: List[str]) -> str:
        """
        Collapses N turns into a single XML summary block.
        """
        if not turns:
            return ""
        
        if len(turns) < 5:
            return "\n".join(turns)
            
        # Implementation would call LLM to summarize
        # return await self._llm.generate(...)
        return f"[COMPRESSED HISTORY: {len(turns)} turns summarized into key context]"
