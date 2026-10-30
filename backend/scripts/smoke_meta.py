import json

from app.services.meta_client import MetaClient, MetaClientError


def main() -> None:
    client = MetaClient()
    try:
        result = client.chat_json(
            "Return JSON only with one key named ok and a boolean value.",
            "Reply with {\"ok\": true}.",
            project_id="smoke-test",
            max_tokens=1000,
        )
    except MetaClientError as exc:
        raise SystemExit(f"Meta Model API smoke test failed: {exc}") from exc
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
