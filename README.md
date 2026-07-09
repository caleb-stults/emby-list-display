# Emby List Display

A lightweight, automated media dashboard that syncs a self-hosted Emby library catalog with a static public web page hosted on GitHub Pages.

## What It Does
This project uses a Node.js scraper script (`fetch-media.js`) to generate a JSON catalog from your Emby server. It utilizes a containerized CI/CD pipeline to build the scraper, which is then executed by a GitHub Actions self-hosted runner to update your web dashboard.

## Features
* **Media Cataloging:** Automatically fetches and organizes your Emby Movies and TV Shows.
* **Smart Filtering:** Supports Genre sorting, Title search, and dynamic tab switching.
* **"New" Media Tab:** Instantly view all recently added media (added within the last 30 days) in a dedicated tab.
* **Automated Sync:** Zero-touch deployment using a local self-hosted runner and Dockerized CI/CD.

## System Architecture Layout

```text
├── runner/              # Docker configuration for self-hosted runner
├── .github/workflows/   # CI/CD Pipeline definitions
├── .gitignore           # Safeguards protecting local environments
├── fetch-media.js       # Core Node.js API collection engine
├── Dockerfile           # Scraper environment definition
└── docs/                # Public GitHub Pages Web Root Folder
    ├── assets/          # CSS and JS source files
    ├── index.html       # Client interface layout dashboard
    ├── icon.png         # User-provided site icon
    └── data/            # Automatically populated media databases
        ├── media.json   # Clean filtered catalog arrays
        └── posters/     # Compressed local artwork cache
```

## Setup & Operation
1. **GitHub Secrets:** Configure `EMBY_URL`, `EMBY_API_KEY`, `DOCKERHUB_USERNAME`, and `DOCKERHUB_TOKEN` in your repository under Settings > Secrets and variables > Actions.
2. **Assets:** Place your custom asset named exactly `icon.png` into the `docs/` folder to serve as the site icon.
3. **Runner:** Build and deploy the infrastructure (see below). Once the runner is active, GitHub Actions will use it to pull the latest scraper image and sync your data.

## Runner Infrastructure
1. **The Runner (`build-image.yml`):** Runs on every commit. It builds and pushes the latest `emby-list-fetcher` container to Docker Hub.
2. **The Application (`sync.yml`):** Runs on a schedule (or manually via `workflow_dispatch`). It pulls the latest image from Docker Hub and executes it on your local server.

### How to run the Runner:
*Ensure you start the runner with `--network host` to allow the container to reach your local Emby server:*

```bash
docker run -d --name runner-instance \
  --restart always \
  --network host \
  -e REPO_URL="[https://github.com/your-username/your-repo](https://github.com/your-username/your-repo)" \
  -e RUNNER_TOKEN="YOUR_NEW_TOKEN_HERE" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  custom-gh-runner:latest
