#!/bin/bash
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Building Notion PDF Exporter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Create dist folder if it doesn't exist
mkdir -p dist

# Build the app
echo "🔨 Building Mac app (this may take a few minutes)..."
echo ""

npm run dist

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BUILD COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Your app is in: dist/"
echo ""
echo "📦 Files created:"
ls -la dist/ | grep -E "\.(app|dmg|zip)$"
echo ""
echo "📤 To share with others:"
echo "   Send them the .dmg or .zip file"
echo ""
echo "📥 To install on your Mac:"
echo "   Drag 'Notion PDF Exporter.app' to Applications"
echo ""

read -p "Press Enter to close this window..."