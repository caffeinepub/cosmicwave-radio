# CosmicWave Radio

## Current State

A retro-styled web radio app with:
- 10 curated genre sections (Geopolitics, Hinduism, UFO/UAP, etc.) fetching 2 stations each from Radio Browser API
- Global search by station name
- Persistent favourites via Internet Identity login (backend) + localStorage fallback
- Sticky bottom player bar with volume control
- Hero banner and CRT scanlines aesthetic

## Requested Changes (Diff)

### Add
- **"Browse" tab mode** alongside the existing genre view. Two top-level tabs: "Genres" (current view) and "Browse" (new view).
- **Language & Region filter UI** inside the Browse tab:
  - Two dropdowns: Language and Country/Region, stacked vertically on mobile, side-by-side on desktop (md breakpoint)
  - Populated from Radio Browser API `/languages` and `/countries` endpoints
  - Combined filter: when either dropdown changes, fetch matching stations from Radio Browser API filtered by language and/or country
  - A "Clear" button resets both dropdowns and clears results
  - Results displayed in the same StationCard grid layout (4 columns on lg, 2 on sm, 1 on mobile)
  - Loading, empty, and error states handled
- **Featured Public Broadcasters section** (hardcoded curated list) shown in the Browse tab below the filters section, always visible regardless of filter state. Stations to include:
  - BBC World Service (stream URL: https://stream.live.vc.bbcmedia.co.uk/bbc_world_service)
  - NPR News Now (stream URL: https://npr-ice.streamguys1.com/live.mp3)
  - Deutsche Welle English (stream URL: https://stream.dw.com/radio/rockradio/mp3-128)
  - France 24 Radio (stream URL: https://stream.radiofrance.fr/franceinfo/franceinfo_hifi.m3u8)
  - RFI English (stream URL: https://rfienglish.ice.infomaniak.ch/rfienglish-mp3-128.mp3)
  - All India Radio National (stream URL: https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8)
  - ABC News Radio Australia (stream URL: https://live-radio01.mediahubaustralia.com/2PBW/mp3/)
  - Radio Canada International (stream URL: https://ici-musique.cdn.radio.ca/rci/rci_96k.aac)
  - Radio New Zealand (stream URL: https://radionz-ice.streamguys1.com/national.mp3)
  - Voice of America (stream URL: https://voa-inlang-1-lh.akamaihd.net/i/VOAEnglish_1@359718/index_48_a-p.m3u8)
  - Each station uses a hardcoded stationuuid, name, tags, favicon (empty string), genre "Public Broadcasters"

### Modify
- Main content area wrapped in a Tabs component with two tabs: "Genres" and "Browse"
- Genre sections remain in the "Genres" tab, unchanged
- Favourites and Search sections stay above the tabs (always visible)

### Remove
- Nothing removed

## Implementation Plan

1. Add Tabs ("Genres" / "Browse") to the main content area below search and favourites
2. Move genre sections into the "Genres" tab panel
3. Create BrowseTab component containing:
   a. LanguageRegionFilters sub-component with two Select dropdowns + Clear button
   b. Fetch `/languages` and `/countries` from Radio Browser API on mount for dropdown options
   c. Filtered station results grid (fetches `/stations/search` with language + country params)
   d. FeaturedBroadcasters sub-component (hardcoded list rendered as StationCard grid)
4. Wire StationCard interactions (play, favourite) through to existing handlers
5. Add deterministic data-ocid markers to all new interactive elements
