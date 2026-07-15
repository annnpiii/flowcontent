import requests

BASE_URL = "http://localhost:80"
LOGIN_PATH = "/api/login"
CONTENT_CREATE_PATH = "/api/contents"
CONTENT_DELETE_PATH = "/api/contents/{}"
TIMEOUT = 30

def test_postapicontentscreatecontentdraft():
    session = requests.Session()
    login_url = BASE_URL + LOGIN_PATH
    login_payload = {"username": "admin", "password": "admin123"}
    try:
        login_resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        assert 'user' in login_json, "Login response missing 'user'"

        content_data = {
            "title": "Test Content Draft",
            "caption": "This is a test caption for the content draft.",
            "platform": "instagram",
            "posting_date": "2026-08-01",
            "posting_time": "14:30"
        }

        create_url = BASE_URL + CONTENT_CREATE_PATH
        create_resp = session.post(create_url, json=content_data, timeout=TIMEOUT)
        assert create_resp.status_code == 200, f"Content creation failed with status {create_resp.status_code}"
        create_json = create_resp.json()
        assert 'id' in create_json, "Content creation response missing 'id'"
        assert create_json.get('ok') is True, "Content creation response 'ok' is not True"
        content_id = create_json['id']
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    finally:
        if 'content_id' in locals():
            delete_url = BASE_URL + CONTENT_DELETE_PATH.format(content_id)
            try:
                del_resp = session.delete(delete_url, timeout=TIMEOUT)
                assert del_resp.status_code == 200, f"Content deletion failed with status {del_resp.status_code}"
                del_json = del_resp.json()
                assert del_json.get('ok') is True, "Content deletion response 'ok' is not True"
            except requests.RequestException:
                pass

test_postapicontentscreatecontentdraft()
