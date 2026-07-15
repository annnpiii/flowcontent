import requests

def test_login_valid_credentials():
    base_url = "http://localhost:80"
    login_url = f"{base_url}/api/login"
    payload = {
        "username": "admin",
        "password": "admin123"
    }
    try:
        response = requests.post(login_url, json=payload, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_data = response.json()
        assert "user" in json_data, "'user' key not in response"
        assert "brands" in json_data, "'brands' key not in response"
        assert "activeBrandId" in json_data, "'activeBrandId' key not in response"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_login_valid_credentials()