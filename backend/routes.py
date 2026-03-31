from datetime import date, datetime, timedelta
import hashlib
import json
import os
import re
from typing import List
from urllib import request as urllib_request

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db import (
    daily_reports_collection,
    entries_collection,
    profile_settings_collection,
    users_collection,
)

router = APIRouter()

DAY_HEADER_RE = re.compile(r"^day\s+(\d+)\s*:?$", re.IGNORECASE)


class AddEntryRequest(BaseModel):
    topic: str


class ParsePlanRequest(BaseModel):
    text: str


class GeneratePlanRequest(BaseModel):
    duration_days: int = 120
    focus_areas: str = "DSA, FastAPI, React"
    daily_hours: float = 3


LOCKED_PLACEMENT_PROMPT = """You are an expert placement mentor.

Your task is to create a fully detailed personalized adaptive study plan for placement preparation.

---

STEP 1: INPUT COLLECTION (STRICT INTERACTIVE MODE)

You MUST ask ONLY ONE question at a time.

Rules:

* Ask ONE question
* WAIT for my response
* Then ask the next
* Do NOT ask multiple questions together
* Do NOT generate the plan yet

Ask in this EXACT order:

1. What is your total duration for preparation (number of days)?
2. What is your placement goal? (Product-based / Service-based / specific companies)
3. How many hours can you study daily?
4. What is your current level? (Beginner / Intermediate / Advanced)
5. What are your strong areas?
6. What are your weak areas?
7. What topics have you already completed?
8. What tech stack do you prefer?
9. What type of focus do you want? (DSA / Development / Balanced)
10. Any constraints?

---

STEP 2: VALIDATION

* Ensure all inputs are clear
* If anything is vague or incomplete -> ask follow-up questions (ONLY ONE at a time)
* Proceed ONLY when all inputs are clearly defined

---

STEP 3: PLAN GENERATION (INTERACTIVE OUTPUT MODE)

CRITICAL RULES:

1. DO NOT GENERATE FULL PLAN AT ONCE

* Generate ONLY 5-10 days at a time
* After each batch, STOP and ask:

\"Do you want me to continue with the next set of days?\"

* WAIT for user response before continuing

---

2. OUTPUT FORMAT (STRICT - DO NOT CHANGE)

Each day MUST follow EXACTLY this format:

Day X:

* Solve: <Problem Name (LC number)>, <Problem Name (LC number)>, <Problem Name (LC number)>
* Core: <topic>
* Tech: <task>
* Extra: <revision/practice>

---

3. DSA RULES (VERY IMPORTANT)

* ALWAYS include exact LeetCode problems with IDs
* 2-4 problems per day (based on difficulty)
* Problems MUST match the topic of that day
* Follow STRICT progression:

Arrays
-> Sliding Window
-> Two Pointers
-> Recursion
-> Trees
-> Graphs
-> Dynamic Programming

* DO NOT skip order
* DO NOT jump topics randomly

---

4. STRICT QUALITY RULES

* NO generic words like:
    -> \"practice problems\"
    -> \"mixed problems\"
    -> \"solve questions\"

* ALWAYS list exact problems

* NO repetition of LeetCode problems across entire plan

* Maintain internal tracking of used problems

* Weak areas must appear MORE frequently

* Strong areas can appear less frequently

---

5. CORE SUBJECT RULE (MANDATORY DAILY)

Rotate evenly across:

* Operating Systems (OS)
* Database Management Systems (DBMS)
* Computer Networks (CN)
* Object-Oriented Programming (OOP)

---

6. TECH / PROJECT WORK (MANDATORY DAILY)

Every day MUST include:

* FastAPI backend work
* Database usage (SQLite/PostgreSQL)
* API building
* Authentication / middleware / optimization
* AI/ML integration gradually

Progression:
Basic APIs -> CRUD -> Auth -> DB -> Project -> AI integration -> Deployment

---

7. REALISTIC LOAD

* Maximum 4 tasks per day:

    1. DSA
    2. Core
    3. Tech
    4. Extra

* Match difficulty with:
    -> Beginner level
    -> 4 hours/day constraint

---

8. REVISION RULE

* Include periodic revision days
* During revision:
    DO NOT reuse same problems
    Use NEW problems from same patterns

---

STEP 4: CONTINUATION RULE

After every batch (5-10 days):

* STOP immediately
* Ask:

\"Do you want me to continue with the next set of days?\"

* ONLY continue after user says YES

---

STEP 5: FINAL COMPLETION

When all days are generated:

* End with:

\"Plan completed.\"

---

ABSOLUTE RULES (DO NOT BREAK):

* Do NOT generate all days at once
* Do NOT skip any day
* Do NOT summarize
* Do NOT reduce detail
* Do NOT repeat problems
* Do NOT add explanations outside the format

ONLY output:
-> Structured daily plan
-> Continuation question after each batch"""


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class DailyReportRequest(BaseModel):
    dsa_topic: str = ""
    dsa_problems_solved: int = 0
    study_hours: float = 0
    problems_learned_today: str = ""
    oops_topic: str = ""
    cn_topic: str = ""
    other_topics: str = ""
    technologies_learned: str = ""
    mood: str = "😐"


