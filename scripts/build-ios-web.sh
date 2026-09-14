#!/usr/bin/env bash
# Build web assets for iOS (relative paths, VITE_IOS_SHELL=1) and copy to ios/Web/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
cd "$ROOT"

echo "Building iOS web assets..."
npm run build:ios:web

echo "Copying dist-ios/ → ios/Web/"
rm -rf ios/Web
mkdir -p ios/Web
cp -R dist-ios/* ios/Web/

echo "✓ ios/Web/ ready for XcodeGen"
