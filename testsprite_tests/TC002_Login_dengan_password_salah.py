import requests

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = f"{BASE_URL}/api/login"
TIMEOUT = 30

def test_login_with_wrong_password():
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "username": "admin",
        "password": "wrongpassword"
    }
    try:
        response = requests.post(LOGIN_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected status code 401 but got {response.status_code}"
    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    assert "error" in resp_json, "Response JSON does not contain 'error' key"
    assert isinstance(resp_json["error"], str) and len(resp_json["error"]) > 0, "'error' key is empty or not a string"

test_login_with_wrong_password()