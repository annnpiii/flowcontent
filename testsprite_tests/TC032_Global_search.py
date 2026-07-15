import requests

BASE_URL = "http://localhost:80"
USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30

def test_global_search():
    session = requests.Session()
    try:
        # Login
        login_resp = session.post(
            f"{BASE_URL}/api/login",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # Perform global search with query 'test'
        search_resp = session.get(
            f"{BASE_URL}/api/search",
            params={"q": "test"},
            timeout=TIMEOUT,
        )
        assert search_resp.status_code == 200, f"Search failed: {search_resp.text}"
        search_data = search_resp.json()
        assert "results" in search_data, "Search response missing 'results' key"
        results = search_data["results"]
        assert isinstance(results, list), f"'results' should be a list but is {type(results)}"
        assert len(results) > 0, "Search results list is empty"

        # Validate that results contain multiple types of content by checking type keys if present
        content_types = set()
        for item in results:
            # Try to identify type keys in each result, could be 'type', 'contentType', or others
            if isinstance(item, dict):
                for key in ("type", "contentType", "category", "kind"):
                    if key in item:
                        content_types.add(item[key])
                # If no type key found, fallback to record keys or just count as unknown
                if not any(k in item for k in ("type", "contentType", "category", "kind")):
                    content_types.add("unknown")
            else:
                content_types.add("unknown")

        assert len(content_types) > 1, (
            f"Expected search results from multiple content types, found: {content_types}"
        )

    finally:
        # Logout to destroy session
        logout_resp = session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)
        assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
        logout_data = logout_resp.json()
        assert logout_data.get("ok") is True


test_global_search()