from firebase_admin import firestore
from datetime import datetime
from google.cloud.firestore_v1 import _helpers
from google.api_core.datetime_helpers import DatetimeWithNanoseconds


def firestore_to_dict(doc):
    """
    Convert Firestore DocumentSnapshot to a dict
    """
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def timestamp_to_iso(data):
    """
    Convert Firestore timestamps to ISO string format for JSON serialization
    """
    if isinstance(data, dict):
        for key, value in data.items():
            # Check for Firebase timestamp objects using the correct types
            if isinstance(value, (DatetimeWithNanoseconds, datetime)):
                data[key] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
            elif isinstance(value, dict) or isinstance(value, list):
                data[key] = timestamp_to_iso(value)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, dict) or isinstance(item, list):
                data[i] = timestamp_to_iso(item)
    return data


def create_server_timestamp():
    """
    Create a server timestamp
    """
    return firestore.SERVER_TIMESTAMP


def format_doc(doc):
    """
    Format a document from Firestore with proper id and timestamps
    """
    data = firestore_to_dict(doc)
    return timestamp_to_iso(data) 