from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Set
import firebase_admin
from firebase_admin import firestore
from firebase import db
from middleware import get_current_user
from models import Note, User
from utils import format_doc
from routers.notes import get_note_by_id

router = APIRouter()


@router.get("/", response_model=List[str])
async def get_all_tags(current_user: User = Depends(get_current_user)):
    """
    Get all unique tags used by the current user
    """
    try:
        # Query notes created by the user
        notes_ref = db.collection("notes")
        query = notes_ref.where("createdBy", "==", current_user["uid"])
        notes_docs = query.get()
        
        # Extract all tags from user's notes
        all_tags: Set[str] = set()
        for note_doc in notes_docs:
            note = format_doc(note_doc)
            if "tags" in note and note["tags"]:
                for tag in note["tags"]:
                    all_tags.add(tag)
        
        # Return sorted list of unique tags
        return sorted(list(all_tags))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tags: {str(e)}"
        )


@router.get("/{tag}/notes", response_model=List[Note])
async def get_notes_by_tag(tag: str, current_user: User = Depends(get_current_user)):
    """
    Get all notes with a specific tag
    """
    try:
        # Query notes created by the user
        notes_ref = db.collection("notes")
        query = notes_ref.where("createdBy", "==", current_user["uid"]).where("tags", "array_contains", tag)
        notes_docs = query.get()
        
        # Format and return the results
        notes = [format_doc(doc) for doc in notes_docs]
        return notes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notes by tag: {str(e)}"
        )


@router.post("/{note_id}/{tag}")
async def add_tag_to_note(note_id: str, tag: str, current_user: User = Depends(get_current_user)):
    """
    Add a tag to a specific note
    """
    try:
        # Verify user has access to the note
        note = await get_note_by_id(note_id, current_user)
        
        # Check if user owns the note
        if note["createdBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add tags to this note"
            )
        
        # Get current tags
        current_tags = note.get("tags", [])
        
        # Add the tag if it doesn't already exist
        if tag not in current_tags:
            note_ref = db.collection("notes").document(note_id)
            note_ref.update({
                "tags": firestore.ArrayUnion([tag])
            })
            
            return {"message": f"Tag '{tag}' added to note"}
        else:
            return {"message": f"Tag '{tag}' already exists on this note"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add tag: {str(e)}"
        )


@router.delete("/{note_id}/{tag}")
async def remove_tag_from_note(note_id: str, tag: str, current_user: User = Depends(get_current_user)):
    """
    Remove a tag from a specific note
    """
    try:
        # Verify user has access to the note
        note = await get_note_by_id(note_id, current_user)
        
        # Check if user owns the note
        if note["createdBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to remove tags from this note"
            )
        
        # Get current tags
        current_tags = note.get("tags", [])
        
        # Remove the tag if it exists
        if tag in current_tags:
            note_ref = db.collection("notes").document(note_id)
            note_ref.update({
                "tags": firestore.ArrayRemove([tag])
            })
            
            return {"message": f"Tag '{tag}' removed from note"}
        else:
            return {"message": f"Tag '{tag}' does not exist on this note"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove tag: {str(e)}"
        ) 