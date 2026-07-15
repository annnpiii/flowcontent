import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
ME_URL = f"{BASE_URL}/api/me"
TIMEOUT = 30

def test_get_current_user_session():
    session = requests.Session()
    try:
        # Login to get session cookie
        login_payload = {
            "username": "admin",
            "password": "admin123"
        }
        login_resp = session.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data, "Login response missing user"
        assert "brands" in login_data, "Login response missing brands"
        assert "activeBrandId" in login_data, "Login response missing activeBrandId"

        # Request GET /api/me with valid session cookie
        me_resp = session.get(ME_URL, timeout=TIMEOUT)
        assert me_resp.status_code == 200, f"GET /api/me failed with status {me_resp.status_code}"
        me_data = me_resp.json()
        # Validate presence of user, brands, activeBrandId in response
        assert isinstance(me_data, dict), "Response is not a JSON object"
        assert "user" in me_data, "Response missing user profile"
        assert "brands" in me_data, "Response missing brands"
        assert "activeBrandId" in me_data, "Response missing activeBrandId"
        # Optional: verify that user and brands are not empty
        assert isinstance(me_data["user"], dict) and me_data["user"], "User profile empty"
        assert isinstance(me_data["brands"], list) and me_data["brands"], "Brands list empty"

    finally:
        # Logout to destroy session (cleanup)
        logout_url = f"{BASE_URL}/api/logout"
        try:
            logout_resp = session.post(logout_url, timeout=TIMEOUT)
            # It is okay if logout fails; no exception should propagate
        except Exception:
            pass

test_get_current_user_session()