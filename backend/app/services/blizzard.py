"""Blizzard API client with caching and token management."""

import time
import logging
from typing import Optional
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class BlizzardAPI:
    """Handles all communication with Battle.net / WoW API."""

    def __init__(self):
        self._client_token: Optional[str] = None
        self._client_token_expires: float = 0
        self._http = httpx.AsyncClient(timeout=30.0)

    # ── Client Credentials Token ─────────────────────────────────────
    async def _ensure_client_token(self):
        """Get or refresh client credentials token for game data APIs."""
        if self._client_token and time.time() < self._client_token_expires - 60:
            return

        resp = await self._http.post(
            settings.bnet_token_url,
            data={"grant_type": "client_credentials"},
            auth=(settings.BNET_CLIENT_ID, settings.BNET_CLIENT_SECRET),
        )
        resp.raise_for_status()
        data = resp.json()
        self._client_token = data["access_token"]
        self._client_token_expires = time.time() + data.get("expires_in", 86400)
        logger.info("Refreshed Blizzard client credentials token")

    async def _game_data_request(self, path: str, namespace: str = "static", params: dict = None):
        """Make an authenticated request to the WoW Game Data API."""
        await self._ensure_client_token()
        region = settings.BNET_REGION
        ns = f"{namespace}-{region}"
        url = f"{settings.bnet_api_base}{path}"
        query = {"namespace": ns, "locale": "en_US", **(params or {})}
        headers = {"Authorization": f"Bearer {self._client_token}"}

        resp = await self._http.get(url, params=query, headers=headers)
        resp.raise_for_status()
        return resp.json()

    async def _profile_request(self, path: str, access_token: str = None):
        """Make a request to the WoW Profile API.
        Uses user's OAuth token if available, otherwise client credentials."""
        token = access_token or self._client_token
        if not token:
            await self._ensure_client_token()
            token = self._client_token

        region = settings.BNET_REGION
        ns = f"profile-{region}"
        url = f"{settings.bnet_api_base}{path}"
        query = {"namespace": ns, "locale": "en_US"}
        headers = {"Authorization": f"Bearer {token}"}

        resp = await self._http.get(url, params=query, headers=headers)
        resp.raise_for_status()
        return resp.json()

    # ── Mount Data ───────────────────────────────────────────────────
    async def get_mount_index(self) -> dict:
        """Fetch the master list of all mounts."""
        return await self._game_data_request("/data/wow/mount/index")

    async def get_mount_detail(self, mount_id: int) -> dict:
        """Fetch details for a single mount."""
        return await self._game_data_request(f"/data/wow/mount/{mount_id}")

    async def get_creature_media(self, creature_display_id: int) -> dict:
        """Fetch creature display media (mount icons/renders)."""
        return await self._game_data_request(
            f"/data/wow/media/creature-display/{creature_display_id}"
        )

    # ── Character Data ───────────────────────────────────────────────
    async def get_character_profile(self, realm_slug: str, character_name: str) -> dict:
        """Fetch basic character profile (public, no OAuth needed)."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}"
        )

    async def get_character_media(self, realm_slug: str, character_name: str) -> dict:
        """Fetch character render/avatar images."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/character-media"
        )

    async def get_character_mounts(
        self, realm_slug: str, character_name: str, access_token: str = None
    ) -> dict:
        """Fetch a character's collected mounts.
        Public profiles work with client credentials.
        Private profiles need the user's OAuth token.
        """
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/collections/mounts",
            access_token=access_token,
        )

    # ── Realm Data ───────────────────────────────────────────────────
    async def get_realm_index(self) -> dict:
        """Fetch list of all realms (for character search dropdown)."""
        return await self._game_data_request("/data/wow/realm/index", namespace="dynamic")

    async def search_realms(self, query: str) -> list[dict]:
        """Search realms by name prefix."""
        data = await self.get_realm_index()
        realms = data.get("realms", [])
        q = query.lower()
        return [r for r in realms if r.get("name", {}).get("en_US", "").lower().startswith(q)]

    # ── OAuth Helpers ────────────────────────────────────────────────
    def get_authorize_url(self, state: str) -> str:
        """Build Battle.net OAuth authorize URL."""
        params = {
            "client_id": settings.BNET_CLIENT_ID,
            "redirect_uri": settings.BNET_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid wow.profile",
            "state": state,
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{settings.bnet_authorize_url}?{qs}"

    async def exchange_code(self, code: str) -> dict:
        """Exchange authorization code for access token."""
        resp = await self._http.post(
            settings.bnet_token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.BNET_REDIRECT_URI,
            },
            auth=(settings.BNET_CLIENT_ID, settings.BNET_CLIENT_SECRET),
        )
        resp.raise_for_status()
        return resp.json()

    async def get_user_info(self, access_token: str) -> dict:
        """Get Battle.net user info (account ID, BattleTag)."""
        resp = await self._http.get(
            f"{settings.bnet_auth_base}/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()

    async def close(self):
        await self._http.aclose()


# Singleton instance
blizzard_api = BlizzardAPI()
