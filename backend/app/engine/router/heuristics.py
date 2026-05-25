import re
from app.engine.router.schema import WorkflowType

def heuristic_classify(task: str) -> WorkflowType | None:
    """
    Fast-path regex classification for zero-latency routing.
    """
    task = task.lower()
    
    # Meeting Summary
    if re.search(r"summarize (the )?meeting|meeting notes|transcript", task):
        return WorkflowType.MEETING_SUMMARY
        
    # Email
    if re.search(r"draft (an )?email|write (an )?email|reply to", task):
        return WorkflowType.EMAIL_DRAFT
        
    # Reminders
    if re.search(r"remind me|set (a )?reminder|at \d{1,2}(am|pm|:\d{2})", task):
        return WorkflowType.REMINDER
        
    # Memory
    if re.search(r"what did i say|remember when|recall", task):
        return WorkflowType.MEMORY_RECALL
        
    # Calendar
    if re.search(r"schedule|my calendar|available at", task):
        return WorkflowType.CALENDAR
        
    # Research
    if re.search(r"research|explain|find information", task):
        return WorkflowType.RESEARCH
        
    return None
