from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db.client import get_supabase_client
from app.models import (
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
    MessageResponse,
    MessageRole,
    Source,
    UserResponse,
)

router = APIRouter()


async def _get_owned_conversation(conv_id: str, user_id: str) -> dict:
    """Fetch a conversation and raise 404/403 if missing or not owned by user_id."""
    client = get_supabase_client()
    result = await client.table("conversations").select("*").eq("id", conv_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    conv = result.data[0]
    if conv["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return conv


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    client = get_supabase_client()
    result = await client.table("conversations").insert(
        {
            "user_id": str(current_user.id),
            "title": body.title,
            "document_id": str(body.document_id) if body.document_id else None,
            "workspace_id": str(body.workspace_id) if body.workspace_id else None,
        }
    ).execute()
    conv = result.data[0]
    return _to_response(conv)


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(current_user: UserResponse = Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        await client.table("conversations")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("updated_at", desc=True)
        .execute()
    )
    return [_to_response(c) for c in (result.data or [])]


# ---------------------------------------------------------------------------
# Get with messages
# ---------------------------------------------------------------------------


@router.get("/{conv_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conv_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    conv = await _get_owned_conversation(conv_id, str(current_user.id))
    client = get_supabase_client()

    msgs_result = (
        await client.table("messages")
        .select("*")
        .eq("conversation_id", conv_id)
        .order("created_at")   # ascending — oldest first
        .execute()
    )

    messages = [
        MessageResponse(
            id=m["id"],
            conversation_id=m["conversation_id"],
            role=MessageRole(m["role"]),
            content=m["content"],
            sources=[Source(**s) for s in (m.get("sources") or [])],
            created_at=m["created_at"],
        )
        for m in (msgs_result.data or [])
    ]

    return ConversationDetailResponse(
        id=conv["id"],
        user_id=conv["user_id"],
        workspace_id=conv.get("workspace_id"),
        document_id=conv.get("document_id"),
        title=conv["title"],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
        messages=messages,
    )


# ---------------------------------------------------------------------------
# Rename
# ---------------------------------------------------------------------------


@router.patch("/{conv_id}", response_model=ConversationResponse)
async def rename_conversation(
    conv_id: str,
    body: ConversationUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    await _get_owned_conversation(conv_id, str(current_user.id))
    client = get_supabase_client()
    result = (
        await client.table("conversations")
        .update({"title": body.title.strip()})
        .eq("id", conv_id)
        .execute()
    )
    return _to_response(result.data[0])


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


@router.delete("/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    await _get_owned_conversation(conv_id, str(current_user.id))
    client = get_supabase_client()
    # ON DELETE CASCADE removes all messages in this conversation
    await client.table("conversations").delete().eq("id", conv_id).execute()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_response(conv: dict) -> ConversationResponse:
    return ConversationResponse(
        id=conv["id"],
        user_id=conv["user_id"],
        workspace_id=conv.get("workspace_id"),
        document_id=conv.get("document_id"),
        title=conv["title"],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
    )
