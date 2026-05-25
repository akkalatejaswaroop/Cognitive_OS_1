"""
IBM Granite LLM Provider — granite-3.3-8b-instruct via IBM Watsonx.ai REST API.
Activated when IBM_GRANITE_API_KEY and IBM_GRANITE_PROJECT_ID are set.
"""
import logging
import httpx
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class GraniteProvider(LLMProvider):
    """
    IBM Granite via Watsonx.ai.
    Required env vars:
      IBM_GRANITE_API_KEY     — IBM Cloud API key
      IBM_GRANITE_PROJECT_ID  — Watsonx project ID
      IBM_GRANITE_ENDPOINT    — e.g. https://us-south.ml.cloud.ibm.com
      IBM_GRANITE_MODEL       — e.g. ibm/granite-3-3-8b-instruct
    """

    TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"

    def __init__(
        self,
        api_key: str,
        project_id: str,
        endpoint: str,
        model: str = "ibm/granite-3-3-8b-instruct",
    ):
        self.api_key = api_key
        self.project_id = project_id
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self._iam_token: str | None = None

    # ------------------------------------------------------------------ #
    #  IAM token exchange                                                 #
    # ------------------------------------------------------------------ #
    async def _get_iam_token(self) -> str:
        """Exchange IBM API key for a short-lived IAM bearer token."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                    "apikey": self.api_key,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            self._iam_token = resp.json()["access_token"]
            return self._iam_token

    # ------------------------------------------------------------------ #
    #  Text generation                                                    #
    # ------------------------------------------------------------------ #
    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        token = await self._get_iam_token()
        full_prompt = f"{system}\n\n{prompt}" if system else prompt

        payload = {
            "model_id": self.model,
            "input": full_prompt,
            "parameters": {
                "decoding_method": "sample",
                "temperature": temperature,
                "max_new_tokens": max_tokens,
            },
            "project_id": self.project_id,
        }

        url = f"{self.endpoint}/ml/v1/text/generation?version=2023-05-29"
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            return results[0]["generated_text"] if results else ""

    # ------------------------------------------------------------------ #
    #  Embeddings — Granite embedding model                              #
    # ------------------------------------------------------------------ #
    async def embed(self, text: str) -> list[float]:
        token = await self._get_iam_token()
        payload = {
            "model_id": "ibm/slate-30m-english-rtrvr",
            "inputs": [text],
            "project_id": self.project_id,
        }
        url = f"{self.endpoint}/ml/v1/text/embeddings?version=2023-10-25"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json()["results"][0]["embedding"]
