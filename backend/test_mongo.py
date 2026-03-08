import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

mongo_uri = os.environ.get("MONGODB_URI")
print("MONGO_URI =", mongo_uri)

client = MongoClient(mongo_uri)
db = client.get_database("wine_classifier")
collection = db.predictions

result = collection.insert_one({"test": True})
print("Inserted id:", result.inserted_id)
