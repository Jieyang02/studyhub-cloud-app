from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import firebase_admin
from firebase_admin import firestore
from firebase import db
from middleware import get_current_user
from models import Note, NoteCreate, User
from utils import format_doc, create_server_timestamp
from routers.subjects import get_subject_by_id

router = APIRouter()


@router.get("/", response_model=List[Note])
async def get_recent_notes(limit: int = 10, current_user: User = Depends(get_current_user)):
    """
    Get recent notes across all subjects for the current user
    """
    try:
        notes_ref = db.collection("notes")
        query = notes_ref.where("createdBy", "==", current_user["uid"]).order_by("updatedAt", direction=firestore.Query.DESCENDING).limit(limit)
        notes_docs = query.get()
        
        # Format and return the results
        notes = [format_doc(doc) for doc in notes_docs]
        return notes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent notes: {str(e)}"
        )


@router.get("/{note_id}", response_model=Note)
async def get_note_by_id(note_id: str, current_user: User = Depends(get_current_user)):
    """
    Get a specific note by ID
    """
    try:
        note_ref = db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with ID {note_id} not found"
            )
        
        note = format_doc(note_doc)
        
        # Check if user has access to this note
        # First, check if they're the owner
        if note["createdBy"] == current_user["uid"]:
            return note
        
        # Next, check if they have access to the parent subject
        try:
            await get_subject_by_id(note["subjectId"], current_user)
            return note
        except HTTPException:
            pass
        
        # Lastly, check if the note is specifically shared with the user
        shares_ref = db.collection("shares")
        query = shares_ref.where("itemId", "==", note_id).where("itemType", "==", "note")
        
        # Check for public shares
        public_query = query.where("shareType", "==", "public")
        public_shares = public_query.get()
        
        # Check for specific shares
        specific_query = query.where("shareType", "==", "specific").where("sharedWith", "array_contains", current_user["email"])
        specific_shares = specific_query.get()
        
        if len(list(public_shares)) == 0 and len(list(specific_shares)) == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this note"
            )
        
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch note: {str(e)}"
        )


@router.post("/", response_model=Note)
async def create_note(note: NoteCreate, current_user: User = Depends(get_current_user)):
    """
    Create a new note
    """
    try:
        # First check if user has access to the subject
        await get_subject_by_id(note.subjectId, current_user)
        
        # Prepare note data
        note_data = note.dict()
        note_data["createdBy"] = current_user["uid"]
        note_data["createdAt"] = create_server_timestamp()
        note_data["updatedAt"] = create_server_timestamp()
        note_data["isShared"] = False
        
        # Add to Firestore
        note_ref = db.collection("notes").document()
        note_ref.set(note_data)
        
        # Get the newly created note
        created_note = note_ref.get()
        return format_doc(created_note)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create note: {str(e)}"
        )


@router.put("/{note_id}", response_model=Note)
async def update_note(note_id: str, note_data: NoteCreate, current_user: User = Depends(get_current_user)):
    """
    Update a note
    """
    try:
        # Check if note exists and user owns it
        note_ref = db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with ID {note_id} not found"
            )
        
        note = format_doc(note_doc)
        if note["createdBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this note"
            )
        
        # Check if the subject exists and user has access
        await get_subject_by_id(note_data.subjectId, current_user)
        
        # Update the note
        update_data = note_data.dict()
        update_data["updatedAt"] = create_server_timestamp()
        
        note_ref.update(update_data)
        
        # Get updated note
        updated_note = note_ref.get()
        return format_doc(updated_note)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update note: {str(e)}"
        )


@router.delete("/{note_id}")
async def delete_note(note_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a note
    """
    try:
        # Check if note exists and user owns it
        note_ref = db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Note with ID {note_id} not found"
            )
        
        note = format_doc(note_doc)
        if note["createdBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this note"
            )
        
        # Delete any shares for this note
        shares_ref = db.collection("shares")
        shares_query = shares_ref.where("itemId", "==", note_id).where("itemType", "==", "note")
        shares_docs = shares_query.get()
        
        batch = db.batch()
        for share_doc in shares_docs:
            batch.delete(share_doc.reference)
        
        # Delete the note
        batch.delete(note_ref)
        batch.commit()
        
        return {"message": f"Note with ID {note_id} has been deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete note: {str(e)}"
        ) 