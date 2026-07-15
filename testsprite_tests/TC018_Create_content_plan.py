import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
CONTENT_PLANS_URL = f"{BASE_URL}/api/content-plans"

def test_TC018_create_content_plan():
    session = requests.Session()
    try:
        # Login as admin to get authenticated session
        login_resp = session.post(
            LOGIN_URL,
            json={"username": "admin", "password": "admin123"},
            timeout=30,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

        # Create a content plan with a valid title
        payload = {
            "title": "Test Content Plan Title"
        }

        create_resp = session.post(
            CONTENT_PLANS_URL,
            json=payload,
            timeout=30,
        )
        assert create_resp.status_code == 200, f"Create content plan failed: {create_resp.text}"
        data = create_resp.json()
        assert "id" in data, "Response json missing 'id'"
        content_plan_id = data["id"]

    finally:
        # Cleanup: Delete the created content plan if created
        try:
            if 'content_plan_id' in locals():
                delete_resp = session.delete(
                    f"{CONTENT_PLANS_URL}/{content_plan_id}",
                    timeout=30,
                )
                # Accept either 200 success or 404 if already deleted
                assert delete_resp.status_code in (200, 404), f"Cleanup delete failed: {delete_resp.text}"
        except Exception:
            pass

    session.close()

test_TC018_create_content_plan()
