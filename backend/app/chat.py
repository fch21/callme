import json
from functools import lru_cache

from openai import OpenAI

from .config import CHAT_MODEL, OPENAI_API_KEY, PERSONA_NAME
from .evaluator import evaluate
from .persona import build_system_prompt
from .tools import TOOL_SCHEMAS, execute

_MAX_TOOL_ITERATIONS = 5


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    return OpenAI(api_key=OPENAI_API_KEY)


@lru_cache(maxsize=1)
def _system_prompt() -> str:
    return build_system_prompt(PERSONA_NAME)


def _run_with_tools(messages: list[dict]) -> str:
    client = _client()
    for _ in range(_MAX_TOOL_ITERATIONS):
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            tools=TOOL_SCHEMAS,
        )
        choice = response.choices[0]
        if choice.finish_reason != "tool_calls":
            return choice.message.content or ""

        messages.append(choice.message.model_dump())
        for tc in choice.message.tool_calls or []:
            result = execute(tc.function.name, tc.function.arguments)
            messages.append(
                {
                    "role": "tool",
                    "content": json.dumps(result),
                    "tool_call_id": tc.id,
                }
            )
    return ""


def _retry_system(rejected_reply: str, feedback: str) -> str:
    return (
        f"{_system_prompt()}\n\n"
        f"## Previous answer rejected\n"
        f"Your previous reply was rejected by quality control.\n\n"
        f"### Your rejected reply\n{rejected_reply}\n\n"
        f"### Reason for rejection\n{feedback}\n\n"
        f"Try again, addressing the feedback."
    )


def reply(message: str, history: list[dict]) -> str:
    initial_messages: list[dict] = [
        {"role": "system", "content": _system_prompt()},
        *history,
        {"role": "user", "content": message},
    ]
    initial = _run_with_tools(list(initial_messages))

    evaluation = evaluate(initial, message, history)
    if evaluation.is_acceptable:
        return initial

    retry_messages: list[dict] = [
        {"role": "system", "content": _retry_system(initial, evaluation.feedback)},
        *history,
        {"role": "user", "content": message},
    ]
    return _run_with_tools(retry_messages)
