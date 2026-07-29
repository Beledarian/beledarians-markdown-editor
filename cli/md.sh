#!/bin/sh
# md.sh — Unix wrapper for the Beledarians Markdown Editor CLI
dir="$(cd "$(dirname "$0")" && pwd)"
node "$dir/md.mjs" "$@"
