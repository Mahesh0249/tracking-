import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = MongoClient(MONGO_URI)
db = client["tracker"]
entries_collection = db["entries"]
users_collection = db["users"]
daily_reports_collection = db["daily_reports"]
profile_settings_collection = db["profile_settings"]
