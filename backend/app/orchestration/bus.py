"""
Event Bus for Inter-Agent Communication
Implements an async message queue with fault tolerance, shared context propagation,
retry mechanics, and agent status monitoring.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Awaitable

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ============================================================================ #
#  1. MESSAGE SCHEMAS & CONTEXT PROPAGATION
# ============================================================================ #

class MessagePriority(int, Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

class EventContext(BaseModel):
    """Propagates shared context across agent boundaries."""
    trace_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str | None = None
    session_id: str | None = None
    shared_state: dict[str, Any] = Field(default_factory=dict)

class AgentMessage(BaseModel):
    """The standard schema for all inter-agent communication."""
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    sender: str
    recipient: str | None = None  # None implies broadcast to topic
    payload: dict[str, Any]
    context: EventContext = Field(default_factory=EventContext)
    priority: MessagePriority = MessagePriority.NORMAL
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def __lt__(self, other: "AgentMessage") -> bool:
        return self.priority.value < other.priority.value


# ============================================================================ #
#  2. AGENT STATUS MONITORING
# ============================================================================ #

class AgentStatus(str, Enum):
    IDLE = "IDLE"
    WORKING = "WORKING"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"

class StatusMonitor:
    """Tracks the health and current state of all connected agents."""
    def __init__(self):
        self._statuses: dict[str, AgentStatus] = {}
        self._last_heartbeat: dict[str, float] = {}

    def update_status(self, agent_id: str, status: AgentStatus):
        self._statuses[agent_id] = status
        self._last_heartbeat[agent_id] = asyncio.get_event_loop().time()
        logger.debug(f"Agent [{agent_id}] status -> {status.value}")

    def get_status(self, agent_id: str) -> AgentStatus:
        return self._statuses.get(agent_id, AgentStatus.OFFLINE)


# ============================================================================ #
#  3. EVENT BUS ARCHITECTURE (QUEUE & ROUTING)
# ============================================================================ #

class EventBus:
    """
    Central Message Broker for async, fault-tolerant agent communication.
    """
    def __init__(self):
        # Priority queue allows high-priority messages to be processed first
        self._queue: asyncio.PriorityQueue[tuple[int, AgentMessage]] = asyncio.PriorityQueue()
        self._subscribers: dict[str, list[Callable[[AgentMessage], Awaitable[None]]]] = {}
        self._task: asyncio.Task | None = None
        
        self.monitor = StatusMonitor()
        self.is_running = False

    def subscribe(self, topic: str, callback: Callable[[AgentMessage], Awaitable[None]]):
        """Register an async callback for a specific topic."""
        if topic not in self._subscribers:
            self._subscribers[topic] = []
        self._subscribers[topic].append(callback)
        logger.info(f"Subscribed callback to topic: '{topic}'")

    async def publish(
        self,
        topic_or_message: str | AgentMessage,
        payload: dict[str, Any] | None = None,
    ):
        """Publish a message to the priority queue.

        Two calling conventions:
        1. `publish(agent_message)` — pass a fully formed AgentMessage.
        2. `publish(topic, payload)` — convenience: wraps topic + dict into an AgentMessage.
        """
        if isinstance(topic_or_message, AgentMessage):
            message = topic_or_message
        else:
            message = AgentMessage(
                topic=topic_or_message,
                sender="system",
                payload=payload or {},
            )
        # PriorityQueue sorts lowest first, so we invert the enum value
        priority_score = -message.priority.value
        await self._queue.put((priority_score, message))
        logger.debug(f"Published message [{message.message_id}] to '{message.topic}'")

    # ======================================================================== #
    #  4. FAULT TOLERANCE & RETRY MECHANISM
    # ======================================================================== #

    async def _execute_with_retry(
        self, 
        callback: Callable[[AgentMessage], Awaitable[None]], 
        message: AgentMessage,
        max_retries: int = 3
    ):
        """Executes a subscriber callback with exponential backoff on failure."""
        for attempt in range(max_retries):
            try:
                # Update status to working during execution
                self.monitor.update_status(message.sender, AgentStatus.WORKING)
                
                await callback(message)
                
                # Revert to idle on success
                self.monitor.update_status(message.sender, AgentStatus.IDLE)
                return
            except Exception as e:
                logger.error(f"Error processing message [{message.message_id}] on '{message.topic}' (Attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    self.monitor.update_status(message.sender, AgentStatus.ERROR)
                    # In a production system, this would move the message to a Dead Letter Queue (DLQ)
                    logger.critical(f"Message [{message.message_id}] dropped. Max retries exceeded.")

    # ======================================================================== #
    #  5. BACKGROUND PROCESSING LOOP
    # ======================================================================== #

    async def start(self):
        """Start the background event loop."""
        if self.is_running:
            return
            
        self.is_running = True
        self._task = asyncio.create_task(self._process_events())
        logger.info("Inter-Agent Event Bus started.")

    async def stop(self):
        """Gracefully stop the event loop."""
        self.is_running = False
        if self._task:
            self._task.cancel()
        logger.info("Inter-Agent Event Bus stopped.")

    async def _process_events(self):
<<<<<<< HEAD
        """Continuously pulls messages from the queue and routes them to subscribers."""
        while self.is_running:
            try:
                _, message = await self._queue.get()
                
                callbacks = self._subscribers.get(message.topic, [])
                if not callbacks:
                    logger.warning(f"No subscribers found for topic '{message.topic}'. Message dropped.")
                    self._queue.task_done()
                    continue

                # Execute all callbacks for this topic concurrently
                tasks = [
                    asyncio.create_task(self._execute_with_retry(cb, message))
                    for cb in callbacks
                ]
                await asyncio.gather(*tasks, return_exceptions=True)
                
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Event Loop encountered a critical error: {e}")
=======
        while True:
            event = await self._queue.get()
            topic = event["topic"]
            payload = event["payload"]
            
            if topic in self.subscribers:
                for callback in self.subscribers[topic]:
                    task = asyncio.create_task(callback(payload))
                    task.add_done_callback(
                        lambda t: logger.error(
                            f"Error in subscriber for topic {topic}: {t.exception()}"
                        ) if t.exception() else None
                    )
            
            self._queue.task_done()
>>>>>>> 21f0c57abc3538abed3e18d3cc08fcb4140114f9

# Global singleton Event Bus
event_bus = EventBus()


# ============================================================================ #
#  EXAMPLE OUTPUTS / USAGE
# ============================================================================ #

async def example_usage():
    import sys
    logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(levelname)s: %(message)s")
    
    print("\n=== Initializing Inter-Agent Communication Pipeline ===")
    bus = EventBus()
    await bus.start()

    # 1. Define a mock agent subscriber
    async def memory_agent_handler(msg: AgentMessage):
        print(f"\n[MemoryAgent] Received '{msg.topic}' from '{msg.sender}'")
        print(f"  -> Context Trace: {msg.context.trace_id}")
        print(f"  -> Payload: {msg.payload}")
        
        # Simulate work
        await asyncio.sleep(0.5)
        print("[MemoryAgent] Data stored successfully.")

    # 2. Subscribe the agent to the bus
    bus.subscribe("data.store", memory_agent_handler)

    # 3. Create shared context
    shared_context = EventContext(
        user_id="U123",
        session_id="S456",
        shared_state={"workflow_id": "WF-999"}
    )

    # 4. Publish a message (from Planner to Memory)
    msg = AgentMessage(
        topic="data.store",
        sender="PlannerAgent",
        recipient="MemoryAgent",
        payload={"action": "save_plan", "data": "Step 1: Retrieve context"},
        context=shared_context,
        priority=MessagePriority.HIGH
    )
    
    print("\n=== Publishing High-Priority Message ===")
    await bus.publish(msg)

    # Allow time for async processing
    await asyncio.sleep(1.0)
    
    print("\n=== Agent Status Monitor Dump ===")
    print(f"PlannerAgent Status: {bus.monitor.get_status('PlannerAgent').value}")

    await bus.stop()


if __name__ == "__main__":
    asyncio.run(example_usage())
