# Apple App Store Submission Guide

> This document covers Mac-only steps needed after all Windows-side preparation is complete.

## Prerequisites

- Apple Developer Account ($99/year) — requires D-U-N-S number
- Mac with Xcode 15+ installed
- Node.js 20+ and npm on the Mac
- Apple Developer Team ID (replace `TEAM_ID` in `public/.well-known/apple-app-site-association`)

## Step 1: Clone and Set Up on Mac

```bash
git clone https://github.com/jackosaurus2014/spacehub.git
cd spacehub
npm install
```

## Step 2: Generate iOS Project

```bash
npx cap add ios
npx cap sync ios
```

This creates the `ios/` directory with the Xcode project.

## Step 3: Configure Xcode Project

1. Open in Xcode:
   ```bash
   npx cap open ios
   ```

2. Select the `App` target and configure:
   - **Bundle Identifier**: `com.spacenexus.app`
   - **Display Name**: `SpaceNexus`
   - **Deployment Target**: iOS 16.0
   - **Device Orientation**: Portrait, Landscape Left, Landscape Right
   - **Status Bar Style**: Light Content

3. Under **Signing & Capabilities**:
   - Enable Automatic Signing with your Apple Developer Team
   - Add capability: **Push Notifications**
   - Add capability: **Associated Domains**
     - Add domain: `applinks:spacenexus.us`
     - Add domain: `webcredentials:spacenexus.us`

4. Under **Info** tab, add these keys:
   - `NSFaceIDUsageDescription`: "SpaceNexus uses Face ID for secure authentication"
   - `NSCameraUsageDescription`: "SpaceNexus uses the camera for profile photos" (if needed)

5. Copy `ios-assets/PrivacyInfo.xcprivacy` into the Xcode project:
   - Drag the file into `App/App` in Xcode's file navigator
   - Ensure "Copy items if needed" is checked

## Step 4: Configure APNs

1. Go to Apple Developer Portal > Certificates, Identifiers & Profiles
2. Under Keys, create a new key:
   - Name: `SpaceNexus Push`
   - Enable: Apple Push Notifications service (APNs)
3. Download the `.p8` key file
4. Note the Key ID and Team ID
5. Add to Railway environment variables:
   - `APNS_KEY_ID` — the key ID from step 4
   - `APNS_TEAM_ID` — your Apple Developer Team ID
   - `APNS_PRIVATE_KEY` — contents of the .p8 file (base64 encoded)

## Step 5: Update Associated Domains

Replace `TEAM_ID` in `public/.well-known/apple-app-site-association` with your actual Apple Developer Team ID, then deploy to production.

## Step 6: Build and Archive

1. In Xcode, select **Product > Archive**
2. Once archived, click **Distribute App**
3. Choose **App Store Connect**
4. Follow the wizard to upload

Alternatively, use Transporter app to upload the IPA.

## Step 7: App Store Connect Configuration

### App Information
- **App Name** (30 chars): `SpaceNexus`
- **Subtitle** (30 chars): `Space Industry Intelligence`
- **Primary Category**: Business
- **Secondary Category**: News
- **Copyright**: `2026 SpaceNexus LLC`

### Pricing
- **Price**: Free
- **In-App Purchases**: Pro ($29/mo), Enterprise ($149/mo)

### Metadata
- **Promotional Text** (170 chars):
  `Real-time space industry intelligence. Track launches, markets, 100+ companies, news from 50+ sources. The Bloomberg Terminal for space.`

- **Description** (4000 chars):
  Adapt from `android-twa/PLAY-STORE-LISTING.md` — same content works for both stores.

- **Keywords** (100 chars):
  `space,launches,satellite,tracking,market,intelligence,NASA,SpaceX,rockets,aerospace`

- **What's New**:
  ```
  Initial release of SpaceNexus for iOS.
  - Live launch tracking with countdown timers
  - Space industry market intelligence
  - Real-time news from 50+ sources
  - Company profiles for 100+ space companies
  - Space marketplace
  - Face ID authentication
  - Native push notifications
  ```

- **Support URL**: `https://spacenexus.us/faq`
- **Marketing URL**: `https://spacenexus.us`
- **Privacy Policy URL**: `https://spacenexus.us/privacy`

### Screenshots
Upload from `public/apple-store/`:
- **iPhone 6.9"** (1320x2868): `nb-iphone-screenshot-1.png` through `6.png`
- **iPad Pro 13"** (2064x2752): `nb-ipad-screenshot-1.png` and `2.png`

### App Icon
- Upload `public/apple-store/nb-app-icon-1024x1024.png`
- Must be 1024x1024, no alpha, no rounded corners

### Privacy Labels (Nutrition Labels)

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| Email Address | Yes | Yes | No |
| Name | Yes | Yes | No |
| User ID | Yes | Yes | No |
| Device ID | Yes | No | No |
| Purchase History | Yes | Yes | No |
| Search History | Yes | Yes | No |
| Browsing History | Yes | Yes | No |

### Age Rating
- Expected: **4+**
- AI content: Yes (disclose AI Copilot uses Anthropic API)
- User-generated content: Yes (reviews, comments)
- No violence, gambling, or restricted content

## Step 8: Submit for Review

1. Select the build in App Store Connect
2. Complete all required fields
3. Submit for review
4. **Typical review time**: 24-48 hours (90% under 24 hours)

## Troubleshooting

### "Your app is a repackaged website" (Guideline 4.2)
The app includes genuine native features:
- Native push notifications via APNs
- Face ID / Touch ID biometric authentication
- Native haptic feedback
- iOS share sheet
- App badge for unread notifications
- Local notification scheduling

If Apple still flags it, consider adding:
- Widgets (WidgetKit) showing next launch countdown
- Siri Shortcuts for common actions
- Apple Watch companion app

### Build Fails
- Ensure `npx cap sync ios` has been run after any web code changes
- Check that the deployment target matches the Capacitor plugin requirements (iOS 16.0+)
- Run `pod install` in `ios/App/` if CocoaPods issues arise
