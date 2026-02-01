# Player Images

This directory stores player images for the Tennis Dashboard.

## Image Naming Convention

- ATP players: `atp/{player_id}.png`
- WTA players: `wta/{player_id}.png`

## Image Size

Recommended size: 100x100 pixels (will be displayed at various sizes using CSS)

## Fallback

If a player image is not found, the dashboard will use a generated avatar from UI Avatars API.

## Adding Images

1. Download official player headshots from ATP/WTA websites
2. Resize to 100x100 pixels
3. Save as PNG with player ID as filename
4. Place in appropriate folder (atp/ or wta/)

Example:
- Novak Djokovic (ATP #1): `atp/1.png`
- Iga Swiatek (WTA #1): `wta/101.png`
