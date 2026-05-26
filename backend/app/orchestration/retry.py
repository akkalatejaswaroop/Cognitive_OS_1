"""
Retry utilities — exponential backoff with full jitter.
Used by BaseAgent and TaskGraphRunner for resilient agent calls.
"""
import asyncio
import logging
import random
from typing import Callable, TypeVar, Any

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def exponential_backoff(
    coro_fn: Callable[[], Any],
    max_retries: int = 3,
    base_delay_s: float = 1.0,
    max_delay_s: float = 16.0,
    label: str = "operation",
) -> Any:
    """
    Retry `coro_fn` up to `max_retries` times with exponential backoff + jitter.

    Args:
        coro_fn:      Zero-argument async callable to retry.
        max_retries:  Maximum number of retry attempts (not including first try).
        base_delay_s: Starting delay in seconds.
        max_delay_s:  Maximum delay cap.
        label:        Human-readable name for logging.

    Returns:
        The return value of coro_fn on success.

    Raises:
        The last exception if all retries are exhausted.
    """
    last_exc: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            return await coro_fn()
        except Exception as exc:
            last_exc = exc
            if attempt == max_retries:
                logger.error(
                    f"[Retry:{label}] All {max_retries + 1} attempts failed. Last error: {exc}"
                )
                raise

            # Full-jitter backoff: sleep = random(0, min(cap, base * 2^attempt))
            import secrets
            delay = secrets.SystemRandom().uniform(0, min(max_delay_s, base_delay_s * (2 ** attempt)))
            logger.warning(
                f"[Retry:{label}] Attempt {attempt + 1} failed ({exc}). "
                f"Retrying in {delay:.2f}s…"
            )
            await asyncio.sleep(delay)

    raise last_exc  # unreachable but satisfies type checker
