from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import firebase_admin
from firebase_admin import firestore
from firebase import db
from middleware import get_current_user
from models import Share, ShareCreate, User
from utils import format_doc, create_server_timestamp
from routers.subjects import get_subject_by_id
from routers.notes import get_note_by_id

router = APIRouter()


@router.get("/with-me", response_model=List[Share])
async def get_shared_with_me(current_user: User = Depends(get_current_user)):
    """
    Get items shared with the current user directly from notes and subjects collections
    """
    try:
        combined_shares = []
        
        # Check subjects shared with the user
        subjects_ref = db.collection("subjects")
        subjects_shared_with_me = subjects_ref.where("sharedWith", "array_contains", current_user["email"]).get()
        
        for subject_doc in subjects_shared_with_me:
            subject = format_doc(subject_doc)
            combined_shares.append({
                "id": subject.get("id"),
                "itemId": subject.get("id"),
                "itemType": "subject",
                "shareType": subject.get("shareType", "specific"),
                "sharedWith": subject.get("sharedWith", []),
                "sharedBy": subject.get("sharedBy") or subject.get("createdBy") or "Unknown",
                "sharedAt": subject.get("updatedAt") or subject.get("createdAt"),
                "permissions": subject.get("permissions", {
                    "view": True,
                    "edit": False,
                    "comment": False,
                    "download": True,
                    "share": False
                })
            })
        
        # Check notes shared with the user
        notes_ref = db.collection("notes")
        notes_shared_with_me = notes_ref.where("sharedWith", "array_contains", current_user["email"]).get()
        
        for note_doc in notes_shared_with_me:
            note = format_doc(note_doc)
            combined_shares.append({
                "id": note.get("id"),
                "itemId": note.get("id"),
                "itemType": "note",
                "shareType": note.get("shareType", "specific"),
                "sharedWith": note.get("sharedWith", []),
                "sharedBy": note.get("sharedBy") or note.get("createdBy") or "Unknown",
                "sharedAt": note.get("updatedAt") or note.get("createdAt"),
                "permissions": note.get("permissions", {
                    "view": True,
                    "edit": False,
                    "comment": False,
                    "download": True,
                    "share": False
                })
            })
        
        # Also check for public items
        # Public subjects
        public_subjects = subjects_ref.where("shareType", "==", "public").get()
        public_subject_ids = set()
        
        for subject_doc in public_subjects:
            subject = format_doc(subject_doc)
            # Skip if this is a subject the user created
            if subject.get("createdBy") == current_user["uid"]:
                continue
                
            subject_id = subject.get("id")
            public_subject_ids.add(subject_id)
            
            # Add if not already in combined_shares
            if not any(share["itemId"] == subject_id and share["itemType"] == "subject" for share in combined_shares):
                combined_shares.append({
                    "id": subject_id,
                    "itemId": subject_id,
                    "itemType": "subject",
                    "shareType": "public",
                    "sharedWith": [],
                    "sharedBy": subject.get("sharedBy") or subject.get("createdBy") or "Unknown",
                    "sharedAt": subject.get("updatedAt") or subject.get("createdAt"),
                    "permissions": subject.get("permissions", {
                        "view": True,
                        "edit": False,
                        "comment": False,
                        "download": True,
                        "share": False
                    })
                })
        
        # Public notes
        public_notes = notes_ref.where("shareType", "==", "public").get()
        
        for note_doc in public_notes:
            note = format_doc(note_doc)
            # Skip if this is a note the user created
            if note.get("createdBy") == current_user["uid"]:
                continue
                
            note_id = note.get("id")
            
            # Add if not already in combined_shares
            if not any(share["itemId"] == note_id and share["itemType"] == "note" for share in combined_shares):
                combined_shares.append({
                    "id": note_id,
                    "itemId": note_id,
                    "itemType": "note",
                    "shareType": "public",
                    "sharedWith": [],
                    "sharedBy": note.get("sharedBy") or note.get("createdBy") or "Unknown",
                    "sharedAt": note.get("updatedAt") or note.get("createdAt"),
                    "permissions": note.get("permissions", {
                        "view": True,
                        "edit": False,
                        "comment": False,
                        "download": True,
                        "share": False
                    })
                })
        
        return combined_shares
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shared items: {str(e)}"
        )


