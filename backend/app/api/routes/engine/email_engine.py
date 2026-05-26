"""
Email Drafting Engine API — Direct endpoint for the specialized communication workflow.
"""
from fastapi import APIRouter, Depends, HTTPException, status
import uuid
import json
import logging

from app.api.routes.engine.schemas import EmailDraftingRequest, EmailDraftingResponse
from app.engine.agents.registry import AgentRegistry
from app.engine.agents.execution_agent import ExecutionAgent

router = APIRouter(prefix="/email", tags=["Email Engine"])
logger = logging.getLogger(__name__)

@router.post("/draft", response_model=EmailDraftingResponse)
async def draft_email(request: EmailDraftingRequest):
    """
    Directly invokes the ExecutionAgent to generate a grounded email draft.
    """
    registry = AgentRegistry.get()
    agent = registry.get_agent("execution-agent")
    
    if not agent or not isinstance(agent, ExecutionAgent):
        # Fallback if not in registry
        agent = ExecutionAgent()

    task_id = str(uuid.uuid4())
    
    # Wrap in XML for the agent to parse
    enriched_task = f"""
<sub_intent>email_drafting</sub_intent>
<raw_input>{request.user_intent}</raw_input>
<meeting_notes>{request.meeting_notes}</meeting_notes>
<tone>{request.tone}</tone>
<user_id>{request.user_id}</user_id>
<session_id>{request.session_id}</session_id>
"""

    try:
        raw_result = await agent.execute(enriched_task, task_id)
        
        # Parse the JSON response from the LLM
        # Handle cases where LLM might wrap in markdown blocks
        clean_json = raw_result.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
        data = json.loads(clean_json)
        
        return EmailDraftingResponse(
            subject=data.get("subject", "No Subject"),
            body=data.get("body", ""),
            action_items=data.get("action_items", []),
            suggested_recipients=data.get("suggested_recipients", []),
            summary=data.get("summary", ""),
            task_id=task_id
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {raw_result}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI returned malformed data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Email engine error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
