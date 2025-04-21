import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
cred = credentials.Certificate(os.path.join(os.path.dirname(os.path.dirname(__file__)), cred_path))

firebase_app = firebase_admin.initialize_app(cred)
db = firestore.client()

def verify_id_token(id_token):
    """
    Verify the Firebase ID token
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None 