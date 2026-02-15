# 🎾 Tennis Live Dashboard

**Real-time ATP & WTA Tennis Tracking for 2026**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/) [![Flask](https://img.shields.io/badge/Flask-3.0.0-green.svg)](https://flask.palletsprojects.com/) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://tennis-tour-dashboard.onrender.com)

*Your all-in-one tennis companion for live scores, rankings, tournament insights, player analytics, and smart notifications.*

---

## ✨ Features

### 🔴 Live Match Tracking

-   Real-time ATP/WTA live scores with server/game-point context.
-   Auto-refresh via SocketIO with polling fallback.

### 📊 Match Coverage

-   Recently finished matches with quick stat breakdowns.
-   Upcoming matches (next 2 days) with H2H/prediction insights.

### 🏆 Rankings & Tournaments

-   ATP/WTA rankings with update status and refresh actions.
-   Tournament calendar + bracket viewer with round points/prize context.

### ⚔️ H2H Analytics

-   ATP and WTA search + head-to-head comparison.
-   Surface splits, trends, and radar-style metrics.

### 👤 Player Profiles

-   Profile cards, country flags, image fallback, and stat summaries.
-   Match-level details integrated with dashboard views.

### 📈 Data Analysis Dashboard

-   Dedicated ATP/WTA analysis workspace (`/analysis/atp`, `/analysis/wta`).
-   Player Explorer, Tournament Explorer, and Records Book.

### 🔔 Smart Notification System

-   Multi-rule alert engine with guided rule builder.
-   Event types for upcoming/live/result/milestone-style triggers.
-   Channels: Email + integrations, cooldowns, quiet hours, run-now testing.
-   Launchable from main dashboard button (auto-start helper route).

---

## 🚀 Quick Start

### 🌐 Live Demo

Visit: **[tennis-tour-dashboard.onrender.com](https://tennis-tour-dashboard.onrender.com)**

### 💻 Local Development

#### 1. Option A: Quick Start Script

```bash
./start.sh
```

#### 2. Option B: Manual Setup

Backend:

```bash
cd backendpython3 -m venv venvsource venv/bin/activate  # Windows: venvScriptsactivatepip install -r requirements.txtpython app.py
```

Frontend (new terminal):

```bash
cd frontendpython3 no_cache_server.py
```

Default local URLs:

-   Frontend: `http://localhost:8085`
-   Backend: `http://localhost:5001`
-   Notification app: `http://localhost:5090`

---

## 🛠️ Tech Stack

### Backend

-   ![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white) Python 3.11+
-   ![Flask](https://img.shields.io/badge/Flask-3.0.0-000000?logo=flask&logoColor=white) Flask + Flask-SocketIO
-   ![Requests](https://img.shields.io/badge/Requests-HTTP-4B8BBE?logo=python&logoColor=white) ![BeautifulSoup](https://img.shields.io/badge/BeautifulSoup-Scraping-43B02A?logo=python&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?logo=playwright&logoColor=white) Requests / BeautifulSoup / Playwright-based data flows

### Frontend

-   ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black) HTML/CSS/Vanilla JS (modular files)
-   ![UI](https://img.shields.io/badge/UI-Interactive_Components-6C7A89) Interactive charts/visualizations + custom UI components

### Deployment

-   ![Render](https://img.shields.io/badge/Render-Cloud_Service-46E3B7?logo=render&logoColor=black) Render.com (Python service)
-   ![GitHub](https://img.shields.io/badge/GitHub-Source_%26_CI-181717?logo=github&logoColor=white) GitHub for source and CI flow

---

## 📡 API Endpoints

### Core Endpoints

Method

Endpoint

Description

`GET`

`/api/health`

Health check ✅

`GET`

`/api/live-scores?tour=atp|wta|both`

Live match scores 🔴

`GET`

`/api/recent-matches?tour=...&limit=...`

Recently completed matches 📋

`GET`

`/api/upcoming-matches?tour=...&days=7`

Upcoming matches 🎯

`GET`

`/api/intro-gifs`

Intro GIF list 🖼️

### Rankings & Players

Method

Endpoint

Description

`GET`

`/api/rankings/<tour>?limit=...`

ATP/WTA rankings 🏆

`GET`

`/api/rankings/atp/status`

ATP rankings status ⏰

`POST`

`/api/rankings/atp/refresh`

Refresh ATP rankings 🔄

`GET`

`/api/rankings/wta/status`

WTA rankings status ⏰

`POST`

`/api/rankings/wta/refresh`

Refresh WTA rankings 🔄

`GET`

`/api/player/<id>`

Player profile 👤

`GET`

`/api/player/<tour>/<player_id>/image`

Player image route 📸

### Tournaments & Brackets

Method

Endpoint

Description

`GET`

`/api/tournaments/<tour>`

Tournament calendar 📅

`GET`

`/api/tournament/<id>/bracket?tour=...`

Tournament bracket 🌳

`GET`

`/api/categories`

Category list 🏷️

### Head-to-Head

Method

Endpoint

Description

`GET`

`/api/h2h/atp/search?query=...&limit=...`

ATP player search 🔍

`GET`

`/api/h2h/wta/search?query=...&limit=...`

WTA player search 🔍

`GET`

`/api/h2h/atp?player1_id=...&player2_id=...`

ATP H2H ⚔️

`GET`

`/api/h2h/wta?player1_id=...&player2_id=...&year=2026&meetings=5`

WTA H2H ⚔️

### System Management

Method

Endpoint

Description

`GET`

`/api/system/analysis`

Update analysis summary 📈

`POST`

`/api/system/update`

Trigger update pipeline 🔄

`GET`

`/api/system/update/status`

Update progress 📊

`GET`

`/api/notifications/status`

Notification service status 🔔

`POST`

`/api/notifications/launch`

Launch notification service 🚀

`GET`

`/notifications/open`

Open notification page 🌐

### 🔔 Notification System Endpoints (port `5090`)

Method

Endpoint

Description

`GET`

`/api/state`

State: settings/rules/history/config ⚙️

`POST`

`/api/settings`

Save delivery settings 📝

`GET`

`/api/options`

Player/tournament options 🔍

`POST`

`/api/rules`

Create rule ✨

`PUT`

`/api/rules/<rule_id>`

Update rule 🔧

`DELETE`

`/api/rules/<rule_id>`

Delete rule 🗑️

`POST`

`/api/run-now`

Manual run 🚀

`POST`

`/api/test-email`

Send test email 📧

`POST`

`/api/history/clear`

Clear run history 🔄

---

## 📁 Project Structure

```bash
Tennis-Dashboard/├── backend/│   ├── app.py│   ├── tennis_api.py│   ├── config.py│   ├── requirements.txt│   └── notification_system/│       ├── app.py│       ├── storage/subscriptions.json│       ├── templates/index.html│       └── static/{app.js,styles.css,favicon.svg}├── frontend/│   ├── index.html│   ├── update.html│   ├── no_cache_server.py│   ├── css/│   ├── js/│   └── vendor/├── data/├── data_analysis/├── scripts/├── Images/├── start.sh├── start_local.sh├── README.md├── LICENSE└── .gitignore
```

---

## 📸 Interface Gallery

Title

Preview

Description

Loading Intro

![Loading intro page](Images/loading%20intro.png)

Animated intro with branded loading cues.

Main Interface

![Main interface](Images/Interface_Live%20results_recent%20scores_upcoming%20matches.png)

Live scores, recent results, and upcoming matches in one view.

Main Interface (Alt)

![Alternative interface](Images/Interface_Live%20results_recent%20scores_upcoming%20matches%202.png)

Alternative layout emphasizing cards and quick stats.

Upcoming Match Insights

![Upcoming match insights](Images/Upcoming%20match%20insights.png)

Prediction cards with H2H, form, and surface context.

Live Rankings and Calendar

![Live rankings and calendar](Images/Live%20Rankings%20and%20calender.png)

Rankings status plus calendar and bracket access.

Favourites Panel

![Favourites panel](Images/Favourite%20panel.png)

Pinned players with quick jump and snapshot stats.

H2H Analytics

![H2H view 1](Images/H2H_1.png)

Head-to-head overview with key metrics.

H2H Analytics (Cont.)

![H2H view 2](Images/H2H_2.png)

Side-by-side comparison with trend indicators.

Player Stats

![Player stats 1](Images/Player_stats_1.png)

Player bio card with season and surface splits.

Player Stats  
(Cont.)

![Player stats 2](Images/Player_stats_2.png)

Expanded stat blocks and recent form panel.

**Stats Table**

![Stats table](Images/stat%20table.png)

Dense comparison table for match and season stats.

**Serving Stats Index**

![Serving stat index](Images/Serving%20stat%20index.png)

Serving KPI index with percentile bars.

Notification System

![Notification system](Images/Nortification%20system.png)

Rules list, toggles, and live run controls.

Notification System (Detail)

![Notification system 2](Images/Nortification%20system%202.png)

Rule builder with filters, channels, and timing.

---

## 📊 Data Analysis Dashboard

Title

Preview

Description

Player Analysis

![Analysis player](Images/Analysis_player.png)

Player explorer with filters and trend charts.

Player Analysis - Additional View

![Analysis player 2](Images/Analysis_player%202.png)

Deep-dive view with profile and stat panels.

Player Analysis - Advanced Metrics

![Analysis player 3](Images/Analysis_player%203.png)

Advanced metrics and radar comparisons.

Player Match Analysis

![Analysis player matches](Images/Analysis_player%20Matches.png)

Match-by-match breakdown with surface splits.

Tournament Analysis

![Analysis tournament](Images/Analyis_Tournament.png)

Tournament explorer with draws and stats.

Records Book

![Analysis record book](Images/Analysis_Record%20book.png)

All-time records with holders and context.

Ranking Points Analysis

![Analysis ranking points](Images/Analysis_ranking_points.png)

Points distribution and ranking movement trends.

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

**⭐ Star this repo if you find it useful! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/maninka123/Tennis-tour-dashboard?style=social)](https://github.com/maninka123/Tennis-tour-dashboard/stargazers) [![GitHub forks](https://img.shields.io/github/forks/maninka123/Tennis-tour-dashboard?style=social)](https://github.com/maninka123/Tennis-tour-dashboard/network/members)

Made with 🎾 and ☕ | © 2026 Tennis Dashboard