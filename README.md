<h1 align="center">🎾 Tennis Live Dashboard</h1>
<p align="center"><strong>Real-time ATP & WTA Tennis Tracking for 2026</strong></p>
<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.11+-blue.svg" alt="Python"></a>
  <a href="https://flask.palletsprojects.com/"><img src="https://img.shields.io/badge/Flask-3.0.0-green.svg" alt="Flask"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
  <a href="https://tennis-tour-dashboard.onrender.com"><img src="https://img.shields.io/badge/Live-Demo-brightgreen.svg" alt="Live Demo"></a>
</p>
<p align="center"><em>Your all-in-one tennis companion for live scores, rankings, tournament insights, player analytics, and smart notifications.</em></p>

---

## ✨ Features

### 🔴 Live Match Tracking
- Real-time ATP/WTA live scores with server/game-point context.
- Auto-refresh via SocketIO with polling fallback.



### 🔥 Form — Current rating

- Lightweight match-form metric that reflects a player's recent results relative to expectations. Shows short-term hot/cold streaks alongside the official rating.

  Formula (Elo-style update):

  $$F = R + K \sum_{i=1}^n w_i (S_i - E_i)$$

  where:

  - $R$ = current official rating
  - $K$ = scaling constant (controls sensitivity)
  - $w_i$ = time-decay weight for match $i$ (recent matches larger)
  - $S_i$ = actual score for match $i$ (1 = win, 0.5 = draw, 0 = loss)
  - $E_i = \dfrac{1}{1 + 10^{(O_i - R)/400}}$ is the expected score vs opponent rating $O_i$

  Notes: choose $K$ and $w_i$ to tune responsiveness; the value $F$ is shown alongside the official rating to indicate short-term form.


### 📊 Match Coverage
- Recently finished matches with quick stat breakdowns.
- Upcoming matches (next 2 days) with H2H/prediction insights.

### 🏆 Rankings & Tournaments
- ATP/WTA rankings with update status and refresh actions.
- Tournament calendar + bracket viewer with round points/prize context.

### ⚔️ H2H Analytics
- ATP and WTA search + head-to-head comparison.
- Surface splits, trends, and radar-style metrics.

### 👤 Player Profiles
- Profile cards, country flags, image fallback, and stat summaries.
- Match-level details integrated with dashboard views.

### 📈 Data Analysis Dashboard
- Dedicated ATP/WTA analysis workspace (`/analysis/atp`, `/analysis/wta`).
- Player Explorer, Tournament Explorer, and Records Book.

### 🔔 Smart Notification System
- Multi-rule alert engine with guided rule builder.
- Event types for upcoming/live/result/milestone-style triggers.
- Channels: Email + integrations, cooldowns, quiet hours, run-now testing.
- Launchable from main dashboard button (auto-start helper route).

---

## 🚀 Quick Start

