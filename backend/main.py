import uvicorn

if __name__ == "__main__":
    from app.config import get_settings

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=not settings.is_production,
        log_level=settings.log_level.lower(),
    )
