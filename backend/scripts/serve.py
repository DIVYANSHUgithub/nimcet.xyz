"""Production entry point: python scripts/serve.py. One worker keeps pool use bounded."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn
from app.core.config import Settings
from app.core.deployment import deployment_errors


if __name__ == "__main__":
    try:
        settings = Settings()
        errors = deployment_errors(settings)
        port = int(os.environ.get("PORT", "8000"))
        if not 1 <= port <= 65535:
            errors.append("PORT must be between 1 and 65535.")
    except Exception:
        raise SystemExit("Invalid backend environment configuration; check variable names and types.") from None
    if errors:
        raise SystemExit("Deployment configuration failed:\n- " + "\n- ".join(errors))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, workers=1,
                limit_concurrency=64, backlog=128, timeout_keep_alive=5,
                proxy_headers=False, access_log=False)
