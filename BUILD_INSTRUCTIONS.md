# Build Instructions for TeleCRM App

## Prerequisites
- Expo account (sign up at https://expo.dev if you don't have one)
- EAS CLI installed (already done)

## Step 1: Login to Expo
```bash
eas login
```
Enter your Expo credentials when prompted.

## Step 2: Configure EAS Build (First Time Only)
```bash
eas build:configure
```

## Step 3: Build APK for Android

### For Testing/Distribution (APK file):
```bash
eas build --platform android --profile preview
```

This will create an APK file that you can:
- Download and install directly on Android devices
- Share with testers
- Distribute outside Google Play Store

### For Google Play Store (AAB file):
```bash
eas build --platform android --profile production
```

## Step 4: Build IPA for iOS

### For Testing (requires Apple Developer account):
```bash
eas build --platform ios --profile preview
```

### For App Store (requires Apple Developer account):
```bash
eas build --platform ios --profile production
```

## Step 5: Download Your Builds

After the build completes:
1. Go to https://expo.dev
2. Navigate to your project
3. Click on "Builds"
4. Download the APK or IPA file

## Alternative: Build Both Platforms at Once
```bash
eas build --platform all --profile preview
```

## Important Notes

### For Android APK:
- No Google Play account needed for APK builds
- APK can be installed directly on devices
- Users need to enable "Install from Unknown Sources"

### For iOS IPA:
- Requires Apple Developer account ($99/year)
- For testing: Use TestFlight or Ad-Hoc distribution
- For App Store: Requires App Store review and approval

### Build Time:
- Android: Usually 10-20 minutes
- iOS: Usually 15-25 minutes

### After Build Completes:
You'll receive:
- Email notification
- Download link in terminal
- Download link at expo.dev dashboard

## Testing the App

### Android:
1. Download the APK file
2. Transfer to your Android device
3. Enable "Install from Unknown Sources" in Settings
4. Tap the APK file to install
5. Open and test the app

### iOS:
1. Download the IPA file from Expo
2. Use TestFlight for distribution to testers
3. Or use Xcode to install on physical devices

## Troubleshooting

If you encounter issues:
1. Make sure you're logged in: `eas whoami`
2. Check build status: `eas build:list`
3. View build logs on expo.dev for detailed error messages

## Production Builds

For production releases:
- Update version in app.json before building
- Use `--profile production` for both platforms
- Android: Upload AAB to Google Play Console
- iOS: Upload IPA through App Store Connect or `eas submit`