@router.get("/by-me", response_model=List[Share])
async def get_shared_by_me(current_user: User = Depends(get_current_user)):
    """
    Get items shared by the current user directly from notes and subjects collections
    """
    try:
        combined_shares = []
        
        # Get subjects shared by the user
        subjects_ref = db.collection("subjects")
        # First check subjects created by the user that have sharedWith array
        subjects_shared_by_me = subjects_ref.where("createdBy", "==", current_user["uid"]).get()
        
        for subject_doc in subjects_shared_by_me:
            subject = format_doc(subject_doc)
            # Only include if it's shared with someone
            if (subject.get("shareType") == "public" or 
                (subject.get("sharedWith") and len(subject.get("sharedWith")) > 0)):
                combined_shares.append({
                    "id": subject.get("id"),
                    "itemId": subject.get("id"),
                    "itemType": "subject",
                    "shareType": subject.get("shareType", "specific"),
                    "sharedWith": subject.get("sharedWith", []),
                    "sharedBy": current_user["uid"],
                    "sharedAt": subject.get("updatedAt") or subject.get("createdAt"),
                    "permissions": subject.get("permissions", {
                        "view": True,
                        "edit": False,
                        "comment": False,
                        "download": True,
                        "share": False
                    })
                })
        
        # Get notes shared by the user
        notes_ref = db.collection("notes")
        notes_shared_by_me = notes_ref.where("createdBy", "==", current_user["uid"]).get()
        
        for note_doc in notes_shared_by_me:
            note = format_doc(note_doc)
            # Only include if it's shared with someone
            if (note.get("isShared") and 
                (note.get("shareType") == "public" or 
                 (note.get("sharedWith") and len(note.get("sharedWith")) > 0))):
                combined_shares.append({
                    "id": note.get("id"),
                    "itemId": note.get("id"),
                    "itemType": "note",
                    "shareType": note.get("shareType", "specific"),
                    "sharedWith": note.get("sharedWith", []),
                    "sharedBy": current_user["uid"],
                    "sharedAt": note.get("updatedAt") or note.get("createdAt"),
                    "permissions": note.get("permissions", {
                        "view": True,
                        "edit": False,
                        "comment": False,
                        "download": True,
                        "share": False
                    })
                })
        
        return combined_shares
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shared items: {str(e)}"
        )


