# Backend Setup

## Configure MongoDB Atlas

1. Create a file named `.env` inside this folder.
2. Add your MongoDB Atlas connection string:

MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<app-name>

## Run

Use your workspace virtual environment and run:

../.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000

The app reads `MONGO_URI` from environment variables. If not set, it falls back to local MongoDB.
