from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class UserPlan(str, Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class DocumentStatus(str, Enum):
    uploading = "uploading"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class SignupRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=100)


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    plan: UserPlan
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


class DocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    page_count: Optional[int] = None
    chunk_count: Optional[int] = None
    file_size_bytes: int
    status: DocumentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentStatusResponse(BaseModel):
    id: UUID
    status: DocumentStatus
    page_count: Optional[int] = None
    chunk_count: Optional[int] = None


# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class WorkspaceDocumentAdd(BaseModel):
    document_id: UUID


class WorkspaceResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceDetailResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    created_at: datetime
    documents: list[DocumentResponse]

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Chat & Conversations
# ---------------------------------------------------------------------------


class Source(BaseModel):
    doc_id: UUID
    filename: str
    page_number: int
    chunk_index: int


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[UUID] = None
    document_ids: list[UUID] = Field(default_factory=list)
    workspace_id: Optional[UUID] = None


class ConversationCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    document_id: Optional[UUID] = None
    workspace_id: Optional[UUID] = None


class ConversationUpdate(BaseModel):
    title: str = Field(max_length=200)


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: MessageRole
    content: str
    sources: list[Source] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    workspace_id: Optional[UUID] = None
    document_id: Optional[UUID] = None
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    id: UUID
    user_id: UUID
    workspace_id: Optional[UUID] = None
    document_id: Optional[UUID] = None
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------


class HealthChecks(BaseModel):
    agent: bool
    security: bool
    cache: bool
    database: bool


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    checks: HealthChecks


class CacheStatsResponse(BaseModel):
    hits: int
    misses: int
    hit_rate: float
    size: int


class MetricsResponse(BaseModel):
    total_requests: int
    total_errors: int
    error_rate: float
    avg_latency_ms: float
    cache_hit_rate: float
    total_tokens_in: int
    total_tokens_out: int
    retrieval_attempts: int
    fallbacks: int


# ---------------------------------------------------------------------------
# Usage (for free-tier sidebar bar)
# ---------------------------------------------------------------------------


class UsageResponse(BaseModel):
    messages_this_month: int
    messages_limit: int  # -1 = unlimited
    documents_count: int
    documents_limit: int  # -1 = unlimited
    storage_bytes: int
    storage_limit_bytes: int
