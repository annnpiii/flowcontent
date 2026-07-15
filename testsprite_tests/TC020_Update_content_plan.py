import requests

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = "/api/login"
CONTENT_PLANS_ENDPOINT = "/api/content-plans"

AUTH_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

TIMEOUT = 30


def test_update_content_plan():
    session = requests.Session()
    try:
        # Authenticate and obtain session cookie/token
        login_resp = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json={"username": AUTH_CREDENTIALS["username"], "password": AUTH_CREDENTIALS["password"]},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # Create a new content plan to update (no specific schema was given, assuming minimal)
        create_plan_payload = {
            "title": "Test Plan Update",
            "description": "Initial Description"
        }
        create_resp = session.post(
            BASE_URL + CONTENT_PLANS_ENDPOINT,
            json=create_plan_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"Create content plan failed: {create_resp.text}"
        create_data = create_resp.json()
        plan_id = create_data.get("id")
        assert isinstance(plan_id, (str, int)), "No valid plan ID returned on creation"

        # Prepare update payload - can update title and/or other properties
        update_payload = {
            "title": "Updated Test Plan Title",
            "description": "Updated Description"
        }
        update_resp = session.put(
            f"{BASE_URL}{CONTENT_PLANS_ENDPOINT}/{plan_id}",
            json=update_payload,
            timeout=TIMEOUT
        )
        assert update_resp.status_code == 200, f"Update content plan failed: {update_resp.text}"
        update_data = update_resp.json()
        assert update_data.get("success") is True, "Update response did not contain success true"

    finally:
        # Cleanup - delete the created content plan
        if 'plan_id' in locals():
            try:
                del_resp = session.delete(
                    f"{BASE_URL}{CONTENT_PLANS_ENDPOINT}/{plan_id}",
                    timeout=TIMEOUT
                )
                # It is okay if delete fails, just log or ignore
                if del_resp.status_code != 200:
                    pass
            except Exception:
                pass


test_update_content_plan()