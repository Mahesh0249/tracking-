import os

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

mongo_kwargs = {"serverSelectionTimeoutMS": 20000}

# Atlas SRV connections rely on TLS; use certifi CA bundle for stable handshakes.
if MONGO_URI.startswith("mongodb+srv://"):
	mongo_kwargs["tlsCAFile"] = certifi.where()

client = MongoClient(MONGO_URI, **mongo_kwargs)
db = client["tracker"]
entries_collection = db["entries"]
users_collection = db["users"]
daily_reports_collection = db["daily_reports"]
profile_settings_collection = db["profile_settings"]
