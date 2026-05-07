import json

from fastapi.testclient import TestClient

from app.evaluator import Evaluation
from app.main import app
from app.persona import build_system_prompt

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "persona" in body
    assert "voice_enabled" in body


def test_persona_prompt_contains_name():
    prompt = build_system_prompt("Alice")
    assert "Alice" in prompt
    assert len(prompt) > 200


def test_persona_prompt_mentions_user_details_tool():
    prompt = build_system_prompt("Alice")
    assert "record_user_details" in prompt


def test_persona_prompt_does_not_mention_unknown_question_tool():
    prompt = build_system_prompt("Alice")
    assert "record_unknown_question" not in prompt


def test_persona_loads_multiple_documents(tmp_path, monkeypatch):
    monkeypatch.setattr("app.persona.ME_DIR", tmp_path)
    (tmp_path / "summary.txt").write_text("I am a software engineer.")
    (tmp_path / "projects.md").write_text("# Projects\nProject A.")
    (tmp_path / "talks.txt").write_text("Talk: Building agents.")
    (tmp_path / "README.md").write_text("This should be excluded.")
    (tmp_path / "summary.example.txt").write_text("This should be excluded.")
    (tmp_path / "leads.jsonl").write_text('{"k":"v"}\n')

    prompt = build_system_prompt("Alice")
    assert "I am a software engineer" in prompt
    assert "Project A" in prompt
    assert "Talk: Building agents" in prompt
    assert "This should be excluded" not in prompt
    assert "## summary" in prompt
    assert "## projects" in prompt
    assert "## talks" in prompt


def test_evaluation_schema():
    e = Evaluation(is_acceptable=False, feedback="too generic")
    assert e.is_acceptable is False
    assert e.feedback == "too generic"


def test_photo_404_when_missing(tmp_path, monkeypatch):
    monkeypatch.setattr("app.main.ME_DIR", tmp_path)
    response = client.get("/me/photo")
    assert response.status_code == 404


def test_voice_disabled_by_default():
    from app import config, voice

    assert config.VOICE_MODE == "off" or not config.ELEVENLABS_API_KEY
    assert voice.is_enabled() is False


def test_only_user_details_tool_registered():
    from app.tools import TOOL_SCHEMAS

    names = [t["function"]["name"] for t in TOOL_SCHEMAS]
    assert names == ["record_user_details"]


def test_log_lead_writes_jsonl(tmp_path, monkeypatch):
    leads_file = tmp_path / "leads.jsonl"
    monkeypatch.setattr("app.notify.config.LEADS_FILE", leads_file)
    from app.notify import log_lead

    log_lead("test_kind", email="test@example.com")
    assert leads_file.exists()
    record = json.loads(leads_file.read_text().splitlines()[0])
    assert record["kind"] == "test_kind"
    assert record["email"] == "test@example.com"
    assert "ts" in record


def test_push_no_op_without_credentials(monkeypatch):
    monkeypatch.setattr("app.notify.config.PUSHOVER_USER", None)
    monkeypatch.setattr("app.notify.config.PUSHOVER_TOKEN", None)
    from app.notify import push

    push("test")  # should not raise


def test_execute_tool_records_user_details(tmp_path, monkeypatch):
    leads_file = tmp_path / "leads.jsonl"
    monkeypatch.setattr("app.notify.config.LEADS_FILE", leads_file)
    monkeypatch.setattr("app.notify.config.PUSHOVER_USER", None)
    monkeypatch.setattr("app.notify.config.PUSHOVER_TOKEN", None)
    from app.tools import execute

    result = execute(
        "record_user_details",
        json.dumps({"email": "ana@example.com", "name": "Ana"}),
    )
    assert result == {"recorded": "ok"}
    record = json.loads(leads_file.read_text().splitlines()[0])
    assert record["email"] == "ana@example.com"
    assert record["name"] == "Ana"


def test_execute_unknown_tool_returns_error():
    from app.tools import execute

    result = execute("nonexistent_tool", "{}")
    assert "error" in result


def test_execute_tool_with_missing_required_arg_returns_error_not_crash():
    from app.tools import execute

    result = execute("record_user_details", "{}")
    assert "error" in result
