def service_headers(key: str) -> dict[str, str]:
    """Authenticate hosted Supabase requests with a server-only API key."""
    headers = {"apikey": key}
    if not key.startswith("sb_secret_"):
        # Legacy service_role keys are JWTs and also serve as the bearer token.
        headers["Authorization"] = f"Bearer {key}"
    return headers
