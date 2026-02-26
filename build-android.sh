#!/bin/bash

echo "🚀 Building APK and iOS for Testing..."
echo ""

# Check authentication
echo "📝 Checking EAS login..."
if ! npx eas-cli whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to EAS. Please run: npx eas-cli login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Build Android APK
echo "📱 Building Android APK..."
npx eas-cli build --platform android --profile preview --wait

echo ""
echo "🍎 Building iOS..."
npx eas-cli build --platform ios --profile preview --wait

echo ""
echo "✅ Done! Your builds are ready:"
echo "   Android: APK available for download"
echo "   iOS: Build ready for TestFlight upload"
echo ""
echo "Check your EAS dashboard: https://expo.dev"
