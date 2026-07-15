import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
BRANDS_URL = f"{BASE_URL}/api/brands"
LOGOUT_URL = f"{BASE_URL}/api/logout"
TIMEOUT = 30
USERNAME = "admin"
PASSWORD = "admin123"

def test_TC010_get_brands_list():
    session = requests.Session()
    try:
        # Login to get session cookie
        login_response = session.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        assert "brands" in login_data, "Login response missing brands data"

        # Get brands list
        brands_response = session.get(BRANDS_URL, timeout=TIMEOUT)
        assert brands_response.status_code == 200, f"Failed to get brands: {brands_response.text}"
        brands_data = brands_response.json()
        assert "brands" in brands_data, "Response missing 'brands' key"
        assert isinstance(brands_data["brands"], list), "'brands' is not a list"

    finally:
        try:
            # Logout to clean up session
            logout_response = session.post(LOGOUT_URL, timeout=TIMEOUT)
            assert logout_response.status_code == 200, f"Logout failed: {logout_response.text}"
            logout_data = logout_response.json()
            assert logout_data.get("ok") is True, "Logout response does not contain ok: true"
        except Exception:
            pass

test_TC010_get_brands_list()