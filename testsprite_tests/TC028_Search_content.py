import requests
from requests.auth import HTTPBasicAuth

def test_TC028_search_content():
    base_url = "http://localhost:80"
    login_url = f"{base_url}/api/login"
    search_url = f"{base_url}/api/search"
    timeout = 30

    session = requests.Session()

    # Login as admin to get session cookie
    login_payload = {
        "username": "admin",
        "password": "admin123"
    }
    try:
        login_resp = session.post(login_url, json=login_payload, timeout=timeout)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        # Session cookie should be managed automatically by requests.Session

        # Perform search with a minimal 2-character query
        params = {"q": "te"}  # minimal 2 characters
        search_resp = session.get(search_url, params=params, timeout=timeout)
        assert search_resp.status_code == 200, f"Search request failed: {search_resp.text}"
        json_data = search_resp.json()
        assert "results" in json_data, "Response missing 'results' field"
        assert isinstance(json_data["results"], list), "'results' should be a list"
        assert len(json_data["results"]) > 0, "Search returned empty results for minimal 2-char query"

    finally:
        # Logout to destroy session
        logout_url = f"{base_url}/api/logout"
        session.post(logout_url, timeout=timeout)

test_TC028_search_content()