@router.get("/{item_type}/{item_id}", response_model=List[Share])
async def get_shares_for_item(
    item_type: str,
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get sharing information for a specific item
    """
    try:
        # Check if user has access to this item
        if item_type == "subject":
            await get_subject_by_id(item_id, current_user)
        elif item_type == "note":
            await get_note_by_id(item_id, current_user)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item type: {item_type}"
            )
        
        shares_ref = db.collection("shares")
        query = shares_ref.where("itemId", "==", item_id).where("itemType", "==", item_type)
        shares_docs = query.get()
        
        shares = [format_doc(doc) for doc in shares_docs]
        return shares
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch share information: {str(e)}"
        )


@router.post("/", response_model=Share)
async def share_item(share_data: ShareCreate, current_user: User = Depends(get_current_user)):
    """
    Share an item (subject or note) and update the item with sharing information
    """
    try:
        # Check if user has access to this item
        if share_data.itemType == "subject":
            subject = await get_subject_by_id(share_data.itemId, current_user)
            if subject["createdBy"] != current_user["uid"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to share this subject"
                )
        elif share_data.itemType == "note":
            note = await get_note_by_id(share_data.itemId, current_user)
            if note["createdBy"] != current_user["uid"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to share this note"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid item type: {share_data.itemType}"
            )
        
        # Check if item is already shared
        shares_ref = db.collection("shares")
        query = shares_ref.where("itemId", "==", share_data.itemId).where("itemType", "==", share_data.itemType).where("sharedBy", "==", current_user["uid"])
        existing_shares = query.get()
        
        # Prepare the data to update in both collections
        share_update = {
            "shareType": share_data.shareType,
            "sharedWith": share_data.sharedWith or [],
            "message": share_data.message,
            "permissions": share_data.permissions,
            "updatedAt": create_server_timestamp(),
            "sharedBy": current_user["uid"],
        }
        
        # Update the item directly with sharing information
        if share_data.itemType == "subject":
            subject_ref = db.collection("subjects").document(share_data.itemId)
            subject_ref.update({
                "shareType": share_data.shareType,
                "sharedWith": share_data.sharedWith or [],
                "sharedBy": current_user["uid"],
                "isShared": True,
                "permissions": share_data.permissions,
            })
        elif share_data.itemType == "note":
            note_ref = db.collection("notes").document(share_data.itemId)
            note_ref.update({
                "isShared": True,
                "shareType": share_data.shareType,
                "sharedWith": share_data.sharedWith or [],
                "sharedBy": current_user["uid"],
                "permissions": share_data.permissions,
            })
        
        if len(list(existing_shares)) > 0:
            # Update existing share in the shares collection
            share_id = existing_shares[0].id
            share_ref = shares_ref.document(share_id)
            share_ref.update(share_update)
            
            # Get updated share
            updated_share = share_ref.get()
            return format_doc(updated_share)
        else:
            # Create new share in the shares collection for compatibility
            new_share_data = share_data.dict()
            new_share_data["sharedBy"] = current_user["uid"]
            new_share_data["sharedAt"] = create_server_timestamp()
            new_share_data["updatedAt"] = create_server_timestamp()
            
            share_ref = shares_ref.document()
            share_ref.set(new_share_data)
            
            # Get created share
            created_share = share_ref.get()
            return format_doc(created_share)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to share item: {str(e)}"
        )


@router.delete("/{share_id}")
async def remove_share(share_id: str, current_user: User = Depends(get_current_user)):
    """
    Remove a share and update the shared item
    """
    try:
        # Check if share exists and user is the owner
        share_ref = db.collection("shares").document(share_id)
        share_doc = share_ref.get()
        
        if not share_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Share with ID {share_id} not found"
            )
        
        share = format_doc(share_doc)
        if share["sharedBy"] != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to remove this share"
            )
        
        # Delete the share
        share_ref.delete()
        
        # Update the item to reflect removal of sharing
        item_type = share["itemType"]
        item_id = share["itemId"]
        
        if item_type == "note":
            # Check if there are any other shares for this note
            shares_ref = db.collection("shares")
            query = shares_ref.where("itemId", "==", item_id).where("itemType", "==", "note")
            other_shares = query.get()
            
            if len(list(other_shares)) <= 1:  # Only the one we're deleting
                note_ref = db.collection("notes").document(item_id)
                note_ref.update({
                    "isShared": False,
                    "shareType": None,
                    "sharedWith": [],
                    "sharedBy": "Unknown"
                })
        elif item_type == "subject":
            # Check if there are any other shares for this subject
            shares_ref = db.collection("shares")
            query = shares_ref.where("itemId", "==", item_id).where("itemType", "==", "subject")
            other_shares = query.get()
            
            if len(list(other_shares)) <= 1:  # Only the one we're deleting
                subject_ref = db.collection("subjects").document(item_id)
                subject_ref.update({
                    "isShared": False,
                    "shareType": None,
                    "sharedWith": [],
                    "sharedBy": "Unknown"
                })
        
        return {"message": "Share has been removed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove share: {str(e)}"
        ) 