class ProfileSettingsRequest(BaseModel):
    email: str
    study_start_date: str
    daily_target_hours: float = 2
    dsa_daily_goal: int = 3
    weekly_dsa_target: int = 20
    placement_target_date: str = ""
    weekly_off_day: str = "Sunday"


def _compute_consecutive_streak(dates: List[date]) -> int:
    if not dates:
        return 0

    unique_dates = sorted(set(dates), reverse=True)
    streak = 1
    current = unique_dates[0]

    for date_value in unique_dates[1:]:
        if current - date_value == timedelta(days=1):
            streak += 1
            current = date_value
        else:
            break

    return streak


@router.post("/add")
def add_entry(payload: AddEntryRequest):
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    today = datetime.now().strftime("%Y-%m-%d")
    result = entries_collection.insert_one({"date": today, "topic": topic})

    return {"message": "Entry added", "id": str(result.inserted_id)}


@router.get("/entries")
def get_entries():
    docs = list(entries_collection.find({}, {"topic": 1, "date": 1}).sort("date", -1))

    entries = [
        {
            "_id": str(doc["_id"]),
            "date": doc.get("date", ""),
            "topic": doc.get("topic", ""),
        }
        for doc in docs
    ]

    return entries


@router.get("/streak")
def get_streak():
    docs = list(entries_collection.find({}, {"date": 1}))
    if not docs:
        return {"streak": 0}

    unique_dates = sorted(
        {datetime.strptime(doc["date"], "%Y-%m-%d").date() for doc in docs if doc.get("date")},
        reverse=True,
    )

    if not unique_dates:
        return {"streak": 0}

    return {"streak": _compute_consecutive_streak(unique_dates)}


@router.post("/parse-plan")
def parse_plan(payload: ParsePlanRequest):
    lines = [line.strip() for line in payload.text.splitlines() if line.strip()]

    result: List[dict] = []
    current_day = None

    def append_labeled_tasks(day_obj: dict, label: str, value: str):
        cleaned_label = label.strip().lower()
        cleaned_value = value.strip()
        if not cleaned_value:
            return

        if cleaned_label == "solve":
            solve_items = [item.strip() for item in cleaned_value.split(",") if item.strip()]
            for item in solve_items:
                day_obj["tasks"].append(f"Solve: {item}")
            return

        label_map = {
            "core": "Core",
            "tech": "Tech",
            "extra": "Extra",
        }
        normalized = label_map.get(cleaned_label, label.strip().title())
        day_obj["tasks"].append(f"{normalized}: {cleaned_value}")

    for line in lines:
        day_match = DAY_HEADER_RE.match(line)
        if day_match:
            current_day = {"day": int(day_match.group(1)), "tasks": []}
            result.append(current_day)
            continue

        if current_day is None:
            continue

        # Legacy bullet format support:
        if line.startswith("-") and current_day is not None:
            task = line[1:].strip()
            if task:
                current_day["tasks"].append(task)
            continue

        # New ChatGPT format support:
        # Solve: a, b, c
        # Core: ...
        # Tech: ...
        # Extra: ...
        if ":" in line:
            label, value = line.split(":", 1)
            if label.strip():
                append_labeled_tasks(current_day, label, value)
                continue

        current_day["tasks"].append(line)

    return result


