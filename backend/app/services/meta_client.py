import hashlib
import json
import logging
import os
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class MetaClientError(RuntimeError):
    pass


class MetaClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("META_MODEL_API_KEY", "").strip()
        self.base_url = os.getenv("META_MODEL_API_BASE_URL", "https://api.meta.ai/v1")
        self.model = os.getenv("META_MODEL_NAME", "muse-spark-1.1")
        self.max_calls = int(os.getenv("META_MAX_CALLS_PER_PROJECT", "12"))
        self._cache: dict[str, dict[str, Any]] = {}
        self._calls: defaultdict[str, int] = defaultdict(int)
        self._health_cache: tuple[float, bool] | None = None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def _client(self) -> OpenAI:
        if not self.configured:
            raise MetaClientError("Meta Model API is not configured.")
        return OpenAI(api_key=self.api_key, base_url=self.base_url)

    def chat_json(
        self,
        system: str,
        user: str,
        *,
        project_id: str,
        max_tokens: int = 1200,
    ) -> dict[str, Any]:
        cache_key = hashlib.sha256(
            json.dumps(
                {"system": system, "user": user, "model": self.model},
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()
        if cache_key in self._cache:
            return self._cache[cache_key]
        if self._calls[project_id] >= self.max_calls:
            raise MetaClientError("The Meta Model API call limit was reached for this project.")

        client = self._client()
        validation_error = ""
        for attempt in range(2):
            prompt = user
            if validation_error:
                prompt = (
                    f"{user}\n\nYour previous response was invalid JSON: "
                    f"{validation_error}. Return one concise JSON object only. "
                    "Ask at most one question and do not include markdown."
                )
            started = time.perf_counter()
            self._calls[project_id] += 1
            try:
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=max_tokens,
                )
                content = response.choices[0].message.content or ""
                finish_reason = getattr(response.choices[0], "finish_reason", None)
                if finish_reason == "length":
                    raise ValueError("The Meta response was truncated before completing JSON.")
                parsed = self._parse_json(content)
                if not isinstance(parsed, dict):
                    raise ValueError("The response must be a JSON object.")
                usage = getattr(response, "usage", None)
                logger.info(
                    "Meta analysis model=%s latency_ms=%.0f prompt_tokens=%s completion_tokens=%s",
                    self.model,
                    (time.perf_counter() - started) * 1000,
                    getattr(usage, "prompt_tokens", None),
                    getattr(usage, "completion_tokens", None),
                )
                self._cache[cache_key] = parsed
                return parsed
            except (json.JSONDecodeError, TypeError, ValueError) as exc:
                validation_error = str(exc)
                if attempt == 1:
                    raise MetaClientError("Meta returned invalid JSON twice.") from exc
            except Exception as exc:
                raise MetaClientError("Meta Model API request failed.") from exc
        raise MetaClientError("Meta Model API request failed.")

    @staticmethod
    def _parse_json(content: str) -> dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            cleaned = cleaned.rsplit("```", 1)[0].strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start < 0 or end <= start:
                raise
            parsed = json.loads(cleaned[start : end + 1])
        if not isinstance(parsed, dict):
            raise ValueError("The response must be a JSON object.")
        return parsed

    def health_check(self) -> bool:
        if not self.configured:
            return False
        now = time.time()
        if self._health_cache and now - self._health_cache[0] < 60:
            return self._health_cache[1]
        try:
            self.chat_json(
                "Return exactly this JSON object: {\"ok\": true}.",
                "Health check.",
                project_id="__health__",
                max_tokens=1000,
            )
            reachable = True
        except MetaClientError:
            reachable = False
        self._health_cache = (now, reachable)
        return reachable


meta_client = MetaClient()
