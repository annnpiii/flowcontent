import requests
from requests.auth import HTTPBasicAuth

base_url = "http://localhost:80"
auth = HTTPBasicAuth("admin", "admin123")
timeout = 30

def test_tc025_get_notifications():
    session = requests.Session()
    try:
        # Authenticate using basic token (HTTPBasicAuth simulates basic auth)
        login_resp = session.post(
            f"{base_url}/api/login",
            auth=auth,
            timeout=timeout
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data, "Login response missing keys"

        # Get notifications
        notifs_resp = session.get(
            f"{base_url}/api/notifications",
            timeout=timeout
        )
        assert notifs_resp.status_code == 200, f"Get notifications failed with status {notifs_resp.status_code}"
        notifs_data = notifs_resp.json()
        assert "notifications" in notifs_data, "'notifications' key missing in response"
        assert isinstance(notifs_data["notifications"], list), "'notifications' is not a list"
        assert "unread" in notifs_data, "'unread' key missing in response"
        assert isinstance(notifs_data["unread"], int), "'unread' is not an integer"
    finally:
        # Logout to destroy session
        logout_resp = session.post(f"{base_url}/api/logout", timeout=timeout)
        assert logout_resp.status_code == 200, "Logout failed"
        logout_data = logout_resp.json()
        assert "ok" in logout_data and logout_data["ok"] is True, "Logout response invalid"

test_tc025_get_notifications()