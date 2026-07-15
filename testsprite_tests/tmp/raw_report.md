
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** contentflow
- **Date:** 2026-07-15
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Login dengan kredensial valid
- **Test Code:** [TC001_Login_dengan_kredensial_valid.py](./TC001_Login_dengan_kredensial_valid.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/25b9e316-6560-4a2f-9ed0-68ccd5f68ddd
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Login dengan password salah
- **Test Code:** [TC002_Login_dengan_password_salah.py](./TC002_Login_dengan_password_salah.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/cd10b8ac-d4aa-4ee3-96f3-480365f89ce4
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Get current user session
- **Test Code:** [TC003_Get_current_user_session.py](./TC003_Get_current_user_session.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/e2bac710-0983-4922-8045-743afdb162c0
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Logout user
- **Test Code:** [TC004_Logout_user.py](./TC004_Logout_user.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/c7a7d530-e50b-4b12-ac18-578b71edf985
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Dashboard KPIs
- **Test Code:** [TC005_Dashboard_KPIs.py](./TC005_Dashboard_KPIs.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/bd41d8b8-ef31-4193-a434-cad9c2f9f3f1
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Create content draft
- **Test Code:** [TC006_Create_content_draft.py](./TC006_Create_content_draft.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 66, in <module>
  File "<string>", line 22, in test_create_content_draft
AssertionError: Login failed with status 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/c85d50ef-933e-4dd7-86cf-d87795494cec
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 List contents
- **Test Code:** [TC007_List_contents.py](./TC007_List_contents.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 46, in <module>
  File "<string>", line 19, in test_tc007_list_contents
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/ff65ea88-abdf-4dda-bc60-b29ed8273574
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Get content detail
- **Test Code:** [TC008_Get_content_detail.py](./TC008_Get_content_detail.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 63, in <module>
  File "<string>", line 15, in test_TC008_get_content_detail
AssertionError: Login failed, status code 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/8d2689a2-773a-4c7d-a333-2207f8080f57
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Update content
- **Test Code:** [TC009_Update_content.py](./TC009_Update_content.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 75, in <module>
  File "<string>", line 23, in test_TC009_update_content
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/1410125b-7a5a-4926-aa97-6e89d461bf8a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Get brands list
- **Test Code:** [TC010_Get_brands_list.py](./TC010_Get_brands_list.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 41, in <module>
  File "<string>", line 20, in test_TC010_get_brands_list
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/9f39f3ca-9d24-40a0-88fb-1da28b30a246
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Create brand
- **Test Code:** [TC011_Create_brand.py](./TC011_Create_brand.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 44, in <module>
  File "<string>", line 21, in test_create_brand
AssertionError: Login failed with status 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/d5429584-d67d-4c81-8b97-ac5707e3e879
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Switch active brand
- **Test Code:** [TC012_Switch_active_brand.py](./TC012_Switch_active_brand.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 43, in <module>
  File "<string>", line 16, in test_switch_active_brand
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/98811915-ba7d-4204-b418-ee8a4d53c737
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Get brand members
- **Test Code:** [TC013_Get_brand_members.py](./TC013_Get_brand_members.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 59, in <module>
  File "<string>", line 15, in test_get_brand_members
AssertionError

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/21b62b64-cdc2-468b-9c57-2906a60daa65
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Add brand member
- **Test Code:** [TC014_Add_brand_member.py](./TC014_Add_brand_member.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 83, in <module>
  File "<string>", line 15, in test_add_brand_member
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/17f24969-fb4c-40d0-8ca4-c5cc8147bb9c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Create user (admin)
- **Test Code:** [TC015_Create_user_admin.py](./TC015_Create_user_admin.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 71, in <module>
  File "<string>", line 24, in test_TC015_create_user_admin
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/ea586ade-cb33-4bb9-9347-07963b204ee8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 List users (admin)
- **Test Code:** [TC016_List_users_admin.py](./TC016_List_users_admin.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 33, in <module>
  File "<string>", line 17, in test_TC016_list_users_admin
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/130d1f03-b6a1-4380-90a3-2183946163f8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Delete user (admin)
- **Test Code:** [TC017_Delete_user_admin.py](./TC017_Delete_user_admin.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 66, in <module>
  File "<string>", line 19, in test_delete_user_as_admin
AssertionError: Login failed with status 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/818bf405-e41a-45d3-bb62-4de118c108ba
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 Create content plan
- **Test Code:** [TC018_Create_content_plan.py](./TC018_Create_content_plan.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 49, in <module>
  File "<string>", line 17, in test_TC018_create_content_plan
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/5e0998b5-c6a5-4359-9921-1cbe05b2e4d8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 List content plans
- **Test Code:** [TC019_List_content_plans.py](./TC019_List_content_plans.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 46, in <module>
  File "<string>", line 16, in test_tc019_list_content_plans
AssertionError: Login failed with status 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/b11be02d-c4f9-4cc3-9dcd-97708e8ba812
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Update content plan
- **Test Code:** [TC020_Update_content_plan.py](./TC020_Update_content_plan.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 72, in <module>
  File "<string>", line 24, in test_update_content_plan
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/3167a1ca-301e-4939-974f-d67642a99ad4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021 Create promo
- **Test Code:** [TC021_Create_promo.py](./TC021_Create_promo.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 67, in <module>
  File "<string>", line 19, in test_TC021_create_promo
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/fa0678c1-0e87-4872-90c1-fe6c82d0e0a3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022 List promos
- **Test Code:** [TC022_List_promos.py](./TC022_List_promos.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 38, in <module>
  File "<string>", line 18, in test_TC022_list_promos
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/c342100e-c676-44cc-83f3-63f4d5cdb913
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023 List content folders
- **Test Code:** [TC023_List_content_folders.py](./TC023_List_content_folders.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 51, in <module>
  File "<string>", line 22, in test_list_content_folders
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/2aaeadf9-e038-40a2-b494-f48dc4510703
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Create folder
- **Test Code:** [TC024_Create_folder.py](./TC024_Create_folder.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 57, in <module>
  File "<string>", line 18, in test_create_folder
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/829862bf-0f0f-48cc-9719-517798cde176
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC025 Get notifications
- **Test Code:** [TC025_Get_notifications.py](./TC025_Get_notifications.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 39, in <module>
  File "<string>", line 17, in test_tc025_get_notifications
AssertionError: Login failed with status 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/f0f56f48-3c0e-4cd2-9636-6dbdadc03170
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC026 Get trends
- **Test Code:** [TC026_Get_trends.py](./TC026_Get_trends.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 31, in <module>
  File "<string>", line 16, in test_get_trends
AssertionError: Login failed with status 429

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/429eb34a-c6d7-4a88-8955-23ea10720db2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC027 Create manual trend
- **Test Code:** [TC027_Create_manual_trend.py](./TC027_Create_manual_trend.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 58, in <module>
  File "<string>", line 19, in test_create_manual_trend
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/5360a727-feb5-4444-ab12-a0ef402b3756
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC028 Search content
- **Test Code:** [TC028_Search_content.py](./TC028_Search_content.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 36, in <module>
  File "<string>", line 19, in test_TC028_search_content
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/4a9acbca-1982-4412-b6d6-8c79ae4501af
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC029 Get activity logs
- **Test Code:** [TC029_Get_activity_logs.py](./TC029_Get_activity_logs.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 37, in <module>
  File "<string>", line 18, in test_tc029_get_activity_logs
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/e6332d99-a841-40f0-82f1-5d0452806782
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC030 Get team members
- **Test Code:** [TC030_Get_team_members.py](./TC030_Get_team_members.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/4afa9a63-e687-44ff-b779-f146599d8316
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC031 Get Canva templates
- **Test Code:** [TC031_Get_Canva_templates.py](./TC031_Get_Canva_templates.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 41, in <module>
  File "<string>", line 17, in test_get_canva_templates
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/e16874e6-b05b-40eb-adb2-3178cabcf518
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC032 Global search
- **Test Code:** [TC032_Global_search.py](./TC032_Global_search.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 60, in <module>
  File "<string>", line 17, in test_global_search
AssertionError: Login failed: {"error":"Terlalu banyak percobaan login. Coba lagi 1 menit."}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/5be8e5d7-a66e-4426-a646-4e5e7db21db4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC033 Bulk delete contents (admin)
- **Test Code:** [TC033_Bulk_delete_contents_admin.py](./TC033_Bulk_delete_contents_admin.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/81600c28-702a-4cda-8a22-d782c26a199a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC034 Bulk update content status (admin)
- **Test Code:** [TC034_Bulk_update_content_status_admin.py](./TC034_Bulk_update_content_status_admin.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/268d63e9-c157-495e-8106-3eda34cecba4
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC035 Delete content plan (admin)
- **Test Code:** [TC035_Delete_content_plan_admin.py](./TC035_Delete_content_plan_admin.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/dc74a277-4c89-46d1-811c-4df7d4c61146/2fd56a66-e52a-464a-812e-8350c6a25b35
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **25.71** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---