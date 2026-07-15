import requests
import uuid

BASE_URL = "http://localhost:80"
TIMEOUT = 30
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


def test_delete_user_as_admin():
    session = requests.Session()

    # Login as admin
    login_payload = {
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    }
    login_resp = session.post(f"{BASE_URL}/api/login", json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_json = login_resp.json()
    assert "user" in login_json

    user_id = None
    try:
        # Create a new user to delete
        new_username = f"testuser_{uuid.uuid4().hex[:8]}"
        create_user_payload = {
            "username": new_username,
            "password": "Testpass123!",
            "display_name": "Test User",
            "role": "creator"
        }
        create_resp = session.post(f"{BASE_URL}/api/users", json=create_user_payload, timeout=TIMEOUT)
        assert create_resp.status_code == 200, f"User creation failed with status {create_resp.status_code}"
        create_json = create_resp.json()
        assert create_json.get("ok") is True

        # Fetch users list to find the created user's id
        users_resp = session.get(f"{BASE_URL}/api/users", timeout=TIMEOUT)
        assert users_resp.status_code == 200, f"Get users failed with status {users_resp.status_code}"
        users_json = users_resp.json()
        users = users_json.get("users", [])
        matching_users = [u for u in users if u.get("username") == new_username]
        assert len(matching_users) == 1, "Created user not found in users list"
        user_id = matching_users[0].get("id")
        assert user_id is not None, "User ID not found"

        # Delete the created user
        delete_resp = session.delete(f"{BASE_URL}/api/users/{user_id}", timeout=TIMEOUT)
        assert delete_resp.status_code == 200, f"User deletion failed with status {delete_resp.status_code}"
        delete_json = delete_resp.json()
        assert delete_json.get("ok") is True

        # Confirm user deletion by trying to delete again (should 404)
        delete_again_resp = session.delete(f"{BASE_URL}/api/users/{user_id}", timeout=TIMEOUT)
        assert delete_again_resp.status_code == 404

    finally:
        # Cleanup if user still exists (in case of failure before deletion)
        if user_id:
            session.delete(f"{BASE_URL}/api/users/{user_id}", timeout=TIMEOUT)

    # Logout (optional cleanup)
    session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)

test_delete_user_as_admin()
