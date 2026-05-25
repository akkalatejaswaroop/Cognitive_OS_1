import pytest
from app.engine.optimization.optimizer import TokenOptimizer
from app.engine.optimization.schema import ContextComponent

def test_token_pruning_logic():
    optimizer = TokenOptimizer()
    
    # 1000 characters ~= 250 tokens
    long_content = "X" * 1000 
    
    components = [
        ContextComponent(name="core", content="Core User Data", priority=1), # Keep
        ContextComponent(name="logs", content=long_content, priority=10),    # Prune first
    ]
    
    # Set budget low enough to force pruning of logs
    optimized_xml, report = optimizer.optimize_context(components, target_budget=50)
    
    assert "Core User Data" in optimized_xml
    assert "logs" not in optimized_xml
    assert report.reduction_percentage > 80.0
    assert report.strategy_applied == "prune"

def test_token_budget_calculation():
    optimizer = TokenOptimizer(chars_per_token=4)
    text = "Hello world" # 11 chars -> 3 tokens
    assert optimizer._estimate_tokens(text) == 3
