#!/data/data/com.termux/files/usr/bin/sh
set -eu

config_file="${AKIPASA_CONFIG_FILE:-$HOME/.config/akipasa-automation/env}"
client_file="${AKIPASA_CLIENT_FILE:-$HOME/akipasa-automation/send-voice-request.mjs}"

if [ ! -f "$config_file" ]; then
  echo "Missing private AkiPasa configuration: $config_file" >&2
  exit 2
fi

permissions="$(stat -c '%a' "$config_file")"
case "$permissions" in
  600|400) ;;
  *)
    echo "AkiPasa configuration must have permissions 600 or 400." >&2
    exit 2
    ;;
esac

set -a
. "$config_file"
set +a

command="${1:-send the boys the numbers}"
exec node "$client_file" "$command"
