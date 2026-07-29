#!/usr/bin/env bash
# macOS/Linux CLI & MCP Installer for Beledarian's Markdown Editor

set -euo pipefail

echo "Installing 'mdedit' & 'md' CLI for Beledarian's Markdown Editor..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MD_SH="${DIR}/md.sh"
MDEDIT_SH="${DIR}/mdedit.sh"

if [ ! -f "${MD_SH}" ]; then
    echo "Error: md.sh not found in ${DIR}"
    exit 1
fi

chmod +x "${MD_SH}"
chmod +x "${MDEDIT_SH}"

TARGET_DIR="/usr/local/bin"
IS_SYSTEM=0

if [ -w "${TARGET_DIR}" ]; then
    IS_SYSTEM=1
else
    echo "Notice: No write permission to ${TARGET_DIR}. Falling back to ~/.local/bin"
    TARGET_DIR="${HOME}/.local/bin"
    mkdir -p "${TARGET_DIR}"
fi

for CMD_NAME in "mdedit" "md"; do
    TARGET_FILE="${TARGET_DIR}/${CMD_NAME}"
    if [ -L "${TARGET_FILE}" ] || [ -f "${TARGET_FILE}" ]; then
        rm -f "${TARGET_FILE}"
    fi

    if [ "${IS_SYSTEM}" -eq 1 ]; then
        cp -f "${MD_SH}" "${TARGET_FILE}"
        chmod 755 "${TARGET_FILE}"
    else
        ln -s "${MD_SH}" "${TARGET_FILE}"
    fi
done

echo ""
echo "Installation complete!"
echo "You can now use 'mdedit' or 'md' commands from anywhere."
echo ""
echo "CLI Examples:"
echo "  mdedit open my_file.md"
echo "  mdedit new draft.md"
echo "  mdedit status"
echo ""
echo "MCP Server Execution for AI Agents:"
echo "  mdedit mcp"
echo ""

if [[ ":$PATH:" != *":$TARGET_DIR:"* ]]; then
    echo "Note: $TARGET_DIR is not in your PATH."
    echo "Please add it to your ~/.bashrc or ~/.zshrc:"
    echo "  export PATH=\"\$PATH:$TARGET_DIR\""
fi
