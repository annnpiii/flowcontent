import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
FOLDERS_URL = f"{BASE_URL}/api/folders"
LOGOUT_URL = f"{BASE_URL}/api/logout"
TIMEOUT = 30

def test_create_folder():
    session = requests.Session()
    try:
        # Authenticate
        login_resp = session.post(
            LOGIN_URL,
            json={"username": "admin", "password": "admin123"},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data
        assert "brands" in login_data
        assert "activeBrandId" in login_data

        # Create folder with valid name
        folder_name = "TestFolder_TC024"
        create_resp = session.post(
            FOLDERS_URL,
            json={"name": folder_name},
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"Create folder failed: {create_resp.text}"
        create_data = create_resp.json()
        assert create_data.get("ok") is True
        folder_id = create_data.get("id")
        assert folder_id, "Folder ID missing in response"

    finally:
        # Clean up: delete created folder if created
        if 'folder_id' in locals():
            try:
                del_resp = session.delete(f"{FOLDERS_URL}/{folder_id}", timeout=TIMEOUT)
                # Deletion might be admin-only; assert ok true if status 200, otherwise skip
                if del_resp.status_code == 200:
                    del_data = del_resp.json()
                    assert del_data.get("ok") is True
            except Exception:
                pass
        # Logout
        try:
            logout_resp = session.post(LOGOUT_URL, timeout=TIMEOUT)
            assert logout_resp.status_code == 200
            logout_data = logout_resp.json()
            assert logout_data.get("ok") is True
        except Exception:
            pass

test_create_folder()