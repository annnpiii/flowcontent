import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
LOGOUT_URL = f"{BASE_URL}/api/logout"
ME_URL = f"{BASE_URL}/api/me"
TIMEOUT = 30

def test_logout_user():
    session = requests.Session()
    try:
        # Login first to create a session
        login_payload = {
            "username": "admin",
            "password": "admin123"
        }
        login_response = session.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
        login_data = login_response.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # Confirm the session is valid by /api/me
        me_response = session.get(ME_URL, timeout=TIMEOUT)
        assert me_response.status_code == 200, f"API /api/me failed with status code {me_response.status_code}"
        me_data = me_response.json()
        assert "user" in me_data and "brands" in me_data and "activeBrandId" in me_data

        # Perform logout
        logout_response = session.post(LOGOUT_URL, timeout=TIMEOUT)
        assert logout_response.status_code == 200, f"Logout failed with status code {logout_response.status_code}"
        logout_data = logout_response.json()
        assert logout_data.get("ok") is True, f"Logout response ok field is not True: {logout_data}"

        # Verify session destroyed by calling /api/me again
        me_after_logout_response = session.get(ME_URL, timeout=TIMEOUT)
        assert me_after_logout_response.status_code == 401, "Session was not destroyed after logout"
        me_after_logout_data = me_after_logout_response.json()
        assert me_after_logout_data.get("error") == "No session", "Expected 'No session' error after logout"
    finally:
        session.close()

test_logout_user()