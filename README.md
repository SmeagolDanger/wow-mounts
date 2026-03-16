# WoW Mount Tracker

A fan-made mobile app for tracking your World of Warcraft mount collection, planning farm routes, and managing daily/weekly mount farming checklists.

Built with **Expo** (React Native) + **FastAPI** + **PostgreSQL** + **Docker**.

## Features

### Mount Collection Browser
- Complete mount index from the Blizzard Game Data API
- Search and filter by name, source type (raid, dungeon, world boss, etc.)
- Toggle collected/missing view
- Animated progress ring showing collection completion %
- Detailed mount cards with icons and source badges

### Character System
- **Character Search**: Look up any character by realm + name
- **Favorites**: Save characters to quickly check their collections
- **Battle.net OAuth** (optional): Link your Battle.net account for private profile access
- **Device Auth** (fallback): Works without any login via anonymous device ID

### Daily Farm Tracker
- Create farm task checklists for mount-dropping content
- **Auto-reset**: Tasks automatically uncomplete at daily (15:00 UTC) or weekly (Tuesday 15:00 UTC) reset times
- Group tasks by reset type: Daily / Weekly / One-time
- Tag tasks with source type and zone for organization
- Live countdown timer to next daily reset

### UI/UX
- Dark, immersive WoW-inspired theme with gold/arcane/frost accents
- WoW class colors on character cards
- Item rarity color system
- Smooth animations and micro-interactions
- Pull-to-refresh everywhere

## Architecture

```
wow-mount-tracker/
├── docker-compose.yml          # Backend + PostgreSQL
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app entrypoint
│       ├── config.py           # Environment-based configuration
│       ├── database.py         # Async SQLAlchemy setup
│       ├── models.py           # User, FavoriteCharacter, FarmTask, CachedMount
│       ├── routes/
│       │   ├── auth.py         # Device auth + Battle.net OAuth
│       │   ├── mounts.py       # Mount index, detail, search (cached)
│       │   ├── characters.py   # Character lookup, favorites CRUD
│       │   └── farm.py         # Farm task CRUD with auto-reset
│       └── services/
│           └── blizzard.py     # Blizzard API client (token mgmt, all endpoints)
└── frontend/
    ├── app.json
    ├── package.json
    ├── app/
    │   ├── _layout.tsx         # Root layout, auth init
    │   └── (tabs)/
    │       ├── _layout.tsx     # Tab navigation
    │       ├── index.tsx       # Collection browser
    │       ├── farm.tsx        # Farm task tracker
    │       └── profile.tsx     # Character search + favorites
    ├── components/
    │   ├── Card.tsx            # WoW-style panel with gradient border
    │   ├── MountCard.tsx       # Mount grid tile
    │   ├── SearchBar.tsx       # Themed search input
    │   ├── ProgressRing.tsx    # Animated SVG progress ring
    │   └── FarmTaskItem.tsx    # Farm checklist row
    ├── theme/
    │   └── index.ts            # Colors, spacing, typography, shadows
    └── services/
        └── api.ts              # API client (all backend endpoints)
```

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- A [Battle.net Developer](https://develop.battle.net/) account + API client

### 1. Set Up Battle.net API Credentials

1. Go to https://develop.battle.net/access/clients
2. Create a new client
3. Set redirect URI to `http://localhost:8081/auth/callback` (for development)
4. Note your **Client ID** and **Client Secret**

### 2. Start the Backend

```bash
# Copy and fill in your credentials
cp .env.example .env

# Start PostgreSQL + API
docker compose up -d

# API is now running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 3. Start the Expo App

```bash
cd frontend

# Install dependencies
npm install

# Create .env for API URL
echo "EXPO_PUBLIC_API_URL=http://localhost:8000/api" > .env

# Start Expo dev server
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

### 4. Configure for Your Network

When running on a physical device, replace `localhost` with your machine's local IP:

```bash
# .env (frontend)
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8000/api

# .env (root, for backend CORS)
CORS_ORIGINS=*
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/device` | Register/login with device ID |
| GET | `/api/auth/bnet/login` | Get Battle.net OAuth URL |
| POST | `/api/auth/bnet/callback` | Exchange OAuth code for token |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/mounts/` | Get all mounts (cached) |
| GET | `/api/mounts/search?q=` | Search mounts by name |
| GET | `/api/mounts/{id}` | Get mount detail with icon |
| GET | `/api/characters/lookup` | Look up character profile + mounts |
| GET | `/api/characters/realms` | Get realm list |
| GET/POST/DELETE | `/api/characters/favorites` | Manage favorite characters |
| GET/POST | `/api/farm/` | Get/create farm tasks |
| PATCH | `/api/farm/{id}/complete` | Toggle task completion |
| PUT/DELETE | `/api/farm/{id}` | Update/delete farm task |
| GET | `/api/health` | Health check |

## How Mount Data Works

The backend acts as a caching proxy for the Blizzard API:

1. **Mount Index** — cached 24h. The full list of ~900+ mounts rarely changes.
2. **Mount Details** — cached 7 days. Includes creature media (icons/renders).
3. **Character Collections** — cached 1h. A character's collected mounts.
4. **Realms** — fetched live (small payload).

Client credentials are used for all public game data. User OAuth tokens are only needed for private character profiles.

## Daily/Weekly Reset Logic

The farm tracker respects WoW's server reset schedule:
- **Daily reset**: 15:00 UTC (10 AM EST / 7 AM PST)
- **Weekly reset**: Tuesday 15:00 UTC (US servers)

When you open the farm tab, completed tasks past their reset window are automatically marked incomplete again.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Expo (React Native) + TypeScript |
| Navigation | Expo Router (file-based) |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 + async SQLAlchemy |
| HTTP Client | httpx (async) |
| Auth | JWT + Battle.net OAuth 2.0 |
| Infrastructure | Docker Compose |

## License

Fan-made project. World of Warcraft and Battle.net are trademarks of Blizzard Entertainment.
This project is not affiliated with or endorsed by Blizzard Entertainment.
