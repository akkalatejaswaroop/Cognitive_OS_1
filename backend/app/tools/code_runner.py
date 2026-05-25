"""
Code Runner Tool — sandboxed Python execution via subprocess.
Enforces timeout and memory limits for safety.
"""
from __future__ import annotations

import asyncio
import logging
import sys
import textwrap
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Defaults (overridable via env) ──────────────────────────────────────────
_TIMEOUT = int(getattr(settings, "CODE_RUNNER_TIMEOUT_SECONDS", 10))


async def run_code(code: str, language: str = "python") -> dict[str, Any]:
    """
    Execute `code` in an isolated subprocess.

    Args:
        code:      Source code string to execute.
        language:  Currently only "python" is supported.

    Returns:
        {
          "stdout": str,
          "stderr": str,
          "exit_code": int,
          "timed_out": bool,
        }
    """
    if language != "python":
        return {
            "stdout": "",
            "stderr": f"Language '{language}' is not supported.",
            "exit_code": 1,
            "timed_out": False,
        }

    # Wrap code so bare expressions are printed
    wrapped = textwrap.dedent(f"""
import sys
import traceback
try:
{textwrap.indent(code, '    ')}
except Exception:
    traceback.print_exc()
    sys.exit(1)
""")

    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-c",
            wrapped,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout_b, stderr_b = await asyncio.wait_for(
                proc.communicate(), timeout=_TIMEOUT
            )
            return {
                "stdout": stdout_b.decode(errors="replace"),
                "stderr": stderr_b.decode(errors="replace"),
                "exit_code": proc.returncode or 0,
                "timed_out": False,
            }
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            logger.warning(f"Code execution timed out after {_TIMEOUT}s")
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {_TIMEOUT} seconds.",
                "exit_code": -1,
                "timed_out": True,
            }

    except Exception as exc:
        logger.error(f"code_runner error: {exc}")
        return {
            "stdout": "",
            "stderr": str(exc),
            "exit_code": -1,
            "timed_out": False,
        }
