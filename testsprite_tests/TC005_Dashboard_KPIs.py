import requests

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = "/api/login"
DASHBOARD_ENDPOINT = "/api/dashboard"
LOGOUT_ENDPOINT = "/api/logout"

USERNAME = "admin"
PASSWORD = "admin123"

def test_tc005_dashboard_kpis():
    session = requests.Session()
    try:
        # Login to get session cookie
        login_resp = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=30
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data, "Login response missing 'user'"
        assert "brands" in login_data, "Login response missing 'brands'"
        assert "activeBrandId" in login_data, "Login response missing 'activeBrandId'"

        # Call dashboard KPI endpoint
        dashboard_resp = session.get(
            BASE_URL + DASHBOARD_ENDPOINT,
            timeout=30
        )
        assert dashboard_resp.status_code == 200, f"Dashboard request failed with status {dashboard_resp.status_code}"

        data = dashboard_resp.json()
        expected_keys = {
            "drafts",
            "pendingReview",
            "approved",
            "revisionRequested",
            "scheduled",
            "posted"
        }
        missing_keys = expected_keys - data.keys()
        assert not missing_keys, f"Dashboard response missing keys: {missing_keys}"

        # Each KPI count should be an integer >= 0
        for key in expected_keys:
            value = data[key]
            assert isinstance(value, int), f"Dashboard {key} is not int"
            assert value >= 0, f"Dashboard {key} is negative"

    finally:
        # Logout to destroy session
        try:
            logout_resp = session.post(BASE_URL + LOGOUT_ENDPOINT, timeout=30)
            assert logout_resp.status_code == 200, f"Logout failed with status {logout_resp.status_code}"
            logout_data = logout_resp.json()
            assert logout_data.get("ok") is True, "Logout response ok not true"
        except Exception:
            pass

test_tc005_dashboard_kpis()