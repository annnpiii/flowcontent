import requests

BASE_URL = "http://localhost:80"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_add_brand_member():
    session = requests.Session()
    new_user_id = None
    user_to_add = None
    try:
        # Login to get session cookies
        login_payload = {"username": "admin", "password": "admin123"}
        login_resp = session.post(f"{BASE_URL}/api/login", json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "brands" in login_data and len(login_data["brands"]) > 0, "No brands found after login"
        # Use first brand id
        brand_id = login_data["brands"][0]["id"]

        # Get users list to find a user to add as member
        users_resp = session.get(f"{BASE_URL}/api/users", timeout=TIMEOUT)
        assert users_resp.status_code == 200, f"Failed to get users: {users_resp.text}"
        users_data = users_resp.json()
        users = users_data.get("users", [])
        # Filter out users who are already members to avoid duplicate adds
        members_resp = session.get(f"{BASE_URL}/api/brands/{brand_id}/members", timeout=TIMEOUT)
        assert members_resp.status_code == 200, f"Failed to get brand members: {members_resp.text}"
        member_data = members_resp.json()
        existing_member_ids = {member["id"] for member in member_data.get("members", [])}

        # Find a user not already a member
        for user in users:
            if user["id"] not in existing_member_ids:
                user_to_add = user
                break

        # If no user found to add, create a new user then add
        if user_to_add is None:
            import uuid
            new_username = f"testuser_{uuid.uuid4().hex[:8]}"
            new_user_payload = {
                "username": new_username,
                "password": "TestPass123!",
                "display_name": "Test User",
                "role": "creator"
            }
            create_user_resp = session.post(f"{BASE_URL}/api/users", json=new_user_payload, timeout=TIMEOUT)
            assert create_user_resp.status_code == 200, f"Failed to create user: {create_user_resp.text}"
            # Try to get the user id by listing users again
            users_resp_after = session.get(f"{BASE_URL}/api/users", timeout=TIMEOUT)
            assert users_resp_after.status_code == 200, "Failed to get users after user creation"
            users_after = users_resp_after.json().get("users", [])
            for user in users_after:
                if user["username"] == new_username:
                    new_user_id = user["id"]
                    break
            assert new_user_id is not None, "New user id not found after creation"
            user_to_add = {"id": new_user_id}

        # Add the user to brand members
        add_member_resp = session.post(f"{BASE_URL}/api/brands/{brand_id}/members",
                                       json={"userId": user_to_add["id"]},
                                       timeout=TIMEOUT)
        assert add_member_resp.status_code == 200, f"Failed to add brand member: {add_member_resp.text}"
        add_member_data = add_member_resp.json()
        assert add_member_data.get("ok") is True, f"Add member response not ok: {add_member_resp.text}"

    finally:
        # Cleanup: Remove the user from brand members and delete created user if any
        try:
            if 'brand_id' in locals() and user_to_add is not None:
                session.delete(f"{BASE_URL}/api/brands/{brand_id}/members/{user_to_add['id']}", timeout=TIMEOUT)
        except Exception:
            pass
        if new_user_id is not None:
            try:
                session.delete(f"{BASE_URL}/api/users/{new_user_id}", timeout=TIMEOUT)
            except Exception:
                pass


test_add_brand_member()
