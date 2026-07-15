import requests

BASE_URL = "http://localhost:80"
LOGIN_PATH = "/api/login"
CONTENT_PLANS_PATH = "/api/content-plans"

USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30

def test_TC035_delete_content_plan_admin():
    session = requests.Session()

    # Login as admin to get authenticated session (with cookie)
    login_resp = session.post(
        BASE_URL + LOGIN_PATH,
        json={"username": USERNAME, "password": PASSWORD},
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

    # Create a new content plan to have a valid id for deletion
    create_resp = session.post(
        BASE_URL + CONTENT_PLANS_PATH,
        timeout=TIMEOUT
    )
    # API schema for creating content plan does not require body according to PRD snippet,
    # but in user flows it says with plan details, but no details given,
    # so we assume empty or minimal body allowed for test (could also be empty)
    # to create a plan just to be deleted.
    # If this fails, pass empty object to ensure creation.
    if create_resp.status_code != 200:
        create_resp = session.post(
            BASE_URL + CONTENT_PLANS_PATH,
            json={"title": "Test Plan For Deletion"},
            timeout=TIMEOUT
        )
    assert create_resp.status_code == 200, f"Create content plan failed: {create_resp.text}"
    created_plan = create_resp.json()
    plan_id = created_plan.get("id")
    assert plan_id, "Failed to get content plan id for deletion"

    try:
        # Delete the content plan by id
        delete_resp = session.delete(
            f"{BASE_URL}{CONTENT_PLANS_PATH}/{plan_id}",
            timeout=TIMEOUT
        )
        assert delete_resp.status_code == 200, f"Delete content plan failed: {delete_resp.text}"
        json_resp = delete_resp.json()
        # According to PRD, response schema for DELETE /api/content-plans/:id is { success: true }
        assert json_resp.get("success") is True, f"Delete content plan not successful: {json_resp}"
    finally:
        # Cleanup: Make sure no residual plan remains (ignore errors)
        try:
            session.delete(f"{BASE_URL}{CONTENT_PLANS_PATH}/{plan_id}", timeout=TIMEOUT)
        except Exception:
            pass

test_TC035_delete_content_plan_admin()
