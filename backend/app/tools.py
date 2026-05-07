import json

from .notify import log_lead, push

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "record_user_details",
            "description": (
                "Use this tool when a visitor has expressed clear interest in being in "
                "touch and provided an email address."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "The email address of this user",
                    },
                    "name": {
                        "type": "string",
                        "description": "The user's name, if they provided it",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Any additional context worth recording",
                    },
                },
                "required": ["email"],
                "additionalProperties": False,
            },
        },
    },
]


def record_user_details(
    email: str,
    name: str = "Name not provided",
    notes: str = "not provided",
) -> dict:
    log_lead("user_details", email=email, name=name, notes=notes)
    push(f"New contact: {name} <{email}> — {notes}")
    return {"recorded": "ok"}


_HANDLERS = {
    "record_user_details": record_user_details,
}


def execute(tool_name: str, arguments_json: str) -> dict:
    handler = _HANDLERS.get(tool_name)
    if handler is None:
        return {"error": f"unknown tool: {tool_name}"}
    args = json.loads(arguments_json)
    return handler(**args)
