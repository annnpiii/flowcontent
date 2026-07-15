import requests

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = "/api/login"
TEAM_ENDPOINT = "/api/team"
TIMEOUT = 30


def test_get_team_members():
    session = requests.Session()
    try:
        # Authenticate with basic token (via login endpoint)
        login_payload = {"username": "admin", "password": "admin123"}
        login_response = session.post(
            BASE_URL + LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_json = login_response.json()
        assert "user" in login_json and "brands" in login_json and "activeBrandId" in login_json, "Login response missing fields"

        # Use authenticated session to get team members
        team_response = session.get(
            BASE_URL + TEAM_ENDPOINT,
            timeout=TIMEOUT
        )
        assert team_response.status_code == 200, f"Failed to get team members: {team_response.text}"
        team_json = team_response.json()
        assert "users" in team_json, "Response missing 'users' field"
        assert isinstance(team_json["users"], list), "'users' is not a list"

    finally:
        # Logout to destroy session
        session.post(BASE_URL + "/api/logout", timeout=TIMEOUT)


test_get_team_members()
