from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime


class User(BaseModel):
    uid: str
    email: str
    name: Optional[str] = None


class SubjectBase(BaseModel):
    title: str
    description: Optional[str] = None


class SubjectCreate(SubjectBase):
    pass


class Subject(SubjectBase):
    id: str
    createdBy: str
    createdAt: Any  # Firestore timestamp
    updatedAt: Optional[Any] = None

    class Config:
        orm_mode = True


class MediaItem(BaseModel):
    type: str  # 'image', 'video', 'file', 'link'
    url: str
    title: Optional[str] = None
    createdAt: Optional[Any] = None


class NoteBase(BaseModel):
    title: str
    content: str
    subjectId: str
    mediaItems: Optional[List[MediaItem]] = []
    tags: Optional[List[str]] = []


class NoteCreate(NoteBase):
    pass


class Note(NoteBase):
    id: str
    createdBy: str
    createdAt: Any  # Firestore timestamp
    updatedAt: Optional[Any] = None
    isShared: Optional[bool] = False
    shareType: Optional[str] = None
    sharedWith: Optional[List[str]] = None

    class Config:
        orm_mode = True


class ShareBase(BaseModel):
    itemId: str
    itemType: str  # 'subject' or 'note'
    shareType: str  # 'private', 'specific', or 'public'
    sharedWith: Optional[List[str]] = []
    message: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = {
        "view": True,      # Always true when shared
        "edit": False,     # Can recipients edit the content?
        "comment": False,  # Can recipients add comments?
        "download": True,  # Can recipients download content?
        "share": False     # Can recipients reshare the content?
    }


class ShareCreate(ShareBase):
    pass


class Share(ShareBase):
    id: str
    sharedBy: str
    sharedAt: Any  # Firestore timestamp
    updatedAt: Optional[Any] = None

    class Config:
        orm_mode = True 