### 🌐 Live Demo
Visit: **[tennis-tour-dashboard.onrender.com](https://tennis-tour-dashboard.onrender.com)**

### 💻 Local Development

#### 1. Option A: Quick Start Script
macOS / Linux (bash):
```bash
./start.sh
```

Windows (PowerShell):

```powershell
bash start.sh
```

#### 2. Option B: Manual Setup

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Frontend (new terminal):

```bash
cd frontend
python3 no_cache_server.py
```

Default local URLs:
- Frontend: `http://localhost:8085`
- Backend: `http://localhost:5001`
- Notification app: `http://localhost:5090`

#### 3. Option: live-score fallback

Live scores come from the ATP and WTA scrapers. If you want a backstop for the
times those are blocked or time out (the ATP gateway sits behind Cloudflare, and
today's fallback is an on-disk snapshot up to 45 minutes old), set an optional
key in `backend/.env`:

```bash
# omit this line to keep the scrapers as the only source
LIVETENNISAPI_KEY=your_key_here
```

Unset, nothing changes. Set, a tour whose scraper *fails* falls back to
[Live Tennis API](https://livetennisapi.com) for that request; a scraper that
succeeds is never second-guessed. Live scores are on its free tier. The mapper
has offline checks that need no key:

```bash
python3 "scripts/[Live] test_livetennisapi_live_matches.py"
```

---

## 🛠️ Tech Stack

### Backend
- ![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white) Python 3.11+
- ![Flask](https://img.shields.io/badge/Flask-3.0.0-000000?logo=flask&logoColor=white) Flask + Flask-SocketIO
- ![Requests](https://img.shields.io/badge/Requests-HTTP-4B8BBE?logo=python&logoColor=white) ![BeautifulSoup](https://img.shields.io/badge/BeautifulSoup-Scraping-43B02A?logo=python&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?logo=playwright&logoColor=white) Requests / BeautifulSoup / Playwright-based data flows

### Frontend
- ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black) HTML/CSS/Vanilla JS (modular files)
- ![UI](https://img.shields.io/badge/UI-Interactive_Components-6C7A89) Interactive charts/visualizations + custom UI components

### Deployment
- ![Render](https://img.shields.io/badge/Render-Cloud_Service-46E3B7?logo=render&logoColor=black) Render.com (Python service)
- ![GitHub](https://img.shields.io/badge/GitHub-Source_%26_CI-181717?logo=github&logoColor=white) GitHub for source and CI flow

---

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check ✅ |
| `GET` | `/api/live-scores?tour=atp\|wta\|both` | Live match scores 🔴 |
| `GET` | `/api/recent-matches?tour=...&limit=...` | Recently completed matches 📋 |
| `GET` | `/api/upcoming-matches?tour=...&days=7` | Upcoming matches 🎯 |
| `GET` | `/api/intro-gifs` | Intro GIF list 🖼️ |

### Rankings & Players

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rankings/<tour>?limit=...` | ATP/WTA rankings 🏆 |
| `GET` | `/api/rankings/atp/status` | ATP rankings status ⏰ |
| `POST` | `/api/rankings/atp/refresh` | Refresh ATP rankings 🔄 |
| `GET` | `/api/rankings/wta/status` | WTA rankings status ⏰ |
| `POST` | `/api/rankings/wta/refresh` | Refresh WTA rankings 🔄 |
| `GET` | `/api/player/<id>` | Player profile 👤 |
| `GET` | `/api/player/<tour>/<player_id>/image` | Player image route 📸 |

### Tournaments & Brackets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tournaments/<tour>` | Tournament calendar 📅 |
| `GET` | `/api/tournament/<id>/bracket?tour=...` | Tournament bracket 🌳 |
| `GET` | `/api/categories` | Category list 🏷️ |

### Head-to-Head

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/h2h/atp/search?query=...&limit=...` | ATP player search 🔍 |
| `GET` | `/api/h2h/wta/search?query=...&limit=...` | WTA player search 🔍 |
| `GET` | `/api/h2h/atp?player1_id=...&player2_id=...` | ATP H2H ⚔️ |
| `GET` | `/api/h2h/wta?player1_id=...&player2_id=...&year=2026&meetings=5` | WTA H2H ⚔️ |

### System Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/system/analysis` | Update analysis summary 📈 |
| `POST` | `/api/system/update` | Trigger update pipeline 🔄 |
| `GET` | `/api/system/update/status` | Update progress 📊 |
| `GET` | `/api/notifications/status` | Notification service status 🔔 |
| `POST` | `/api/notifications/launch` | Launch notification service 🚀 |
| `GET` | `/notifications/open` | Open notification page 🌐 |

### 🔔 Notification System Endpoints (port `5090`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | State: settings/rules/history/config ⚙️ |
| `POST` | `/api/settings` | Save delivery settings 📝 |
| `GET` | `/api/options` | Player/tournament options 🔍 |
| `POST` | `/api/rules` | Create rule ✨ |
| `PUT` | `/api/rules/<rule_id>` | Update rule 🔧 |
| `DELETE` | `/api/rules/<rule_id>` | Delete rule 🗑️ |
| `POST` | `/api/run-now` | Manual run 🚀 |
| `POST` | `/api/test-email` | Send test email 📧 |
| `POST` | `/api/history/clear` | Clear run history 🔄 |

---

## 📁 Project Structure

```bash
Tennis-Dashboard/
├── backend/
│   ├── app.py
│   ├── tennis_api.py
│   ├── config.py
│   ├── requirements.txt
│   └── notification_system/
│       ├── app.py
│       ├── storage/subscriptions.json
│       ├── templates/index.html
│       └── static/{app.js,styles.css,favicon.svg}
├── frontend/
│   ├── index.html
│   ├── update.html
│   ├── no_cache_server.py
│   ├── css/
│   ├── js/
│   └── vendor/
├── data/
├── data_analysis/
├── scripts/
├── Images/
├── start.sh
├── start_local.sh
├── README.md
├── LICENSE
└── .gitignore
```

---

## 📸 Interface Gallery

| Title | Preview | Description |
|---|---|---|
| Loading Intro | ![Loading intro page](Images/loading%20intro.png) | Intro/loading screen. |
| Main Interface | ![Main interface](Images/Interface_Live%20results_recent%20scores_upcoming%20matches.png) | Main dashboard layout. |
| Main Interface (Alt) | ![Alternative interface](Images/Interface_Live%20results_recent%20scores_upcoming%20matches%202.png) | Alternate dashboard composition. |
| Upcoming Match Insights | ![Upcoming match insights](Images/Upcoming%20match%20insights.png) | Upcoming card with insights. |
| Live Rankings and Calendar | ![Live rankings and calendar](Images/Live%20Rankings%20and%20calender.png) | Rankings + calendar + bracket workspace. |
| Favourites Panel | <img src="Images/Favourite%20panel.png" alt="Favourites panel" width="50%"> | Favourite players side panel. |
| H2H Analytics View 1 | ![H2H view 1](Images/H2H_1.png) | First H2H analysis screen. |
| H2H Analytics View 2 | ![H2H view 2](Images/H2H_2.png) | Detailed H2H comparison screen. |
| Player Stats Card 1 | ![Player stats 1](Images/Player_stats_1.png) | Player profile card style 1. |
| Player Stats Card 2 | ![Player stats 2](Images/Player_stats_2.png) | Player profile card style 2. |
| **Stats Table** | ![Stats table](Images/stat%20table.png) | Tabular stats comparison layout. |
| **Serving Stats Index** | ![Serving stat index](Images/Serving%20stat%20index.png) | Serving metrics index view. |
| Notification System | ![Notification system](Images/Nortification%20system.png) | Notification rules + controls page. |
| Notification System (Detail) | ![Notification system 2](Images/Nortification%20system%202.png) | Notification detail workflow view. |

---

## 📊 Data Analysis Dashboard

| Title | Preview | Description |
|---|---|---|
| Player Analysis | ![Analysis player](Images/Analysis_player.png) | Core player analysis workspace. |
| Player Analysis - Additional View | ![Analysis player 2](Images/Analysis_player%202.png) | Additional player perspective. |
| Player Analysis - Advanced Metrics | ![Analysis player 3](Images/Analysis_player%203.png) | Advanced metrics panel. |
| Player Match Analysis | ![Analysis player matches](Images/Analysis_player%20Matches.png) | Match-level player analysis. |
| Tournament Analysis | ![Analysis tournament](Images/Analyis_Tournament.png) | Tournament explorer screen. |
| Records Book | ![Analysis record book](Images/Analysis_Record%20book.png) | Historical records and holders. |
| Ranking Points Analysis | ![Analysis ranking points](Images/Analysis_ranking_points.png) | Ranking points trends. |

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

<p align="center"><strong>⭐ Star this repo if you find it useful! ⭐</strong></p>
<p align="center">
  <a href="https://github.com/maninka123/Tennis-tour-dashboard/stargazers"><img src="https://img.shields.io/github/stars/maninka123/Tennis-tour-dashboard?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/maninka123/Tennis-tour-dashboard/network/members"><img src="https://img.shields.io/github/forks/maninka123/Tennis-tour-dashboard?style=social" alt="GitHub forks"></a>
</p>
<p align="center">Made with 🎾 and ☕ | © 2026 Tennis Dashboard</p>
