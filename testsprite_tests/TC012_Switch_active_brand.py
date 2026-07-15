import requests

BASE_URL = "http://localhost:80"
AUTH_CREDENTIALS = ("admin", "admin123")
TIMEOUT = 30

def test_switch_active_brand():
    session = requests.Session()

    # Login to get session cookie
    login_resp = session.post(
        f"{BASE_URL}/api/login",
        json={"username": AUTH_CREDENTIALS[0], "password": AUTH_CREDENTIALS[1]},
        timeout=TIMEOUT,
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert "brands" in login_data and isinstance(login_data["brands"], list), "brands missing or invalid"
    assert len(login_data["brands"]) > 0, "No brands available for the user"
    assert "activeBrandId" in login_data, "activeBrandId missing in login response"

    # Choose a brand_id from the returned brands list
    brand_id = login_data["brands"][0].get("id") if isinstance(login_data["brands"][0], dict) else None
    assert brand_id, "Brand id not found in brands list"

    # Switch active brand using POST /api/brand/switch
    switch_resp = session.post(
        f"{BASE_URL}/api/brand/switch",
        json={"brand_id": brand_id},
        timeout=TIMEOUT,
    )
    assert switch_resp.status_code == 200, f"Switch active brand failed: {switch_resp.text}"
    switch_data = switch_resp.json()
    assert switch_data.get("ok") is True, "'ok' field not true in switch response"
    assert switch_data.get("activeBrandId") == brand_id, "activeBrandId not updated correctly"

    # Logout to clean up session
    logout_resp = session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)
    assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
    logout_data = logout_resp.json()
    assert logout_data.get("ok") is True, "Logout response ok field not true"

test_switch_active_brand()
