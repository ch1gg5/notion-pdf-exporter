cat > package.json << 'EOF'
{
  "name": "notion-pdf-exporter",
  "version": "1.0.0",
  "description": "Convert Notion HTML exports to PDFs",
  "author": "ch1gg5",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac --universal",
    "dist": "electron-builder --mac --universal"
  },
  "dependencies": {
    "puppeteer": "^22.0.0"
  },
  "devDependencies": {
    "electron": "^29.0.0",
    "electron-builder": "^24.9.1"
  },
  "build": {
    "appId": "com.notionpdf.exporter",
    "productName": "Notion PDF Exporter",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "index.html",
      "landing.html",
      "convert.js"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "icon.icns",
      "target": ["dmg", "zip"],
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "entitlements.plist",
      "entitlementsInherit": "entitlements.plist"
    }
  }
}
EOF