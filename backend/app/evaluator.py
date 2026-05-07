from functools import lru_cache

from openai import OpenAI
from pydantic import BaseModel

from .config import EVALUATOR_MODEL, OPENAI_API_KEY, PERSONA_NAME
from .persona import build_system_prompt


class Evaluation(BaseModel):
    is_acceptable: bool
    feedback: str


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    return OpenAI(api_key=OPENAI_API_KEY)


@lru_cache(maxsize=1)
def _judge_system_prompt() -> str:
    agent_context = build_system_prompt(PERSONA_NAME)
    return (
        f"You are a strict quality evaluator for an AI persona that represents {PERSONA_NAME} "
        f"on their personal website. You will be shown the conversation and the agent's latest "
        f"reply. Decide whether the reply is acceptable.\n\n"
        f"A reply is NOT acceptable if it:\n"
        f"- Breaks character or contradicts the persona\n"
        f"- Invents facts not supported by the summary or LinkedIn profile\n"
        f"- Is unprofessional, rude, or off-topic for a professional context\n"
        f"- Is evasive when the answer is in the source material\n\n"
        f"Be specific in your feedback so the agent can improve on retry.\n\n"
        f"--- AGENT'S OWN CONTEXT ---\n{agent_context}"
    )


def evaluate(reply: str, message: str, history: list[dict]) -> Evaluation:
    user_prompt = (
        f"## Conversation history\n{history or '(empty)'}\n\n"
        f"## Latest user message\n{message}\n\n"
        f"## Agent's reply to evaluate\n{reply}"
    )
    response = _client().beta.chat.completions.parse(
        model=EVALUATOR_MODEL,
        messages=[
            {"role": "system", "content": _judge_system_prompt()},
            {"role": "user", "content": user_prompt},
        ],
        response_format=Evaluation,
    )
    parsed = response.choices[0].message.parsed
    if parsed is None:
        return Evaluation(is_acceptable=True, feedback="(evaluator returned no parse)")
    return parsed