@router.post("/generate-plan")
def generate_plan(payload: GeneratePlanRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    prompt = LOCKED_PLACEMENT_PROMPT

    if not api_key:
        return {
            "plan_text": (
                "Day 1:\n"
                "Solve: Two Sum (1), Best Time to Buy and Sell Stock (121), Maximum Subarray (53)\n"
                "Core: OS Introduction + Process Concept\n"
                "Tech: Install Python, setup virtual environment, create basic FastAPI app\n"
                "Extra: Revise array basics\n\n"
                "Day 2:\n"
                "Solve: Contains Duplicate (217), Move Zeroes (283), Maximum Product Subarray (152)\n"
                "Core: OS Process States + PCB\n"
                "Tech: Create GET and POST APIs in FastAPI\n"
                "Extra: Practice array traversal patterns"
            )
        }

    body = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 1800,
        "messages": [{"role": "user", "content": prompt}],
    }

    req = urllib_request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {exc}") from exc

    content = result.get("content", [])
    if not content:
        raise HTTPException(status_code=500, detail="No plan generated")

    plan_text = content[0].get("text", "")
    return {"plan_text": plan_text}


@router.post("/signup")
def signup(payload: SignupRequest):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password.strip()

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="All fields are required")

    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    users_collection.insert_one(
        {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "created_at": datetime.utcnow().isoformat(),
        }
    )

    return {"message": "Signup successful"}


@router.post("/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    password = payload.password.strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if user.get("password_hash") != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "message": "Login successful",
        "user": {"name": user.get("name", ""), "email": user.get("email", "")},
    }


@router.post("/daily-report")
def upsert_daily_report(payload: DailyReportRequest):
    if payload.dsa_problems_solved < 0:
        raise HTTPException(status_code=400, detail="Problem count cannot be negative")
    if payload.study_hours < 0:
        raise HTTPException(status_code=400, detail="Study hours cannot be negative")

    today = datetime.now().strftime("%Y-%m-%d")
    doc = {
        "date": today,
        "dsa_topic": payload.dsa_topic.strip(),
        "dsa_problems_solved": payload.dsa_problems_solved,
        "study_hours": payload.study_hours,
        "problems_learned_today": payload.problems_learned_today.strip(),
        "oops_topic": payload.oops_topic.strip(),
        "cn_topic": payload.cn_topic.strip(),
        "other_topics": payload.other_topics.strip(),
        "technologies_learned": payload.technologies_learned.strip(),
        "mood": payload.mood.strip() or "😐",
        "updated_at": datetime.utcnow().isoformat(),
    }

    daily_reports_collection.update_one({"date": today}, {"$set": doc}, upsert=True)
    return {"message": "Daily report saved", "date": today}


@router.get("/daily-reports")
def get_daily_reports():
    docs = list(
        daily_reports_collection.find(
            {},
            {
                "date": 1,
                "dsa_topic": 1,
                "dsa_problems_solved": 1,
                "study_hours": 1,
                "problems_learned_today": 1,
                "oops_topic": 1,
                "cn_topic": 1,
                "other_topics": 1,
                "technologies_learned": 1,
                "mood": 1,
            },
        ).sort("date", -1)
    )

    return [
        {
            "_id": str(doc.get("_id", "")),
            "date": doc.get("date", ""),
            "dsa_topic": doc.get("dsa_topic", ""),
            "dsa_problems_solved": doc.get("dsa_problems_solved", 0),
            "study_hours": doc.get("study_hours", 0),
            "problems_learned_today": doc.get("problems_learned_today", ""),
            "oops_topic": doc.get("oops_topic", ""),
            "cn_topic": doc.get("cn_topic", ""),
            "other_topics": doc.get("other_topics", ""),
            "technologies_learned": doc.get("technologies_learned", ""),
            "mood": doc.get("mood", "😐"),
        }
        for doc in docs
    ]


