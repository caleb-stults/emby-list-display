# Emby List Display

A lightweight, automated media dashboard that syncs a self-hosted Emby library catalog with a static public web page hosted on GitHub Pages.

## What It Does
This project runs a Node.js scraper script (`fetch-media.js`) on the local home server via a daily cron job. The script queries a local Emby media server API using 4.9+ collection endpoints, optimizes the metadata, downloads relevant poster images, and outputs a compressed JSON payload inside a `/docs` web root directory. A companion shell script (`sync.sh`) handles tracking differences and pushes updates automatically to GitHub Pages. The public web interface serves as a static display board.

## System Architecture Layout

```text
├── .env                 # Secret API keys and loopback server IP configurations
├── .gitignore           # Safeguards protecting local environments from being leaked
├── fetch-media.js       # Core Node.js API collection engine
├── sync.sh              # Orchestration bash script running Git deployments
└── docs/                # Public GitHub Pages Web Root Folder
    ├── index.html       # Client interface layout dashboard
    ├── icon.png         # User-provided site icon and favicon asset
    └── data/            # Automatically populated media databases
        ├── media.json   # Clean filtered catalog arrays
        └── posters/     # Compressed local artwork cache
```

## Setup & Operation
1. Configure local endpoint keys inside `.env` (`EMBY_URL=http://127.0.0.1:8096`, `EMBY_API_KEY`).
2. Run `npm install dotenv` to map environment configuration variables.
3. Drop your custom asset named exactly `icon.png` into the `docs/` folder to serve as the favicon and page title icon.
4. Execute `./sync.sh` to populate data arrays and perform the initial branch push.
5. Register a local system crontab line to automate library synchronization nightly.
