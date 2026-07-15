import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
TIMEOUT = 30
USERNAME = "admin"
PASSWORD = "admin123"


def test_create_manual_trend():
    session = requests.Session()
    try:
        # Login to get authenticated session
        login_resp = session.post(
            f"{BASE_URL}/api/login",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        # Confirm response contains user, brands, activeBrandId
        login_json = login_resp.json()
        assert "user" in login_json and "brands" in login_json and "activeBrandId" in login_json

        # Prepare valid manual trend data (minimal valid example)
        trend_data = {
            "title": "Test Manual Trend",
            "category": "general",  # guessing category based on typical use
            "platform": "all",      # guessing platform
            "notes": "Automated test trend creation",
            "relevance": 5          # assuming relevance field
        }
        # Removing keys not guaranteed by PRD, we'll keep only title (as example)
        # Since no request schema provided, using minimal with title only
        trend_data = {"title": "Test Manual Trend"}

        # Create manual trend
        create_resp = session.post(
            f"{BASE_URL}/api/trends",
            json=trend_data,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 200, f"Create trend failed: {create_resp.text}"
        create_json = create_resp.json()
        assert create_json.get("ok") is True, f"Response ok field false: {create_resp.text}"
        assert "id" in create_json, "Response missing id field"

    finally:
        # Cleanup: delete the created manual trend
        if 'create_json' in locals() and "id" in create_json:
            trend_id = create_json["id"]
            # Attempt delete trend if API supports - PRD doesn't mention DELETE for trends
            # So no delete endpoint for trends given, so skip cleanup

            # If the API had a DELETE for /api/trends/:id, we would call it here.
            pass


test_create_manual_trend()