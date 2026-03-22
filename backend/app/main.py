"""WoW Mount Tracker — FastAPI Backend."""

import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.database import init_db
from app.routes import auth, characters, collections, farm, mounts
from app.services.blizzard import blizzard_api

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Rate Limiting Middleware ─────────────────────────────────────────


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory per-IP rate limiter with periodic cleanup."""

    def __init__(self, app, calls_per_minute: int = 60):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    async def dispatch(self, request: Request, call_next):
        # Skip health checks
        if request.url.path == "/api/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        # Also check X-Forwarded-For behind a proxy
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Only trust first hop — don't blindly trust all proxies
            client_ip = forwarded.split(",")[0].strip()

        now = time.time()
        window = now - 60

        # Clean old entries for this IP
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > window]

        # Periodic cleanup: purge stale IPs every 5 minutes to prevent memory leak
        if now - self._last_cleanup > 300:
            stale_ips = [ip for ip, ts in self.requests.items() if not ts or ts[-1] < window]
            for ip in stale_ips:
                del self.requests[ip]
            self._last_cleanup = now

        if len(self.requests[client_ip]) >= self.calls_per_minute:
            return Response(
                content='{"detail":"Rate limit exceeded. Try again shortly."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        self.requests[client_ip].append(now)
        return await call_next(request)


# ── Security Headers Middleware ──────────────────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "script-src 'unsafe-inline'; "  # needed for OAuth callback redirect page only
            "style-src 'unsafe-inline'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        # Strip server header to avoid fingerprinting
        if "server" in response.headers:
            del response.headers["server"]
        return response


# ── App Setup ────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting WoW Mount Tracker API [%s]", settings.APP_ENV)
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception:
        logger.warning("Database unavailable — starting without DB (health check will still work)")
    yield
    await blizzard_api.close()
    logger.info("Shutdown complete")


# Disable interactive docs in production
app = FastAPI(
    title="WoW Mount Tracker API",
    description="Backend for the WoW Mount Collection Tracker.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Middleware stack (order matters — outermost first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, calls_per_minute=settings.RATE_LIMIT_PER_MINUTE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
)

# Register routes
app.include_router(auth.router, prefix="/api")
app.include_router(mounts.router, prefix="/api")
app.include_router(characters.router, prefix="/api")
app.include_router(farm.router, prefix="/api")
app.include_router(collections.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "wow-mount-tracker"}
