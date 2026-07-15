import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
CANVA_TEMPLATES_URL = f"{BASE_URL}/api/canva-templates"


def test_get_canva_templates():
    session = requests.Session()
    try:
        # Authenticate with basic token (username/password)
        login_payload = {
            "username": "admin",
            "password": "admin123"
        }
        login_response = session.post(LOGIN_URL, json=login_payload, timeout=30)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"

        # Verify login response has necessary keys
        login_json = login_response.json()
        assert "user" in login_json
        assert "brands" in login_json
        assert "activeBrandId" in login_json

        # Get Canva templates
        response = session.get(CANVA_TEMPLATES_URL, timeout=30)
        assert response.status_code == 200, f"GET /api/canva-templates failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Response is not a JSON object"
        assert "templates" in data, "'templates' key missing in response"
        assert isinstance(data["templates"], list), "'templates' is not a list"

    finally:
        # Logout to destroy session
        try:
            session.post(f"{BASE_URL}/api/logout", timeout=30)
        except Exception:
            pass


test_get_canva_templates()