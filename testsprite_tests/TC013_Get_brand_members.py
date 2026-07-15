import requests

BASE_URL = "http://localhost:80"
USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30

def test_get_brand_members():
    session = requests.Session()
    login_url = f"{BASE_URL}/api/login"
    brands_url = f"{BASE_URL}/api/brands"

    # Login as admin to get session cookie
    resp = session.post(login_url, json={"username": USERNAME, "password": PASSWORD}, timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    assert "brands" in data and isinstance(data["brands"], list)
    assert "activeBrandId" in data

    # We will use an existing brand if any, otherwise create a brand for the test
    brand_id = None
    if data["brands"]:
        brand_id = data["brands"][0]["id"] if isinstance(data["brands"][0], dict) and "id" in data["brands"][0] else None

    created_brand_id = None
    try:
        if not brand_id:
            # Create a new brand
            create_resp = session.post(
                brands_url,
                json={
                    "name": "TestBrandForMembers",
                    "description": "Brand created for test_get_brand_members",
                    "color": "#123456"
                },
                timeout=TIMEOUT
            )
            assert create_resp.status_code == 200
            create_data = create_resp.json()
            assert "id" in create_data and create_data.get("ok") is True
            created_brand_id = create_data["id"]
            brand_id = created_brand_id

        # Call GET /api/brands/:id/members
        members_url = f"{brands_url}/{brand_id}/members"
        members_resp = session.get(members_url, timeout=TIMEOUT)
        assert members_resp.status_code == 200
        members_data = members_resp.json()
        assert "members" in members_data
        assert isinstance(members_data["members"], list)
    finally:
        # Clean up: delete brand if it was created by this test
        if created_brand_id:
            del_resp = session.delete(f"{brands_url}/{created_brand_id}", timeout=TIMEOUT)
            assert del_resp.status_code == 200
            del_data = del_resp.json()
            assert del_data.get("ok") is True

test_get_brand_members()