@router.delete("/daily-report/{date_value}")
def delete_daily_report(date_value: str):
    result = daily_reports_collection.delete_one({"date": date_value})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted", "date": date_value}


@router.get("/dsa-streak")
def get_dsa_streak():
    docs = list(daily_reports_collection.find({"dsa_problems_solved": {"$gt": 0}}, {"date": 1}))
    dates = [
        datetime.strptime(doc["date"], "%Y-%m-%d").date()
        for doc in docs
        if isinstance(doc.get("date"), str)
    ]
    return {"dsa_streak": _compute_consecutive_streak(dates)}


@router.get("/profile-summary")
def get_profile_summary():
    reports = list(
        daily_reports_collection.find({}, {"dsa_problems_solved": 1, "technologies_learned": 1, "study_hours": 1})
    )
    total_days = len(reports)
    total_dsa_problems = sum(int(doc.get("dsa_problems_solved", 0)) for doc in reports)
    total_hours = sum(float(doc.get("study_hours", 0)) for doc in reports)

    technologies = []
    for doc in reports:
        value = doc.get("technologies_learned", "")
        if not value:
            continue
        parts = [part.strip() for part in value.split(",") if part.strip()]
        technologies.extend(parts)

    unique_tech = sorted(set(technologies))

    return {
        "total_days_tracked": total_days,
        "total_dsa_problems": total_dsa_problems,
        "total_study_hours": round(total_hours, 2),
        "technologies_count": len(unique_tech),
        "technologies": unique_tech,
    }


@router.post("/profile-settings")
def save_profile_settings(payload: ProfileSettingsRequest):
    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    settings_doc = {
        "email": email,
        "study_start_date": payload.study_start_date.strip(),
        "daily_target_hours": payload.daily_target_hours,
        "dsa_daily_goal": payload.dsa_daily_goal,
        "weekly_dsa_target": payload.weekly_dsa_target,
        "placement_target_date": payload.placement_target_date.strip(),
        "weekly_off_day": payload.weekly_off_day.strip() or "Sunday",
        "updated_at": datetime.utcnow().isoformat(),
    }

    profile_settings_collection.update_one({"email": email}, {"$set": settings_doc}, upsert=True)
    return {"message": "Profile settings saved"}


@router.get("/profile-settings")
def get_profile_settings(email: str = Query(default="")):
    normalized_email = email.strip().lower()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email query parameter is required")

    doc = profile_settings_collection.find_one(
        {"email": normalized_email},
        {
            "email": 1,
            "study_start_date": 1,
            "daily_target_hours": 1,
            "dsa_daily_goal": 1,
            "weekly_dsa_target": 1,
            "placement_target_date": 1,
            "weekly_off_day": 1,
        },
    )

    if not doc:
        return {
            "email": normalized_email,
            "study_start_date": "",
            "daily_target_hours": 2,
            "dsa_daily_goal": 3,
            "weekly_dsa_target": 20,
            "placement_target_date": "",
            "weekly_off_day": "Sunday",
        }

    return {
        "email": doc.get("email", normalized_email),
        "study_start_date": doc.get("study_start_date", ""),
        "daily_target_hours": doc.get("daily_target_hours", 2),
        "dsa_daily_goal": doc.get("dsa_daily_goal", 3),
        "weekly_dsa_target": doc.get("weekly_dsa_target", 20),
        "placement_target_date": doc.get("placement_target_date", ""),
        "weekly_off_day": doc.get("weekly_off_day", "Sunday"),
    }
