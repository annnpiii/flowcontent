import requests

def test_TC021_create_promo():
    base_url = "http://localhost:80"
    login_url = f"{base_url}/api/login"
    promo_url = f"{base_url}/api/promos"
    logout_url = f"{base_url}/api/logout"
    timeout = 30

    session = requests.Session()

    # Login as admin
    login_payload = {
        "username": "admin",
        "password": "admin123"
    }
    login_resp = session.post(login_url, json=login_payload, timeout=timeout)
    try:
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    except AssertionError:
        session.close()
        raise

    # Prepare valid promo data (based on the promo management descriptions and typical allocation)
    promo_data = {
        "name": "Test Promo",
        "description": "Promo for testing",
        "start_date": "2026-07-01",
        "end_date": "2026-07-31",
        "allocations": [
            {"branch": "Branch A", "percentage": 50},
            {"branch": "Branch B", "percentage": 50}
        ],
        "active": True
    }

    # The above keys are assumed typical for a promo POST request with allocation totaling 100%.
    # If the API requires different fields, adjust accordingly.

    # Send POST to create promo
    resp = session.post(promo_url, json=promo_data, timeout=timeout)

    try:
        assert resp.status_code == 200, f"Expected status 200 but got {resp.status_code}: {resp.text}"
        json_resp = resp.json()
        assert "id" in json_resp, "Response missing 'id'"
        assert json_resp.get("ok") is True, "Response 'ok' field is not True"
    finally:
        # Cleanup - delete the created promo using DELETE /api/promos/:id if available
        promo_id = None
        try:
            promo_id = json_resp.get("id") if resp.status_code == 200 else None
            if promo_id:
                del_resp = session.delete(f"{promo_url}/{promo_id}", timeout=timeout)
                # Optional: check delete response status 200 and ok true, but not asserted here
        except Exception:
            pass

        # Logout user session
        try:
            session.post(logout_url, timeout=timeout)
        except Exception:
            pass

        session.close()

test_TC021_create_promo()