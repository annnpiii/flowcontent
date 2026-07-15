import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = "/api/login"
CREATE_CONTENT_ENDPOINT = "/api/contents"
BULK_UPDATE_STATUS_ENDPOINT = "/api/contents/bulk/status"
DELETE_CONTENT_ENDPOINT = "/api/contents/{}"

AUTH_CREDENTIALS = ("admin", "admin123")
TIMEOUT = 30


def test_bulk_update_content_status_admin():
    session = requests.Session()
    created_content_ids = []
    try:
        # 1. Login as admin
        login_resp = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json={"username": AUTH_CREDENTIALS[0], "password": AUTH_CREDENTIALS[1]},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        headers = {"Content-Type": "application/json"}

        # 2. Create two content drafts to have valid content IDs to bulk update
        for i in range(2):
            content_payload = {
                "title": f"Bulk Update Test Content {i+1}",
                "caption": "Test caption",
                "platform": "facebook",
                "posting_date": "2026-07-20",
                "posting_time": "12:00",
            }
            create_resp = session.post(
                BASE_URL + CREATE_CONTENT_ENDPOINT,
                json=content_payload,
                timeout=TIMEOUT,
                headers=headers,
            )
            assert create_resp.status_code == 200, f"Create content failed: {create_resp.text}"
            create_data = create_resp.json()
            assert create_data.get("ok") is True
            content_id = create_data.get("id")
            assert content_id, "No content ID returned on creation"
            created_content_ids.append(content_id)

        # 3. Bulk update status using PATCH on /api/contents/bulk/status
        bulk_update_payload = {
            "ids": created_content_ids,
            "status": "approved"
        }
        bulk_update_resp = session.patch(
            BASE_URL + BULK_UPDATE_STATUS_ENDPOINT,
            json=bulk_update_payload,
            timeout=TIMEOUT,
            headers=headers,
        )
        assert bulk_update_resp.status_code == 200, f"Bulk update failed: {bulk_update_resp.text}"
        bulk_update_data = bulk_update_resp.json()
        assert bulk_update_data.get("success") is True
        assert bulk_update_data.get("updated") == len(created_content_ids)

    finally:
        # Cleanup: Delete created content
        for cid in created_content_ids:
            try:
                del_resp = session.delete(
                    BASE_URL + DELETE_CONTENT_ENDPOINT.format(cid),
                    timeout=TIMEOUT,
                    headers=headers,
                )
                # Accept 200 or 404 if already deleted
                if del_resp.status_code not in (200, 404):
                    print(f"Warning: Failed to delete content ID {cid}: {del_resp.text}")
            except Exception as e:
                print(f"Exception during cleanup deleting content ID {cid}: {e}")

        session.close()


test_bulk_update_content_status_admin()
