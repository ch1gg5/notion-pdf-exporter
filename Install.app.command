#!/bin/bash
cd "$(dirname "$0")"
echo "📦 Installing dependencies…"
npm install
echo ""
echo "✅ All done!"
echo "You can now double-click 'Launch.app.command' to start the app."
echo ""
read -p "Press Enter to close this window..."