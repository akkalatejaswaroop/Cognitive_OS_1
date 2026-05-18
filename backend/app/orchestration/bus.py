import asyncio
import logging

logger = logging.getLogger(__name__)

class EventBus:
    def __init__(self):
        self.subscribers = {}
        self._queue = asyncio.Queue()
        self._task = None

    def subscribe(self, topic: str, callback):
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        self.subscribers[topic].append(callback)
        logger.info(f"Subscribed to topic: {topic}")

    async def publish(self, topic: str, payload: dict):
        logger.debug(f"Publishing to {topic}: {payload}")
        await self._queue.put({"topic": topic, "payload": payload})

    async def start(self):
        self._task = asyncio.create_task(self._process_events())
        logger.info("Event Bus started.")

    async def _process_events(self):
        while True:
            event = await self._queue.get()
            topic = event["topic"]
            payload = event["payload"]
            
            if topic in self.subscribers:
                for callback in self.subscribers[topic]:
                    try:
                        asyncio.create_task(callback(payload))
                    except Exception as e:
                        logger.error(f"Error in subscriber for topic {topic}: {e}")
            
            self._queue.task_done()

# Global singleton Event Bus
event_bus = EventBus()
