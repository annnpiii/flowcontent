import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
CREATE_CONTENT_URL = f"{BASE_URL}/api/contents"
BULK_DELETE_URL = f"{BASE_URL}/api/contents/bulk"
DELETE_CONTENT_URL_TEMPLATE = f"{BASE_URL}/api/contents/{{content_id}}"

AUTH_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}


def test_TC033_bulk_delete_contents_admin():
    session = requests.Session()
    content_ids = []
    try:
        # Login as admin
        login_resp = session.post(
            LOGIN_URL,
            json=AUTH_CREDENTIALS,
            timeout=30
        )
        assert login_resp.status_code == 200
        login_json = login_resp.json()
        assert "user" in login_json
        assert "brands" in login_json
        assert "activeBrandId" in login_json

        # Create two new content drafts to have IDs to delete
        for i in range(2):
            content_payload = {
                "title": f"Test content bulk delete {i+1}",
                "caption": f"Caption for test content bulk delete {i+1}",
                "platform": "facebook",
                "posting_date": "2026-07-20",
                "posting_time": "12:00"
            }
            create_resp = session.post(
                CREATE_CONTENT_URL,
                json=content_payload,
                timeout=30
            )
            assert create_resp.status_code == 200
            create_json = create_resp.json()
            assert create_json.get("ok") is True
            assert "id" in create_json
            content_ids.append(create_json["id"])

        # Perform bulk delete for the created content IDs
        bulk_delete_payload = {
            "ids": content_ids
        }
        bulk_delete_resp = session.delete(
            BULK_DELETE_URL,
            json=bulk_delete_payload,
            timeout=30
        )
        assert bulk_delete_resp.status_code == 200
        bulk_delete_json = bulk_delete_resp.json()
        assert bulk_delete_json.get("success") is True
        assert isinstance(bulk_delete_json.get("deleted"), int)
        assert bulk_delete_json.get("deleted") == len(content_ids)

    finally:
        # Cleanup: In case bulk delete failed, try to delete individually
        for cid in content_ids:
            try:
                del_resp = session.delete(
                    DELETE_CONTENT_URL_TEMPLATE.format(content_id=cid),
                    timeout=30
                )
                # Accept 200 or 404 if already deleted
                assert del_resp.status_code in (200, 404)
            except Exception:
                pass


test_TC033_bulk_delete_contents_admin()
