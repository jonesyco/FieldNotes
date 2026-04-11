# FieldNotes

> Drop, tag, filter, and share points of interest — anywhere in the world.

![FieldNotes screenshot showing 3D terrain view of Portland with POI markers and side panel](screenshot.png)

A full-screen web app for mapping and sharing POIs. Light by default with a clean, map-first aesthetic — toggle to dark mode anytime. Share any collection of points via a single URL.

## Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Map | MapLibre GL JS |
| Basemap | CartoDB Dark Matter / Positron (no API key needed) |
| State | Zustand (with localStorage persistence) |
| Backend | Supabase (optional — required for sharing) |
| Styles | Plain CSS + CSS custom properties |

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** — the map opens centered on your current location (or Portland as fallback). A brief interactive tour walks first-time users through the core features on their first visit.

## Sharing (Supabase Setup)

The **↗ SHARE** button saves your current POIs to Supabase and generates a shareable URL (`?c=<id>`). Signed-in owners who open that URL can keep editing the same live map; everyone else sees a read-only view and can fork their own copy.

### 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account + new project
2. In the **SQL Editor**, run:

```sql
create table collections (
  id text primary key,
  title text,
  pois jsonb not null default '[]',
  categories jsonb not null default '[]',
  sequence_enabled boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table collections enable row level security;
create policy "Public read"   on collections for select using (true);
create policy "Public insert" on collections for insert with check (true);
create policy "Owner update"  on collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table collections;
```

### 2 — Add your credentials

Copy `.env.example` to `.env` and fill in your project values from **Project Settings → API**:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3 — Restart the dev server

```bash
npm run dev
```

The ↗ SHARE button will now be active. Without credentials, the app runs fully offline using localStorage.

## Features

### Map
- **Full-screen MapLibre GL JS map** — smooth pan/zoom, no API key required
- **Light / dark mode** — light by default; toggle to CartoDB Dark Matter anytime
- **Custom water color** — blue water in both themes
- **Custom green spaces** — parks, grass, and nature reserves rendered green
- **3D buildings** — toggle extruded buildings (zooms to street level, tilts camera)
- **Geolocation** — map opens at your current location; ⊕ HOME button returns there

### Onboarding
- **First-visit tour** — four-step interactive walkthrough covers navigation, pins, and sharing
- To replay: run `localStorage.removeItem('fieldnotes_tour_seen')` in the browser console

### POIs
- **Add POI** — click "+ ADD", then click any point on the map to place it
- **Fields** — title, description, category, tags, area/neighborhood, photo URL, website URL
- **13 categories** — food, coffee, bars, parks, viewpoints, music, art, shops, weird, hidden gems, safety, transit, other
- **Detail drawer** — click any marker or list item for full details, links, and image
- **Edit & delete** — full CRUD on every POI
- **Favorites** — star/unstar from the detail view

### Panel & Filtering
- **Live list panel** — dense scrollable list of visible/filtered POIs
- **Search** — filter by title, tag, area, or category
- **Category filter chips** — toggle one or more categories
- **In View** — show only POIs currently visible on the map
- **Favorites only** — filter to starred POIs
- **Sort** — newest, alphabetical, category, area
- **Sequence Map** — switch to manual stop ordering, drag locations vertically, choose which locations are included, and draw an animated driving route that follows the checked stops in list order

### Sharing
- **↗ SHARE** — saves all current POIs to Supabase, updates the URL, shows a copyable link
- **Read-only view** — recipients see the shared map with all POIs; edit/delete are hidden
- **Open in Editor** — recipient can fork the shared map into their own local session
- **Export / Import** — download POIs as JSON, re-import from file (works offline)
- **localStorage persistence** — POIs survive page refresh without Supabase

## Project Structure

```
src/
  lib/            Supabase client + collections API
  types/          TypeScript interfaces + constants
  store/          Zustand store (CRUD, filters, map state, collection loading)
  hooks/          useTheme, collection sync, sequence routing
  utils/          Filter/sort logic, geo constants
  components/
    MapView/      MapLibre GL JS wrapper (map, markers, 3D, terrain, route overlays)
    Panel/        SidePanel, POIListItem, FilterBar
    Detail/       DetailDrawer
    Forms/        Add/Edit modal
    Tour/         First-visit onboarding tour (4 steps)
    UI/           SearchBar, ShareButton
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | For sharing | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For sharing | Your Supabase anon/public key |

The app runs fully without these — sharing is simply disabled until they are set.

