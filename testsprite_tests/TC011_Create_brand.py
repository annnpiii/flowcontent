import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
BRANDS_URL = f"{BASE_URL}/api/brands"
LOGOUT_URL = f"{BASE_URL}/api/logout"

auth_credential = {"username": "admin", "password": "admin123"}
timeout = 30

def test_create_brand():
    session = requests.Session()
    try:
        # Login as admin
        login_resp = session.post(
            LOGIN_URL,
            json={"username": auth_credential["username"], "password": auth_credential["password"]},
            timeout=timeout
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data, "Login response missing required fields"

        # Create a new brand
        brand_payload = {
            "name": "Test Brand TC011",
            "description": "Brand created for test case TC011",
            "color": "#123ABC"
        }
        create_resp = session.post(BRANDS_URL, json=brand_payload, timeout=timeout)
        assert create_resp.status_code == 200, f"Create brand failed with status {create_resp.status_code}"
        create_data = create_resp.json()
        assert "id" in create_data and create_data.get("ok") is True, "Create brand response missing 'id' or 'ok' fields"
        brand_id = create_data["id"]

    finally:
        # Cleanup: delete the created brand if exists
        if 'brand_id' in locals():
            session.delete(f"{BRANDS_URL}/{brand_id}", timeout=timeout)
        # Logout
        session.post(LOGOUT_URL, timeout=timeout)

test_create_brand()