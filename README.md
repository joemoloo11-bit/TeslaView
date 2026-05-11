# TeslaView

A cross-platform desktop app for viewing Tesla Sentry Mode and Dashcam footage with synchronized multi-camera playback and telemetry overlay.

## Features

- **Multi-camera sync** — Automatically groups and syncs Front, Left, Right, and Rear camera feeds
- **4 layout modes** — Tesla style (front large + row), 2×2 Grid, Side-by-side, Single camera
- **Telemetry HUD** — Speed gauge, GPS heading compass, gear, brake, blinker indicators (when SEI data available from HW3/HW4 vehicles running firmware ≥ 2025.44.25)
- **Export** — FFmpeg-powered export in H.264 or H.265, configurable quality (CRF), selectable resolution
- **100% offline** — No internet connection required, no data leaves your machine
- **Supports all clip types** — SentryClips, SavedClips, RecentClips

## Supported Camera Names

Handles all Tesla firmware naming conventions:
- `front`, `left_repeater`, `right_repeater`, `back`
- `left_pillar`, `right_pillar` (older firmware naming)
- `left_b_pillar`, `right_b_pillar`, `narrow`, `cabin`

## Development

```bash
npm install
npm run dev       # Start with hot reload
npm run build     # Production build
```

## Packaging (Installer)

```bash
npm run package:win    # Windows NSIS installer (.exe)
npm run package:mac    # macOS DMG
npm run package:linux  # Linux AppImage
```

### Windows packaging requirements
- Run on Windows, or use a CI runner with Wine
- Place a 256×256 `icon.ico` in `build/`
- Run `npm run package:win`
- Output: `release/TeslaView Setup x.x.x.exe`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` / `→` | Step 1 second |
| `Shift+←` / `Shift+→` | Skip 10 seconds |
| `Home` | Jump to start |
| `End` | Jump to end |

## Privacy

All operations are local. The only external dependency at runtime is FFmpeg (bundled), which runs locally as a subprocess. No telemetry, no analytics, no network requests.
