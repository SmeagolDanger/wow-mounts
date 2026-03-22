"""Blizzard API client with caching and token management."""

import logging
import time

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class BlizzardAPI:
    """Handles all communication with Battle.net / WoW API."""

    def __init__(self):
        self._client_token: str | None = None
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
        Uses user's OAuth token if available, falls back to client credentials on 401."""
        region = settings.BNET_REGION
        ns = f"profile-{region}"
        url = f"{settings.bnet_api_base}{path}"
        query = {"namespace": ns, "locale": "en_US"}

        # Try user token first if provided
        if access_token:
            resp = await self._http.get(url, params=query, headers={"Authorization": f"Bearer {access_token}"})
            if resp.status_code != 401:
                resp.raise_for_status()
                return resp.json()
            # User token expired/invalid — fall back to client credentials
            logger.debug("User OAuth token returned 401 for %s, falling back to client credentials", path)

        # Use client credentials
        await self._ensure_client_token()
        resp = await self._http.get(url, params=query, headers={"Authorization": f"Bearer {self._client_token}"})
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
        """Fetch creature display media (mount/pet icons/renders)."""
        return await self._game_data_request(f"/data/wow/media/creature-display/{creature_display_id}")

    async def get_pet_species_media(self, species_id: int) -> dict:
        """Fetch pet species media (icon image)."""
        return await self._game_data_request(f"/data/wow/media/pet/{species_id}")

    # ── Character Data ───────────────────────────────────────────────
    async def get_character_profile(self, realm_slug: str, character_name: str) -> dict:
        """Fetch basic character profile (public, no OAuth needed)."""
        name = character_name.lower()
        return await self._profile_request(f"/profile/wow/character/{realm_slug}/{name}")

    async def get_character_media(self, realm_slug: str, character_name: str) -> dict:
        """Fetch character render/avatar images."""
        name = character_name.lower()
        return await self._profile_request(f"/profile/wow/character/{realm_slug}/{name}/character-media")

    async def get_character_mounts(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's collected mounts.
        Public profiles work with client credentials.
        Private profiles need the user's OAuth token.
        """
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/collections/mounts",
            access_token=access_token,
        )

    # ── Pet Data ───────────────────────────────────────────────────
    async def get_pet_index(self) -> dict:
        """Fetch the master list of all companion pets."""
        return await self._game_data_request("/data/wow/pet/index")

    async def get_pet_detail(self, pet_id: int) -> dict:
        """Fetch details for a single pet."""
        return await self._game_data_request(f"/data/wow/pet/{pet_id}")

    async def get_pet_ability(self, ability_id: int) -> dict:
        """Fetch details for a single pet ability."""
        return await self._game_data_request(f"/data/wow/pet-ability/{ability_id}")

    # ── Toy Data ──────────────────────────────────────────────────
    async def get_toy_index(self) -> dict:
        """Fetch the master list of all toys."""
        return await self._game_data_request("/data/wow/toy/index")

    # ── Achievement Data ──────────────────────────────────────────
    async def get_achievement_category_index(self) -> dict:
        """Fetch achievement category tree."""
        return await self._game_data_request("/data/wow/achievement-category/index")

    async def get_achievement_category(self, category_id: int) -> dict:
        """Fetch a single achievement category with its achievements."""
        return await self._game_data_request(f"/data/wow/achievement-category/{category_id}")

    # ── Title Data ────────────────────────────────────────────────
    async def get_title_index(self) -> dict:
        """Fetch all available character titles."""
        return await self._game_data_request("/data/wow/title/index")

    # ── Heirloom Data ─────────────────────────────────────────────
    async def get_heirloom_index(self) -> dict:
        """Fetch all heirloom items."""
        return await self._game_data_request("/data/wow/heirloom/index")

    # ── Reputation Data ───────────────────────────────────────────
    async def get_reputation_faction_index(self) -> dict:
        """Fetch all reputation factions."""
        return await self._game_data_request("/data/wow/reputation-faction/index")

    # ── Character Collections ─────────────────────────────────────
    async def get_character_pets(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's collected pets."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/collections/pets",
            access_token=access_token,
        )

    async def get_character_toys(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's collected toys."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/collections/toys",
            access_token=access_token,
        )

    async def get_character_heirlooms(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's collected heirlooms."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/collections/heirlooms",
            access_token=access_token,
        )

    async def get_character_achievements(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's achievement progress."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/achievements",
            access_token=access_token,
        )

    async def get_character_titles(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's earned titles."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/titles",
            access_token=access_token,
        )

    async def get_character_reputations(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's reputation standings."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/reputations",
            access_token=access_token,
        )

    # ── Character Professions ──────────────────────────────────────
    async def get_character_professions(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's professions and learned recipes."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/professions",
            access_token=access_token,
        )

    # ── Character Appearances ─────────────────────────────────────
    async def get_character_appearances(self, realm_slug: str, character_name: str, access_token: str = None) -> dict:
        """Fetch a character's collected transmog appearances."""
        name = character_name.lower()
        return await self._profile_request(
            f"/profile/wow/character/{realm_slug}/{name}/collections/transmogs",
            access_token=access_token,
        )

    # ── Transmog Set Index ────────────────────────────────────────
    async def get_transmog_set_index(self) -> dict:
        """Fetch all transmog sets from the game data API."""
        return await self._game_data_request("/data/wow/transmog-set/index")

    # ── Profession Data ───────────────────────────────────────────
    async def get_profession_index(self) -> dict:
        """Fetch all professions."""
        return await self._game_data_request("/data/wow/profession/index")

    async def get_recipe(self, recipe_id: int) -> dict:
        """Fetch details for a single recipe."""
        return await self._game_data_request(f"/data/wow/recipe/{recipe_id}")

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
        """Build Battle.net OAuth authorize URL with properly encoded params."""
        from urllib.parse import urlencode

        params = {
            "client_id": settings.BNET_CLIENT_ID,
            "redirect_uri": settings.BNET_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid wow.profile",
            "state": state,
        }
        return f"{settings.bnet_authorize_url}?{urlencode(params)}"

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

    async def get_user_wow_characters(self, access_token: str) -> dict:
        """Get all WoW characters for the authenticated Battle.net user."""
        return await self._profile_request("/profile/user/wow", access_token=access_token)

    async def close(self):
        await self._http.aclose()


# Singleton instance
blizzard_api = BlizzardAPI()
