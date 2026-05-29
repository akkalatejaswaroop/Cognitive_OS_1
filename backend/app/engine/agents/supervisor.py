"""
Orchestrator Agent (SupervisorAgent) — routes, coordinates, and synthesises
the full six-agent Cognitive OS pipeline.

Upgrade from v1:
  - Multi-intent routing (research / code / plan / memory / execute / summarise)
  - TaskGraph execution via PlanningAgent for complex goals
  - Memory context injection via MemoryAgent
  - SummaryAgent for final output distillation
  - Circuit-breaker awareness via BaseAgent
"""
import asyncio
import json
import logging
import uuid
from typing import Any

from app.engine.agents.base import BaseAgent
from app.llm.factory import get_llm_provider
from app.orchestration.bus import event_bus
from app.orchestration.task_graph import TaskGraphRunner
from app.prompts.orchestrator import ORCHESTRATOR_INTENT, ORCHESTRATOR_SYNTHESIS
from app.schemas.agent import SubTask, TaskGraph
from app.engine.prompts.builder import MasterSystemPromptBuilder
from app.engine.prompts.parser import UserPromptParser
from app.engine.prompts.memory_injector import MemoryInjector
from app.engine.prompts.validator import ResponseValidator
from app.engine.router.core import AIWorkflowRouter
from app.engine.router.schema import WorkflowType
from app.engine.decision.engine import DecisionEngine
from app.engine.safety.guardrail import HallucinationGuardrail
from app.engine.optimization.optimizer import TokenOptimizer
from app.engine.optimization.schema import ContextComponent
from app.core.database import SessionLocal
from app.services.user_service import UserService
from app.engine.agents.registry import AgentRegistry

logger = logging.getLogger(__name__)

