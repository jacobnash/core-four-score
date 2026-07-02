#!/usr/bin/env bash
# Start local Firebase Emulator + seed data + Expo web dev server (Mac)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

cleanup() {
  if [[ -n "${EMU_PID:-}" ]] && kill -0 "$EMU_PID" 2>/dev/null; then
    echo ""
    echo "Stopping Firebase Emulator (pid $EMU_PID)..."
    kill "$EMU_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo ""
echo "=== Core Four Score — Local Dev ==="
echo ""

if ! command -v java &>/dev/null; then
  echo "❌ Java is required for the Firebase Emulator."
  echo "   Install: brew install openjdk"
  exit 1
fi

echo "Starting Firebase Emulator..."
npx firebase-tools emulators:start --only firestore,auth &
EMU_PID=$!

echo "Waiting for emulator to be ready..."
sleep 6

echo ""
npm run dev:seed

echo ""
echo "Starting Expo web (emulator mode)..."
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true npx expo start --web
