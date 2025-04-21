from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import firebase_admin
from firebase_admin import firestore
from firebase import db
from middleware import get_current_user
from models import Subject, SubjectCreate, User, Note
from utils import format_doc, create_server_timestamp

router = APIRouter()


@router.get("/", response_model=List[Subject])
async def get_all_subjects(current_user: User = Depends(get_current_user)):
    """
    Get all subjects for the current user
    """
    try:
        # Query subjects created by the user
        subjects_ref = db.collection("subjects")
        query = subjects_ref.where("createdBy", "==", current_user["uid"]).order_by("createdAt", direction=firestore.Query.DESCENDING)
        subjects_docs = query.get()
        
        # Format and return the results
        subjects = [format_doc(doc) for doc in subjects_docs]
        return subjects
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subjects: {str(e)}"
        )


@router.get("/{subject_id}", response_model=Subject)
async def get_subject_by_id(subject_id: str, current_user: User = Depends(get_current_user)):
    """
    Get a specific subject by ID
    """
    try:
        subject_ref = db.collection("subjects").document(subject_id)
        subject_doc = subject_ref.get()
        
        if not subject_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found"
            )
        
        subject = format_doc(subject_doc)
        
        # Check if user has access to this subject
        if subject["createdBy"] != current_user["uid"]:
            # Check if it's shared with the user
            shares_ref = db.collection("shares")
            query = shares_ref.where("itemId", "==", subject_id).where("itemType", "==", "subject")
            
            # Check for public shares
            public_query = query.where("shareType", "==", "public")
            public_shares = public_query.get()
            
            # Check for specific shares
            specific_query = query.where("shareType", "==", "specific").where("sharedWith", "array_contains", current_user["email"])
            specific_shares = specific_query.get()
            
            if len(list(public_shares)) == 0 and len(list(specific_shares)) == 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this subject"
                )
        
        return subject
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subject: {str(e)}"
        )


@router.post("/", response_model=Subject)
async def create_subject(subject: SubjectCreate, current_user: User = Depends(get_current_user)):
    """
    Create a new subject
    """
    try:
        # Prepare subject data
        subject_data = subject.dict()
        subject_data["createdBy"] = current_user["uid"]
        subject_data["createdAt"] = create_server_timestamp()
        subject_data["updatedAt"] = create_server_timestamp()
        
        # Add to Firestore
        subject_ref = db.collection("subjects").document()
        subject_ref.set(subject_data)
        
        # Get the newly created subject
        created_subject = subject_ref.get()
        return format_doc(created_subject)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subject: {str(e)}"
        )


@router.put("/{subject_id}", response_model=Subject)
async def update_subject(subject_id: str, subject_data: SubjectCreate, current_user: User = Depends(get_current_user)):
    """
    Update a subject
    """
    try:
        # Check if subject exists and user owns it
        subject_ref = db.collection("subjects").document(subject_id)
        subject_doc = subject_ref.get()
        
        if not subject_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found"
            )
        
        subject = format_doc(subject_doc)
        if subject["createdBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this subject"
            )
        
        # Update the subject
        update_data = subject_data.dict()
        update_data["updatedAt"] = create_server_timestamp()
        
        subject_ref.update(update_data)
        
        # Get updated subject
        updated_subject = subject_ref.get()
        return format_doc(updated_subject)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subject: {str(e)}"
        )


@router.delete("/{subject_id}")
async def delete_subject(subject_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a subject and all its notes
    """
    try:
        # Check if subject exists and user owns it
        subject_ref = db.collection("subjects").document(subject_id)
        subject_doc = subject_ref.get()
        
        if not subject_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found"
            )
        
        subject = format_doc(subject_doc)
        if subject["createdBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this subject"
            )
        
        # Delete all notes in this subject
        notes_ref = db.collection("notes")
        notes_query = notes_ref.where("subjectId", "==", subject_id)
        notes_docs = notes_query.get()
        
        batch = db.batch()
        for note_doc in notes_docs:
            batch.delete(note_doc.reference)
        
        # Delete any shares for this subject
        shares_ref = db.collection("shares")
        shares_query = shares_ref.where("itemId", "==", subject_id).where("itemType", "==", "subject")
        shares_docs = shares_query.get()
        
        for share_doc in shares_docs:
            batch.delete(share_doc.reference)
        
        # Delete the subject
        batch.delete(subject_ref)
        batch.commit()
        
        return {"message": f"Subject with ID {subject_id} and all its notes have been deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete subject: {str(e)}"
        )


@router.get("/{subject_id}/notes", response_model=List[Note])
async def get_notes_for_subject(subject_id: str, current_user: User = Depends(get_current_user)):
    """
    Get all notes for a subject
    """
    try:
        # First verify access to the subject
        await get_subject_by_id(subject_id, current_user)
        
        # Get all notes for this subject
        notes_ref = db.collection("notes")
        query = notes_ref.where("subjectId", "==", subject_id).order_by("updatedAt", direction=firestore.Query.DESCENDING)
        notes_docs = query.get()
        
        # Format and return the results
        notes = [format_doc(doc) for doc in notes_docs]
        return notes
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notes: {str(e)}"
        ) 