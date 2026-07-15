import requests

BASE_URL = "http://localhost:80"
USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30

def test_TC008_get_content_detail():
    session = requests.Session()
    headers = {'Accept': 'application/json'}

    # Step 0: Login to obtain session cookie
    login_payload = {"username": USERNAME, "password": PASSWORD}
    login_res = session.post(f"{BASE_URL}/api/login", json=login_payload, headers=headers, timeout=TIMEOUT)
    assert login_res.status_code == 200, f"Login failed, status code {login_res.status_code}"

    content_id = None

    try:
        # Step 1: Create a new content draft to test against
        create_payload = {
            "title": "Test Content Title for Detail",
            "caption": "Test caption for content detail.",
            "platform": "facebook",
            "posting_date": "2026-08-01",
            "posting_time": "12:00"
        }
        create_res = session.post(f"{BASE_URL}/api/contents", json=create_payload, headers=headers, timeout=TIMEOUT)
        assert create_res.status_code == 200, f"Failed to create content, status code {create_res.status_code}"
        create_json = create_res.json()
        assert "id" in create_json and create_json.get("ok") is True, "Content creation response missing expected fields"
        content_id = create_json["id"]

        # Step 2: Get the content detail
        detail_res = session.get(f"{BASE_URL}/api/contents/{content_id}", headers=headers, timeout=TIMEOUT)
        assert detail_res.status_code == 200, f"Content detail request failed, status code {detail_res.status_code}"
        detail_json = detail_res.json()

        # Validate response keys content, logs, versions
        assert "content" in detail_json, "'content' missing in response"
        assert "logs" in detail_json, "'logs' missing in response"
        assert "versions" in detail_json, "'versions' missing in response"

        # Additional sanity checks
        content = detail_json["content"]
        assert isinstance(content, dict), "'content' should be a dict"
        assert content.get("id") == content_id, "Content ID mismatch"

        logs = detail_json["logs"]
        assert isinstance(logs, list), "'logs' should be a list"

        versions = detail_json["versions"]
        assert isinstance(versions, list), "'versions' should be a list"

    finally:
        # Clean up - delete the created content
        if content_id:
            del_res = session.delete(f"{BASE_URL}/api/contents/{content_id}", headers=headers, timeout=TIMEOUT)
            assert del_res.status_code == 200, f"Cleanup failed to delete content, status code {del_res.status_code}"
            del_json = del_res.json()
            assert del_json.get("ok") is True, "Cleanup delete content response missing ok:true"

test_TC008_get_content_detail()
