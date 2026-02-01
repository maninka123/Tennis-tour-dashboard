# Tennis Live Dashboard 🎾

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Python-blue)](#)
[![Live Updates](https://img.shields.io/badge/Live-Real--time%20Scores-red)](#)
[![Status](https://img.shields.io/badge/Status-Active-success)](#)

A comprehensive real-time tennis dashboard for ATP and WTA tours with live scores, rankings, tournament calendar, and interactive draws.

## Features

- **Live Scores (Top Scroll)** - Real-time match scores with LIVE status indicators
- **Recently Finished Matches** - Latest completed results with final scores
- **Rankings (Top 200)** - Movement arrows, career-high badge, and player age
- **Tournament Calendar** - Color-coded by category and sorted by date
- **Interactive Tournament Draws** - Bracket view with ranks, seeds, and hover match details
- **Two Tours** - Separate pages for ATP and WTA
- **Player Images** - Shown for top 200 players (fallback avatars when missing)

## Tournament Color Coding

| Category | Color |
|----------|-------|
| Grand Slam | Purple (#9B59B6) |
| Masters 1000 | Gold (#F1C40F) |
| ATP/WTA 500 | Blue (#3498DB) |
| ATP/WTA 250 | Green (#2ECC71) |
| ATP/WTA 125 | Orange (#E67E22) |
| Other | Gray (#95A5A6) |

## Project Structure

```
Tennis Dashboard/
├── .gitignore
├── start.sh               # Quick start script
├── backend/
│   ├── app.py              # Flask API server
│   ├── tennis_api.py       # Tennis data fetching
│   ├── requirements.txt    # Python dependencies
│   ├── config.py           # Configuration
│   └── .env.example        # Environment variables template
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   └── styles.css      # Main styles
│   ├── js/
│   │   ├── app.js          # Main application
│   │   ├── scores.js       # Live scores component
│   │   ├── rankings.js     # Rankings panel
│   │   ├── tournaments.js  # Tournament calendar
│   │   └── bracket.js      # Tournament tree/bracket
│   └── assets/
│       └── images/
│           ├── atp/         # ATP player images
│           └── wta/         # WTA player images
└── README.md
```

## Setup & Installation

### Quick Start

Run the helper script to start backend + frontend:

```bash
chmod +x start.sh
./start.sh
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

Open frontend/index.html in your browser or serve with a local server:

```bash
cd frontend
python -m http.server 8080
```

## API Endpoints

- `GET /api/live-scores` - Current live matches
- `GET /api/recent-matches` - Recently finished matches
- `GET /api/rankings/{tour}` - ATP/WTA rankings (top 200)
- `GET /api/tournaments/{tour}` - Tournament calendar
- `GET /api/tournament/{id}/bracket` - Tournament bracket/tree
- `GET /api/player/{id}` - Player details

## Data Sources

The dashboard can fetch data from tennis APIs and live score providers. This repo includes realistic demo data for offline use and development.

## Technologies

- **Backend**: Python, Flask, WebSocket
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time**: WebSocket for live updates
- **Styling**: Custom CSS with responsive design

## Notes

- Challenger/Futures events are excluded by design.
- Upcoming tournaments show last year’s winner to distinguish from finished events.
- The bracket panel supports hover match popups and seeded player markers.

## License

MIT License
