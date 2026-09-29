from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DATABASE_NAME = "CallInsight"

client = MongoClient(MONGO_URI)

db = client[DATABASE_NAME]

calls_collection = db["calls"]


def test_connection():
    client.admin.command("ping")
    return True


def insert_call(call_data: dict):
    result = calls_collection.insert_one(call_data)
    return str(result.inserted_id)


def get_call(call_id: str):
    return calls_collection.find_one(
        {"call_id": call_id}
    )


def get_all_calls():
    return list(
        calls_collection.find(
            {},
            {
                "_id": 0,
                "call_id": 1,
                "transcript": 1,
            },
        )
    )