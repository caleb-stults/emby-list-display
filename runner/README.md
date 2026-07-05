# Runner Infrastructure

This directory contains the Docker configuration for the GitHub self-hosted runner.

### How to build:
```bash
docker build -t custom-gh-runner:latest ./runner
```

### How to run:
```bash
docker run -d --name runner-instance \
  --restart unless-stopped \
  -e REPO_URL="[https://github.com/caleb-stults/emby-list-display](https://github.com/caleb-stults/emby-list-display)" \
  -e RUNNER_TOKEN="<GET_NEW_TOKEN_FROM_GITHUB>" \
  custom-gh-runner:latest
```
