from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db.client import get_supabase_client
from app.models import (
    DocumentResponse,
    DocumentStatus,
    UserResponse,
    WorkspaceCreate,
    WorkspaceDetailResponse,
    WorkspaceDocumentAdd,
    WorkspaceResponse,
)

router = APIRouter()


async def _get_owned_workspace(workspace_id: str, user_id: str) -> dict:
    """Fetch a workspace and raise 404/403 if it doesn't exist or isn't owned by user_id."""
    client = get_supabase_client()
    result = await client.table("workspaces").select("*").eq("id", workspace_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    ws = result.data[0]
    if ws["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return ws


# ---------------------------------------------------------------------------
# Create / List
# ---------------------------------------------------------------------------


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    client = get_supabase_client()
    result = await client.table("workspaces").insert(
        {"user_id": str(current_user.id), "name": body.name}
    ).execute()
    ws = result.data[0]
    return WorkspaceResponse(
        id=ws["id"],
        user_id=ws["user_id"],
        name=ws["name"],
        created_at=ws["created_at"],
    )


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(current_user: UserResponse = Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        await client.table("workspaces")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return [
        WorkspaceResponse(
            id=w["id"], user_id=w["user_id"], name=w["name"], created_at=w["created_at"]
        )
        for w in (result.data or [])
    ]


# ---------------------------------------------------------------------------
# Get (with documents)
# ---------------------------------------------------------------------------


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    ws = await _get_owned_workspace(workspace_id, str(current_user.id))
    client = get_supabase_client()

    # Fetch document IDs from the join table, then fetch documents in one query
    wd_result = (
        await client.table("workspace_documents")
        .select("document_id")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    doc_ids = [row["document_id"] for row in (wd_result.data or [])]

    documents: list[DocumentResponse] = []
    if doc_ids:
        docs_result = (
            await client.table("documents").select("*").in_("id", doc_ids).execute()
        )
        documents = [
            DocumentResponse(
                id=d["id"],
                user_id=d["user_id"],
                filename=d["filename"],
                page_count=d.get("page_count"),
                chunk_count=d.get("chunk_count"),
                file_size_bytes=d["file_size_bytes"],
                status=DocumentStatus(d["status"]),
                created_at=d["created_at"],
            )
            for d in (docs_result.data or [])
        ]

    return WorkspaceDetailResponse(
        id=ws["id"],
        user_id=ws["user_id"],
        name=ws["name"],
        created_at=ws["created_at"],
        documents=documents,
    )


# ---------------------------------------------------------------------------
# Manage documents in a workspace
# ---------------------------------------------------------------------------


@router.post(
    "/{workspace_id}/documents",
    status_code=status.HTTP_201_CREATED,
)
async def add_document_to_workspace(
    workspace_id: str,
    body: WorkspaceDocumentAdd,
    current_user: UserResponse = Depends(get_current_user),
):
    user_id = str(current_user.id)
    await _get_owned_workspace(workspace_id, user_id)

    # Verify the document belongs to the same user
    client = get_supabase_client()
    doc_result = (
        await client.table("documents")
        .select("user_id")
        .eq("id", str(body.document_id))
        .execute()
    )
    if not doc_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc_result.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Document access denied")

    # Upsert is idempotent — adding the same doc twice is a no-op
    await client.table("workspace_documents").upsert(
        {"workspace_id": workspace_id, "document_id": str(body.document_id)}
    ).execute()

    return {"detail": "Document added to workspace"}


@router.delete(
    "/{workspace_id}/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_document_from_workspace(
    workspace_id: str,
    doc_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    await _get_owned_workspace(workspace_id, str(current_user.id))
    client = get_supabase_client()
    await client.table("workspace_documents").delete().eq(
        "workspace_id", workspace_id
    ).eq("document_id", doc_id).execute()


# ---------------------------------------------------------------------------
# Delete workspace
# ---------------------------------------------------------------------------


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    await _get_owned_workspace(workspace_id, str(current_user.id))
    client = get_supabase_client()
    # ON DELETE CASCADE removes workspace_documents rows automatically
    await client.table("workspaces").delete().eq("id", workspace_id).execute()