class SupervisorAgent(BaseAgent):
    """
    Central Orchestrator of Cognitive OS.

    Uses the new Prompt Engineering System Architecture, AIWorkflowRouter, 
    DecisionEngine, HallucinationGuardrail, and TokenOptimizer for high-fidelity 
    reasoning, autonomous dispatching, safe grounded execution, and cost efficiency.
    """

    def __init__(self):
        super().__init__(name="supervisor", role="Central Orchestrator")
        self._llm = get_llm_provider()
        self._prompt_parser = UserPromptParser()
        self._memory_injector = MemoryInjector()
        self._validator = ResponseValidator()
        self._router = AIWorkflowRouter()
        self._decision_engine = DecisionEngine()
        self._guardrail = HallucinationGuardrail()
        self._optimizer = TokenOptimizer()

        # Subscribe to custom KCS events
        event_bus.subscribe("knowledge.captured", self._handle_knowledge_captured_event)

    # ------------------------------------------------------------------ #
    #  Main execute                                                       #
    # ------------------------------------------------------------------ #

    async def execute(self, task: str, task_id: str | None = None) -> str:
        task_id = task_id or str(uuid.uuid4())
        parent_id = self._get_meta(task_id, "parent_id")
        session_id = self._get_meta(task_id, "session_id") or "default"
        user_id = self._get_meta(task_id, "user_id")

        # ── 1. Route Intent & Workflow ──────────────────────────────────
        await self.emit_status(task_id, "thinking", "Routing intent and detecting workflow…", parent_id=parent_id)
        route = await self._router.route(task)
        logger.info(f"[supervisor] Task {task_id} routed to {route.workflow_type} ({route.primary_agent})")

        # ── 2. Fetch User Data & Memory ──────────────────────────────────
        await self.emit_status(task_id, "thinking", f"Enriching context for '{route.intent}'…", parent_id=parent_id)
        
        user_profile = {}
        if user_id:
            try:
                with SessionLocal() as db:
                    user_service = UserService(db)
                    user = user_service.get_user(user_id)
                    if user:
                        from app.schemas.user import UserProfileResponse
                        user_profile = UserProfileResponse.model_validate(user).model_dump()
            except Exception as e:
                logger.error(f"Error fetching user profile: {e}")

        # Fetch memory chunks using router's memory_query or raw task
        memory_agent = AgentRegistry.get().get_agent("memory-agent")
        episodic_chunks = []
        if memory_agent:
            # We bypass delegate_and_await for direct local call to get raw chunks
            from app.engine.agents.memory_agent import MemoryAgent
            if isinstance(memory_agent, MemoryAgent):
                m_query = route.memory_query or task
                episodic_chunks = await memory_agent.search_raw_chunks(m_query, user_id=user_id)

        # ── 3. Optimize & Inject Memory ──────────────────────────────────
        # Define components for optimization
        components = [
            ContextComponent(name="core", content=json.dumps(user_profile), priority=1),
            ContextComponent(name="episodic", content="\n".join([c.get("content", "") for c in episodic_chunks]), priority=3, relevance_score=0.9),
            # RAG/Knowledge components could be added here
        ]
        
        # Apply token optimization
        optimized_xml, opt_report = self._optimizer.optimize_context(components)
        logger.info(f"[supervisor] Token optimization applied: {opt_report.reduction_percentage:.1f}% reduction")

        memory_blocks = self._memory_injector.inject(
            user_profile=user_profile,
            session_memory="", # TODO: Implement session history retrieval
            episodic_chunks=episodic_chunks,
            knowledge_chunks=[], # TODO: Implement knowledge base RAG
            longterm_summary="" # TODO: Implement LTM summarization
        )
        
        memory_injection_xml = self._memory_injector.format_memory_injection(memory_blocks)

        # ── 4. Decision Engine Evaluation ───────────────────────────────
        await self.emit_status(task_id, "thinking", "Evaluating optimal path and prioritizing actions…", parent_id=parent_id)
        decision = await self._decision_engine.evaluate(
            task=task,
            memory_context=memory_injection_xml,
            user_profile=user_profile
        )
        logger.info(f"[supervisor] Decision: {decision.selected_action.description} (Priority: {decision.selected_action.priority.total_score})")

        # ── 5. Parse User Prompt (with Decision Data) ───────────────────
        user_prompt_xml = self._prompt_parser.parse(
            raw_input=task,
            classified_intent=route.intent,
            intent_confidence=decision.context_confidence,
            sub_intent=route.workflow_type.value,
            metadata={
                "channel": "api", 
                "priority": decision.selected_action.priority.total_score,
                "reasoning": decision.selected_action.reasoning
            }
        )

        # ── 6. Build Master System Prompt ───────────────────────────────
        prompt_builder = MasterSystemPromptBuilder(user_context={
            "user_id": user_id,
            "user_name": user_profile.get("full_name", "User")
        })
        
        system_prompt = prompt_builder.assemble(
            mode="COLLABORATIVE",
            session_id=session_id,
            memory_data={
                "user_profile": json.dumps(user_profile, indent=2),
                "episodic_memory": memory_blocks["episodic"],
                "preferences": json.dumps(user_profile.get("preferences", {}), indent=2)
            },
            rag_data={
                "context_block": memory_blocks["knowledge"],
                "confidence_score": decision.context_confidence
            }
        )

        # ── 7. Dispatch to Agent ────────────────────────────────────────
        if route.workflow_type == WorkflowType.REMINDER or route.workflow_type == WorkflowType.CALENDAR:
            # Special handling for reminders/planning
            result = await self._run_planned_pipeline(task, task_id, parent_id)
        else:
            target_agent = decision.selected_action.agent_target
            await self.emit_status(
                task_id,
                "thinking",
                f"Executing {decision.selected_action.description} via {target_agent}…",
                parent_id=parent_id,
            )
            # Enriched task includes the context injection.
            enriched_task = f"{memory_injection_xml}\n\n{user_prompt_xml}"
            result = await self.delegate_and_await(target_agent, enriched_task, task_id)

        # ── 8. Synthesise final response ──────────────────────────────────
        await self.emit_status(task_id, "thinking", "Synthesising final response…", parent_id=parent_id)
        final = await self._synthesise(task, result, system_prompt)

        # ── 9. Hallucination Guardrail Verification ─────────────────────
        await self.emit_status(task_id, "thinking", "Verifying factual grounding and safety…", parent_id=parent_id)
        safety_report = await self._guardrail.validate_output(final, memory_injection_xml)
        
        if not safety_report.is_safe:
            logger.warning(f"[supervisor] Hallucination detected! Risk: {safety_report.hallucination_risk}")
            final = safety_report.safe_fallback_response or "I'm sorry, I encountered a reliability issue."
        elif safety_report.recommended_action == "QUALIFY":
            final = f"[UNCERTAIN] {final}"

        # ── 10. Store outcome in memory (fire and forget) ──────────────────
        asyncio.create_task(
            self._store_outcome(task, final, task_id, session_id, user_id)
        )

        return final

    # ------------------------------------------------------------------ #
    #  Planned pipeline (multi-step)                                     #
    # ------------------------------------------------------------------ #

    async def _run_planned_pipeline(
        self, task: str, task_id: str, parent_id: str | None
    ) -> str:
        await self.emit_status(
            task_id, "thinking", "Building task plan…", parent_id=parent_id
        )

        # Ask PlanningAgent to decompose the task
        plan_json = await self.delegate_and_await("planning-agent", task, task_id)

        try:
            graph = TaskGraph.model_validate_json(plan_json)
        except Exception as exc:
            logger.warning(f"Could not parse TaskGraph: {exc}. Falling back to research.")
            return await self.delegate_and_await("research-agent", task, task_id)

        await self.emit_status(
            task_id,
            "thinking",
            f"Executing {len(graph.subtasks)} planned subtask(s)…",
            parent_id=parent_id,
        )

        # Execute the graph
        runner = TaskGraphRunner(graph=graph, delegate_fn=self._delegate_subtask)
        results = await runner.run()

        # Aggregate all results for the SummaryAgent
        aggregated = "\n\n".join(
            f"### Step {i+1}: {st.description}\n{results.get(st.sub_task_id, 'No output')}"
            for i, st in enumerate(graph.subtasks)
        )

        await self.emit_status(
            task_id, "thinking", "Requesting summary…", parent_id=parent_id
        )
        return await self.delegate_and_await("summary-agent", aggregated, task_id)

    async def _delegate_subtask(self, subtask: SubTask) -> str:
        """Adapter used by TaskGraphRunner."""
        return await self.delegate_and_await(
            subtask.agent, subtask.description, subtask.sub_task_id
        )

    # ------------------------------------------------------------------ #
    #  Delegation utilities                                               #
    # ------------------------------------------------------------------ #

    async def delegate_and_await(
        self, sub_agent: str, sub_task: str, parent_task_id: str
    ) -> str:
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        future: asyncio.Future = asyncio.Future()

        from app.orchestration.bus import AgentMessage
        async def status_callback(msg: AgentMessage) -> None:
            payload = msg.payload
            status = payload.get("status")
            if status == "completed" and not future.done():
                future.set_result(payload.get("result", ""))
            elif status == "failed" and not future.done():
                future.set_exception(
                    Exception(payload.get("message", "Subtask failed"))
                )

        event_bus.subscribe(f"task.status.{sub_task_id}", status_callback)

        try:
            await event_bus.publish(f"agent.{sub_agent}", {
                "task_id": sub_task_id,
                "task": sub_task,
                "parent_id": parent_task_id,
            })
            return await asyncio.wait_for(future, timeout=120.0)
        except asyncio.TimeoutError:
            logger.error(f"Sub-agent {sub_agent} timed out for task {sub_task_id}")
            raise TimeoutError(f"Sub-agent {sub_agent} did not respond within 120 seconds.")
        finally:
            event_bus.unsubscribe(f"task.status.{sub_task_id}", status_callback)

    # ── Legacy non-blocking delegate (backward compatibility) ────────────
    async def delegate_task(
        self, sub_agent: str, sub_task: str, parent_task_id: str
    ) -> None:
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        await event_bus.publish(f"agent.{sub_agent}", {
            "task_id": sub_task_id,
            "task": sub_task,
            "parent_id": parent_task_id,
        })

    # ------------------------------------------------------------------ #
    #  Memory integration                                                 #
    # ------------------------------------------------------------------ #

    async def _fetch_memory(
        self, query: str, task_id: str, session_id: str, user_id: str | None
    ) -> str:
        try:
            return await self.delegate_and_await(
                "memory-agent", f"RECALL:{query}", task_id
            )
        except Exception as exc:
            logger.warning(f"Memory recall failed: {exc}")
            return ""

    async def _store_outcome(
        self,
        original_task: str,
        result: str,
        task_id: str,
        session_id: str,
        user_id: str | None,
    ) -> None:
        try:
            content = f"Task: {original_task}\nResult: {result[:500]}"
            await event_bus.publish("agent.memory-agent", {
                "task_id": f"{task_id}-mem-store",
                "task": f"STORE:{content}",
                "parent_id": task_id,
                "user_id": user_id,
                "session_id": session_id,
            })
        except Exception as exc:
            logger.warning(f"Memory store after task failed: {exc}")

    # ------------------------------------------------------------------ #
    #  Synthesis                                                          #
    # ------------------------------------------------------------------ #

    async def _synthesise(self, original_task: str, agent_result: str, system_prompt: str | None = None) -> str:
        try:
            return await self._llm.generate(
                prompt=(
                    f"Original user request:\n{original_task}\n\n"
                    f"Agent findings:\n{agent_result}"
                ),
                system=system_prompt or ORCHESTRATOR_SYNTHESIS,
            )
        except Exception as exc:
            logger.warning(f"Synthesis LLM call failed: {exc}. Returning raw result.")
            return agent_result

    # ------------------------------------------------------------------ #
    #  Knowledge Capture Ingestion & Multi-Agent Coordination            #
    # ------------------------------------------------------------------ #

    async def _handle_knowledge_captured_event(self, message: Any) -> None:
        """
        Callback wrapper for inter-agent EventBus topic 'knowledge.captured'.
        """
        # Run asynchronously in background to not block the main EventBus thread
        asyncio.create_task(self.process_knowledge_captured(message))

    async def process_knowledge_captured(self, message: Any) -> None:
        """
        Coordinates KCS capture event processing:
        1. Invokes SummaryAgent to generate structured JSON summary.
        2. Invokes MemoryAgent to embed and persist vector memory in ChromaDB.
        3. Parses action items and coordinates with ExecutionAgent to run automations.
        4. Updates status and logs in SQL relational store.
        5. Emits global status update which propagates to timeline WebSocket.
        """
        payload = message.payload
        entry_id_str = payload.get("entry_id")
        user_id_str = payload.get("user_id")
        source_type = payload.get("source_type")
        raw_text = payload.get("raw_text", "")

        if not entry_id_str:
            logger.error("[supervisor] Missing entry_id in knowledge.captured event.")
            return

        entry_id = uuid.UUID(entry_id_str)
        user_id = uuid.UUID(user_id_str) if user_id_str else None

        logger.info(f"[supervisor] Processing captured knowledge for entry {entry_id} (user {user_id})")

        # 1. Update status to 'processing' in SQL database
        from app.models.domain import KnowledgeEntry, KnowledgeInsight
        
        with SessionLocal() as db:
            entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
            if not entry:
                logger.error(f"[supervisor] Knowledge entry {entry_id} not found in database.")
                return
            entry.status = "processing"
            entry.processing_log = "Supervisor orchestrating multi-agent delegation..."
            db.commit()

        try:
            # 2. Summarization delegation -> SummaryAgent
            logger.info("[supervisor] Delegating to SummaryAgent...")
            from app.engine.agents.summary_agent import SummaryAgent, SummaryType
            
            registry = AgentRegistry.get()
            summary_agent = registry.get_agent("summary-agent")
            if not summary_agent or not isinstance(summary_agent, SummaryAgent):
                summary_agent = SummaryAgent()

            structured_data = None
            try:
                structured_data = await summary_agent.generate_summary(
                    raw_text=raw_text,
                    summary_type=SummaryType.MEETING if source_type == "voice" else SummaryType.TASK
                )
            except Exception as sum_err:
                logger.warning(f"[supervisor] SummaryAgent failed: {sum_err}. Falling back to default summarization.")

            # Let's prepare parsed summary data
            if structured_data:
                summary_val = structured_data.executive_summary
                key_points_val = structured_data.bullet_points
                action_items_val = structured_data.action_items
                sentiment_val = "Collaborative"
                entities_val = {"people": [], "orgs": [], "projects": []}
            else:
                # LLM / local fallback if summary agent failed or is not configured
                try:
                    from app.services.knowledge_capture import SUMMARIZATION_PROMPT
                    prompt = SUMMARIZATION_PROMPT.replace("{{raw_content}}", raw_text)
                    response = await self._llm.generate(prompt=prompt, temperature=0.1)
                    
                    # Parse JSON
                    clean_json = response.strip()
                    if "```json" in clean_json:
                        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                    elif "```" in clean_json:
                        clean_json = clean_json.split("```")[1].split("```")[0].strip()
                    data = json.loads(clean_json)
                    
                    summary_val = data.get("summary", "")
                    key_points_val = data.get("key_points", [])
                    action_items_val = data.get("action_items", [])
                    sentiment_val = data.get("sentiment", "Neutral")
                    entities_val = data.get("entities", {})
                except Exception as fb_err:
                    logger.error(f"[supervisor] Summarization fallback also failed: {fb_err}")
                    summary_val = "Brief description of the captured note."
                    key_points_val = [raw_text[:100]]
                    action_items_val = []
                    sentiment_val = "Neutral"
                    entities_val = {}

            # 3. Vector memory persistence delegation -> MemoryAgent
            logger.info("[supervisor] Delegating to MemoryAgent...")
            from app.engine.agents.memory_agent import MemoryAgent
            memory_agent = registry.get_agent("memory-agent")
            if not memory_agent or not isinstance(memory_agent, MemoryAgent):
                memory_agent = MemoryAgent()

            vector_id = None
            try:
                vector_id = await memory_agent.save_memory(
                    content=raw_text,
                    user_id=str(user_id) if user_id else None,
                    session_id="kcs_capture",
                    metadata={
                        "source": f"captured_{source_type}",
                        "entry_id": str(entry_id),
                        "importance_score": 0.7
                    }
                )
            except Exception as mem_err:
                logger.warning(f"[supervisor] MemoryAgent indexing failed: {mem_err}")

            # 4. Save structured insight & update entry status in PostgreSQL
            with SessionLocal() as db:
                entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
                if entry:
                    # Update title if default title and structured summary title is available
                    if entry.title.startswith(("Note: ", "Voice Memo: ", "Document: ")) and structured_data and structured_data.title:
                        entry.title = structured_data.title
                    
                    # Add/Update insight
                    insight = db.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == entry.id).first()
                    if insight:
                        insight.summary = summary_val
                        insight.key_points = key_points_val
                        insight.action_items = action_items_val
                        insight.entities = entities_val
                        insight.sentiment = sentiment_val
                    else:
                        insight = KnowledgeInsight(
                            entry_id=entry.id,
                            summary=summary_val,
                            key_points=key_points_val,
                            action_items=action_items_val,
                            entities=entities_val,
                            sentiment=sentiment_val
                        )
                        db.add(insight)

                    entry.status = "completed"
                    entry.processing_log = "Knowledge captured, summarized, and semantic vector memory stored."
                    db.commit()

            # 5. Emit global status update which automatically forwards to WebSockets
            await self.emit_status(
                task_id=str(entry_id),
                status="completed",
                message="Knowledge captured, summarized, and semantic vector memory stored.",
                result={
                    "entry_id": str(entry_id),
                    "summary": summary_val,
                    "action_items": action_items_val
                },
                parent_id="kcs_ingestion"
            )

            # Publish a specific pipeline.completed event message
            await event_bus.publish(
                "pipeline.completed",
                {
                    "entry_id": str(entry_id),
                    "status": "completed",
                    "message": "Knowledge capture pipeline complete."
                }
            )

            # 6. Workflow Automation Delegation -> ExecutionAgent / Automation Engine
            if action_items_val:
                logger.info(f"[supervisor] Processing {len(action_items_val)} action items...")
                from app.engine.agents.execution_agent import ExecutionAgent
                execution_agent = registry.get_agent("execution-agent")
                if not execution_agent or not isinstance(execution_agent, ExecutionAgent):
                    execution_agent = ExecutionAgent()

                for item in action_items_val:
                    lower_item = item.lower()
                    if "email" in lower_item or "draft" in lower_item or "send" in lower_item:
                        try:
                            # Automatically kick off email draft workflow
                            asyncio.create_task(
                                execution_agent.execute(
                                    f"<sub_intent>email_drafting</sub_intent><raw_input>Draft email for: {item}</raw_input><meeting_notes>{raw_text}</meeting_notes>",
                                    f"kcs-auto-email-{uuid.uuid4().hex[:6]}"
                                )
                            )
                            logger.info(f"[supervisor] Automatically kicked off email draft workflow for: {item}")
                        except Exception as auto_err:
                            logger.warning(f"[supervisor] Auto email drafting failed for '{item}': {auto_err}")
                    elif "remind" in lower_item or "scheduler" in lower_item or "deadline" in lower_item:
                        try:
                            # Schedule a reminder in 1 hour
                            asyncio.create_task(
                                execution_agent.execute(
                                    f"TOOL:schedule_reminder:{json.dumps({'user_id': str(user_id), 'message': item, 'delay_seconds': 3600})}",
                                    f"kcs-auto-remind-{uuid.uuid4().hex[:6]}"
                                )
                            )
                            logger.info(f"[supervisor] Automatically scheduled reminder workflow for: {item}")
                        except Exception as auto_err:
                            logger.warning(f"[supervisor] Auto reminder scheduling failed for '{item}': {auto_err}")

            logger.info(f"[supervisor] Knowledge capture pipeline completed successfully for entry {entry_id}")

        except Exception as e:
            logger.error(f"[supervisor] Knowledge capture orchestration failed: {e}")
            with SessionLocal() as db:
                entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
                if entry:
                    entry.status = "failed"
                    entry.processing_log = f"Multi-agent orchestration error: {str(e)}"
                    db.commit()

