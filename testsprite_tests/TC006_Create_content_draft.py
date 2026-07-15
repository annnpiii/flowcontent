import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
CONTENTS_URL = f"{BASE_URL}/api/contents"
LOGOUT_URL = f"{BASE_URL}/api/logout"

USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30

def test_create_content_draft():
    session = requests.Session()
    try:
        # Authenticate and establish session
        login_resp = session.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        assert "user" in login_json and "brands" in login_json and "activeBrandId" in login_json

        # Prepare valid content draft data
        payload = {
            "title": "Test Content Draft Title",
            "caption": "This is a test caption for content draft.",
            "platform": "facebook",
            "posting_date": "2026-08-01",
            "posting_time": "12:00"
        }

        # Create content draft
        create_resp = session.post(
            CONTENTS_URL,
            json=payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"Create content draft failed with status {create_resp.status_code}"
        create_json = create_resp.json()
        assert "id" in create_json and create_json.get("ok") is True

    finally:
        # Cleanup: if content draft created, delete it
        content_id = None
        try:
            content_id = create_json.get("id")
        except Exception:
            pass
        if content_id:
            try:
                delete_resp = session.delete(f"{CONTENTS_URL}/{content_id}", timeout=TIMEOUT)
                # May be admin-only, check and ignore error if any
                # No assertion for cleanup
            except Exception:
                pass

        # Logout user session
        try:
            session.post(LOGOUT_URL, timeout=TIMEOUT)
        except Exception:
            pass

test_create_content_draft()