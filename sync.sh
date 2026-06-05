#!/bin/bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
cd "$SCRIPT_DIR"

git pull origin main

node fetch-media.js

git add docs/
git add package.json package-lock.json fetch-media.js sync.sh .gitignore

if ! git diff-index --quiet HEAD; then
    echo "Media inventory modifications discovered. Commencing code sync sequences..."
    git commit -m "Automated Sync: Media database update $(date +'%Y-%m-%d %H:%M')"
    git push origin main
else
    echo "Zero library delta modifications tracked. Halting sync push execution."
fi
