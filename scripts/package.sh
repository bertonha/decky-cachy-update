#!/usr/bin/env bash
# Assemble the Decky plugin zip that "Install plugin from ZIP file" expects:
# a single top-level directory named after plugin.json's "name".
set -euo pipefail

cd "$(dirname "$0")/.."

PLUGIN_NAME="CachyOS Update"
ZIP_NAME="decky-cachy-update.zip"
OUT_DIR="out"

rm -rf "$OUT_DIR" "$ZIP_NAME"
mkdir -p "$OUT_DIR/$PLUGIN_NAME/dist"

cp plugin.json main.py package.json "$OUT_DIR/$PLUGIN_NAME/"
cp dist/index.js "$OUT_DIR/$PLUGIN_NAME/dist/"

(cd "$OUT_DIR" && zip -qr "../$ZIP_NAME" "$PLUGIN_NAME")
rm -rf "$OUT_DIR"

echo "Created $ZIP_NAME"
