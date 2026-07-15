import requests

BASE_URL = "http://localhost:80"
AUTH = ("admin", "admin123")
TIMEOUT = 30

def test_tc019_list_content_plans():
    session = requests.Session()
    try:
        # Authenticate and establish session
        login_resp = session.post(
            f"{BASE_URL}/api/login",
            json={"username": AUTH[0], "password": AUTH[1]},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data, "Login response missing required fields"

        # Use session cookie automatically for authenticated requests

        # Request content plans list with pagination query params (page=1, limit=10 default)
        params = {"page": 1, "limit": 10}
        resp = session.get(f"{BASE_URL}/api/content-plans", params=params, timeout=TIMEOUT)
        assert resp.status_code == 200, f"List content plans failed with status {resp.status_code}"
        data = resp.json()
        # Validate response schema keys
        assert "plans" in data, "'plans' missing in response"
        assert "total" in data, "'total' missing in response"
        assert "page" in data, "'page' missing in response"
        assert "limit" in data, "'limit' missing in response"
        # Validate pagination values
        assert data["page"] == params["page"], f"Expected page {params['page']} but got {data['page']}"
        assert data["limit"] == params["limit"], f"Expected limit {params['limit']} but got {data['limit']}"
        # 'plans' should be a list (can be empty)
        assert isinstance(data["plans"], list), "'plans' is not a list"

    finally:
        # Logout to clean up session
        try:
            logout_resp = session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)
            assert logout_resp.status_code == 200 and logout_resp.json().get("ok") is True, "Logout failed or invalid response"
        except Exception:
            pass

test_tc019_list_content_plans()