# Emby List Display

A lightweight, automated media dashboard that syncs a self-hosted Emby library catalog with a static public web page hosted on GitHub Pages.

## What It Does
This project uses a Node.js scraper script (`fetch-media.js`) to generate a JSON catalog from your Emby server. It utilizes a containerized CI/CD pipeline to build the scraper, which is then executed by a GitHub Actions self-hosted runner to update your web dashboard.

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
1. **Scraper Container**
The root `Dockerfile` packages the Node.js scraper. Whenever you push changes to `fetch-media.js`, the `build-image.yml` workflow triggers, building and pushing a new image to Docker Hub.

2. **Runner Infrastructure**
The `runner` directory contains the Docker configuration for the GitHub self-hosted runner.

### How to build:
```bash
cd runner
docker build -t custom-gh-runner:latest .
```

### How to run:
```bash
docker run -d --name runner-instance \
  --restart always \
  -e REPO_URL="[https://github.com/caleb-stults/emby-list-display](https://github.com/caleb-stults/emby-list-display)" \
  -e RUNNER_TOKEN="<GET_NEW_TOKEN_FROM_GITHUB>" \
  custom-gh-runner:latest
```
