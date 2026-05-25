"""
Web Search Tool — Tavily Search API.
Feature-flagged: returns empty results gracefully when TAVILY_API_KEY is not set.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

TAVILY_API_URL = "https://api.tavily.com/search"


async def web_search(query: str, max_results: int = 5) -> dict[str, Any]:
    """
    Search the web via Tavily and return structured results.

    Returns:
        {
          "query": str,
          "results": [{"title": str, "url": str, "content": str}, ...],
          "answer": str | None,   # Tavily's AI answer when available
        }
    """
    api_key = getattr(settings, "TAVILY_API_KEY", "")
    if not api_key:
        logger.warning("TAVILY_API_KEY not set — web_search returning empty results.")
        return {"query": query, "results": [], "answer": None, "error": "API key not configured"}

    payload = {
        "api_key": api_key,
        "query": query,
        "max_results": max_results,
        "include_answer": True,
        "search_depth": "advanced",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(TAVILY_API_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return {
                "query": query,
                "results": [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": r.get("content", ""),
                    }
                    for r in data.get("results", [])
                ],
                "answer": data.get("answer"),
            }
    except Exception as exc:
        logger.error(f"web_search failed: {exc}")
        return {"query": query, "results": [], "answer": None, "error": str(exc)}
