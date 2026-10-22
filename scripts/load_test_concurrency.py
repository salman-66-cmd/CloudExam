"""
CloudExam Concurrency & Stress Testing Tool
Demonstrates horizontal scalability and concurrent request handling during examination sessions.
Simulates multiple concurrent students logging in, starting an exam, saving answers concurrently, and submitting.
"""

import asyncio
import time
import httpx
from typing import List, Dict

BASE_URL = "http://127.0.0.1:8008/api/v1"

async def simulate_student_exam_session(client: httpx.AsyncClient, student_index: int, exam_id: int):
    start_time = time.time()
    # 1. Login
    login_resp = await client.post(f"{BASE_URL}/auth/login", json={
        "username_or_email": "student@cloudexam.edu",
        "password": "Student123!"
    })
    if login_resp.status_code != 200:
        return {"student": student_index, "status": "LOGIN_FAILED", "duration": time.time() - start_time}

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Start/Resume Attempt
    att_resp = await client.post(f"{BASE_URL}/attempts/exams/{exam_id}/attempts", headers=headers)
    if att_resp.status_code != 200:
        return {"student": student_index, "status": "ATTEMPT_START_FAILED", "detail": att_resp.text, "duration": time.time() - start_time}

    attempt_id = att_resp.json()["attempt_id"]

    # 3. Fetch state
    state_resp = await client.get(f"{BASE_URL}/attempts/{attempt_id}", headers=headers)
    questions = state_resp.json().get("questions", [])

    # 4. Concurrent Autosaves
    for q in questions[:3]:
        opt_ids = [opt["id"] for opt in q.get("options", [])[:1]]
        await client.put(
            f"{BASE_URL}/attempts/{attempt_id}/answers/{q['id']}",
            json={"selected_option_ids": opt_ids, "text_response": "Sample stress answer", "is_marked_for_review": False},
            headers=headers
        )

    # 5. Submit
    sub_resp = await client.post(f"{BASE_URL}/attempts/{attempt_id}/submit", headers=headers)
    success = sub_resp.status_code == 200

    return {
        "student": student_index,
        "status": "SUCCESS" if success else "SUBMIT_FAILED",
        "duration": round(time.time() - start_time, 3)
    }

async def run_load_test(concurrency: int = 15):
    print(f"\n=======================================================")
    print(f"Starting CloudExam Concurrency Test: {concurrency} Synthetic Candidates")
    print(f"=======================================================\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Check health
        health = await client.get(f"{BASE_URL}/system/health")
        print(f"Cluster Status: {health.json()}")

        # Fetch active exams
        login_res = await client.post(f"{BASE_URL}/auth/login", json={
            "username_or_email": "admin@cloudexam.edu",
            "password": "Admin123!"
        })
        token = login_res.json()["access_token"]
        exams = (await client.get(f"{BASE_URL}/exams/", headers={"Authorization": f"Bearer {token}"})).json()
        if not exams:
            print("No exams found to load test.")
            return

        target_exam_id = exams[0]["id"]
        print(f"Target Examination: ID {target_exam_id} ('{exams[0]['title']}')")

        t0 = time.time()
        tasks = [
            simulate_student_exam_session(client, i, target_exam_id)
            for i in range(1, concurrency + 1)
        ]
        results = await asyncio.gather(*tasks)
        total_time = round(time.time() - t0, 3)

        successful = [r for r in results if r["status"] == "SUCCESS"]
        failed = [r for r in results if r["status"] != "SUCCESS"]

        print(f"\n=======================================================")
        print(f"Concurrency Test Results:")
        print(f"Total Requests Dispatched: {concurrency * 6}")
        print(f"Total Duration:            {total_time}s")
        print(f"Successful Sessions:       {len(successful)} / {concurrency}")
        print(f"Throughput:                {round(len(successful) / total_time, 2)} sessions/sec")
        if successful:
            avg_lat = round(sum(r['duration'] for r in successful) / len(successful), 3)
            print(f"Average Candidate Latency: {avg_lat}s")
        print(f"=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_load_test(15))
