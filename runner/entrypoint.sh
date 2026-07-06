#!/bin/bash
./config.sh --url https://github.com/caleb-stults/emby-list-display \
            --token $RUNNER_TOKEN \
            --name "emby-scraper-runner" \
            --unattended --replace

./run.sh
