import asyncio

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import get_current_user
from app.config import get_settings
from app.db.client import get_supabase_client
from app.models import UserResponse

settings = get_settings()
router = APIRouter()


def _stripe_configured() -> bool:
    return bool(settings.stripe_secret_key and settings.stripe_webhook_secret)


def _require_stripe() -> None:
    if not _stripe_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing not configured",
        )


# ---------------------------------------------------------------------------
# Webhook  (no JWT auth — raw body required for signature verification)
# ---------------------------------------------------------------------------


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    """
    Stripe sends POST requests here on subscription lifecycle events.
    Must NOT be behind JWT auth — the raw body bytes are needed for
    Stripe-Signature verification.
    """
    _require_stripe()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload"
        )

    event_type: str = event["type"]
    obj: dict = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(obj)
    elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
        await _handle_subscription_updated(obj)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(obj)

    return {"received": True}


# ---------------------------------------------------------------------------
# Webhook event handlers
# ---------------------------------------------------------------------------


async def _handle_checkout_completed(session: dict) -> None:
    user_id = session.get("client_reference_id")
    if not user_id:
        return

    client = get_supabase_client()
    await client.table("users").update(
        {
            "plan": "pro",
            "stripe_customer_id": session.get("customer"),
            "stripe_subscription_id": session.get("subscription"),
        }
    ).eq("id", user_id).execute()


async def _handle_subscription_updated(subscription: dict) -> None:
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    sub_status = subscription.get("status", "")
    plan = "pro" if sub_status in ("active", "trialing") else "free"

    client = get_supabase_client()
    await client.table("users").update({"plan": plan}).eq(
        "stripe_customer_id", customer_id
    ).execute()


async def _handle_subscription_deleted(subscription: dict) -> None:
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    client = get_supabase_client()
    await client.table("users").update(
        {"plan": "free", "stripe_subscription_id": None}
    ).eq("stripe_customer_id", customer_id).execute()


# ---------------------------------------------------------------------------
# Checkout session (upgrade to Pro)
# ---------------------------------------------------------------------------


@router.post("/checkout")
async def create_checkout_session(
    current_user: UserResponse = Depends(get_current_user),
):
    _require_stripe()
    if not settings.stripe_pro_price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pro plan price not configured",
        )

    def _create():
        stripe.api_key = settings.stripe_secret_key
        return stripe.checkout.Session.create(
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            line_items=[{"price": settings.stripe_pro_price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.frontend_url}/dashboard?upgraded=true",
            cancel_url=f"{settings.frontend_url}/settings?cancelled=true",
            metadata={"user_id": str(current_user.id)},
        )

    try:
        session = await asyncio.to_thread(_create)
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        )

    return {"checkout_url": session.url}


# ---------------------------------------------------------------------------
# Customer portal (manage / cancel subscription)
# ---------------------------------------------------------------------------


@router.post("/portal")
async def create_portal_session(
    current_user: UserResponse = Depends(get_current_user),
):
    _require_stripe()

    client = get_supabase_client()
    result = (
        await client.table("users")
        .select("stripe_customer_id")
        .eq("id", str(current_user.id))
        .execute()
    )
    stripe_customer_id = (result.data[0].get("stripe_customer_id") if result.data else None)

    if not stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found. Please subscribe first.",
        )

    def _create():
        stripe.api_key = settings.stripe_secret_key
        return stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{settings.frontend_url}/settings",
        )

    try:
        session = await asyncio.to_thread(_create)
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        )

    return {"portal_url": session.url}
