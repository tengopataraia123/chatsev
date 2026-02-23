#!/bin/sh

# Exit if any command fails
set -e

# Path to your repository
cd /root/chatsev

# Remember last commit hash
BRANCH="main"

while true; do
    echo "[$(date)] Fetching latest changes..."
    # Fetch remote changes
    git fetch origin main

    LOCAL=$(git rev-parse "$BRANCH")
    REMOTE=$(git rev-parse "origin/$BRANCH")

    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "[Updater] No new changes."
    else
        # Ensure on main
        git checkout main

        # Pull changes
        git pull origin main

        # Rebuild your project (replace with your build command)
        echo "[$(date)] Rebuilding project..."

        /root/deploy.sh
    fi

  # Wait 20 seconds before next check
  sleep 20
done
