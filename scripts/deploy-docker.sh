#!/usr/bin/env bash
set -euo pipefail

docker build -t copilot-session-visualizer .

if docker container inspect copilot-session-visualizer >/dev/null 2>&1; then
	docker rm -f copilot-session-visualizer
fi

docker run -d --name copilot-session-visualizer --restart unless-stopped --user root -e HOME=/root -v ~/.copilot:/root/.copilot:ro copilot-session-visualizer
