#!/usr/bin/env bash
set -euo pipefail

NAME=agent-session-visualizer

docker build -t "$NAME" .

if docker container inspect "$NAME" >/dev/null 2>&1; then
	docker rm -f "$NAME"
fi

# Mount only the transcript paths the app reads, read-only. Deliberately narrow:
# ~/.codex/auth.json and ~/.copilot/config.json hold credentials and stay out.
PATHS=(
	".copilot/session-state"
	".copilot/logs"
	".copilot/session-store.db"
	".copilot/session-store.db-shm"
	".copilot/session-store.db-wal"
	".claude/projects"
	".codex/sessions"
	".codex/session_index.jsonl"
)

mounts=()
for rel in "${PATHS[@]}"; do
	if [ -e "$HOME/$rel" ]; then
		mounts+=(-v "$HOME/$rel:/root/$rel:ro")
	fi
done

if [ ${#mounts[@]} -eq 0 ]; then
	echo "No agent session directories found under $HOME (.copilot / .claude / .codex)." >&2
	exit 1
fi

docker run -d --name "$NAME" --restart unless-stopped --user root -e HOME=/root \
	"${mounts[@]}" "$NAME"
