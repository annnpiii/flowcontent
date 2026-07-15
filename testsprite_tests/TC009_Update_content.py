import requests

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = "/api/login"
CONTENT_ENDPOINT = "/api/contents"

USERNAME = "admin"
PASSWORD = "admin123"

TIMEOUT = 30


def test_TC009_update_content():
    session = requests.Session()

    try:
        # Login to get session cookie
        login_resp = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # Create a new content resource to update
        content_create_payload = {
            "title": "Initial Title",
            "caption": "Initial Caption",
            "platform": "facebook",
            "posting_date": "2026-08-01",
            "posting_time": "10:00"
        }
        create_resp = session.post(
            BASE_URL + CONTENT_ENDPOINT,
            json=content_create_payload,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 200, f"Create content failed: {create_resp.text}"
        create_data = create_resp.json()
        assert create_data.get("ok") is True
        content_id = create_data.get("id")
        assert content_id, "Content ID not returned"

        # Update the created content
        updated_payload = {
            "title": "Updated Title",
            "caption": "Updated Caption",
            "platform": "instagram",
            "posting_date": "2026-08-02",
            "posting_time": "11:30"
        }
        update_resp = session.put(
            f"{BASE_URL}{CONTENT_ENDPOINT}/{content_id}",
            json=updated_payload,
            timeout=TIMEOUT,
        )
        assert update_resp.status_code == 200, f"Update content failed: {update_resp.text}"
        update_data = update_resp.json()
        assert update_data.get("ok") is True

    finally:
        # Cleanup: delete the created content
        if 'content_id' in locals():
            del_resp = session.delete(
                f"{BASE_URL}{CONTENT_ENDPOINT}/{content_id}",
                timeout=TIMEOUT,
            )
            assert del_resp.status_code == 200, f"Delete content failed: {del_resp.text}"
            del_data = del_resp.json()
            assert del_data.get("ok") is True


test_TC009_update_content()