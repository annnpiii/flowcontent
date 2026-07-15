import requests
from requests.auth import HTTPBasicAuth

def test_list_content_folders():
    base_url = "http://localhost:80"
    login_url = f"{base_url}/api/login"
    folders_url = f"{base_url}/api/folders"
    logout_url = f"{base_url}/api/logout"
    username = "admin"
    password = "admin123"
    timeout = 30

    session = requests.Session()

    try:
        # Login as admin with basic token authentication
        login_payload = {
            "username": username,
            "password": password
        }
        login_response = session.post(login_url, json=login_payload, timeout=timeout)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # After login, session cookies are maintained in the 'session'

        # GET /api/folders to list content folders
        folders_response = session.get(folders_url, timeout=timeout)
        assert folders_response.status_code == 200, f"Failed to get folders: {folders_response.text}"
        folders_data = folders_response.json()
        assert "folders" in folders_data, "Response missing 'folders' key"
        assert isinstance(folders_data["folders"], list), "'folders' is not a list"

        # Each folder item must have 'item_count'
        for folder in folders_data["folders"]:
            assert "item_count" in folder, f"Folder missing 'item_count': {folder}"
            # Optionally check that item_count is an int >= 0
            assert isinstance(folder["item_count"], int) and folder["item_count"] >= 0, f"Invalid 'item_count' value: {folder['item_count']}"

    finally:
        # Logout to destroy session
        try:
            logout_response = session.post(logout_url, timeout=timeout)
            assert logout_response.status_code == 200, f"Logout failed: {logout_response.text}"
            logout_data = logout_response.json()
            assert logout_data.get("ok") is True, "Logout response missing ok:true"
        except Exception:
            pass

test_list_content_folders()