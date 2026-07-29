#!/bin/sh
# mdedit.sh — Unix wrapper for Beledarians Markdown Editor CLI & MCP Server
dir="$(cd "$(dirname "$0")" && pwd)"
node "$dir/md.mjs" "$@"
