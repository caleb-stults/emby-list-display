# Emby List Display

A lightweight, automated media dashboard that syncs a self-hosted Emby library catalog with a static public web page hosted on GitHub Pages.

## What It Does
This project runs a Node.js scraper script (`fetch-media.js`) on the local home server via a daily cron job. The script queries a local Emby media server API using 4.9+ collection endpoints, optimizes the metadata, downloads relevant poster images, and outputs a compressed JSON payload inside a `/docs` web root directory. A companion shell script (`sync.sh`) handles tracking differences and pushes updates automatically to GitHub Pages. The public web interface serves as a static display board.

## System Architecture Layout

```text
├── runner/      # Docker configuration for self-hosted runner
├── .gitignore           # Safeguards protecting local environments
├── fetch-media.js       # Core Node.js API collection engine
└── docs/                # Public GitHub Pages Web Root Folder
    ├── index.html       # Client interface layout dashboard
    ├── icon.png         # User-provided site icon and favicon asset
    └── data/            # Automatically populated media databases
        ├── media.json   # Clean filtered catalog arrays
        └── posters/     # Compressed local artwork cache
```

## Setup & Operation
1. GitHub Secrets: Configure `EMBY_URL` and `EMBY_API_KEY` in your repository under Settings > Secrets and variables > Actions.
2. Assets: Place your custom asset named exactly `icon.png` into the `docs/` folder to serve as the site icon.
3. Runner: Build and deploy the infrastructure (see below). Once the runner is active, GitHub Actions will handle the synchronization automatically on the schedule defined in your workflow.

## Runner Infrastructure

The `runner` directory contains the Docker configuration for the GitHub self-hosted runner.

### How to build:
```bash
cd runner
docker build -t custom-gh-runner:latest .
```

### How to run:
```bash
docker run -d --name runner-instance \
  --restart unless-stopped \
  -e REPO_URL="[https://github.com/caleb-stults/emby-list-display](https://github.com/caleb-stults/emby-list-display)" \
  -e RUNNER_TOKEN="<GET_NEW_TOKEN_FROM_GITHUB>" \
  custom-gh-runner:latest
```
**Note:** This runner is ephemeral. If you restart the container or rebuild the image, you will need to generate a new registration token from the GitHub repository Settings > Actions > Runners page.
