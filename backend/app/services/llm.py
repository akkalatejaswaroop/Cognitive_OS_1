import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class OpenRouterService:
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

    @staticmethod
    async def generate_response(prompt: str, model: str = "openai/gpt-3.5-turbo", system_prompt: str = "") -> str:
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://cognitive-os.local",
            "X-Title": "Cognitive OS",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(OpenRouterService.BASE_URL, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content']
        except Exception as e:
            logger.error(f"Error calling OpenRouter API: {e}")
            raise e
