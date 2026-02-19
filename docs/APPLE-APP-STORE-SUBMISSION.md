# Apple App Store Submission Guide

**Last Updated**: February 18, 2026

This guide covers the Mac-only steps required to build, sign, and submit SpaceNexus to the Apple App Store. All cross-platform preparation (Capacitor plugins, native bridges, API routes, privacy policy updates) has already been completed.

---

## Prerequisites

- **Mac with Xcode 15+** installed
- **Apple Developer Account** ($99/year) — [developer.apple.com](https://developer.apple.com)
- **Node.js 20+** and project dependencies installed
- **CocoaPods** (`sudo gem install cocoapods`)

---

## Step 1: Generate the iOS Project

```bash
# From the project root
npx cap add ios

# Sync web assets and plugins
npx cap sync ios
```

This creates the `ios/` directory with an Xcode project.

---

## Step 2: Configure Xcode Project

Open in Xcode:
```bash
npx cap open ios
```

### Signing & Capabilities
1. Select the **App** target → **Signing & Capabilities**
2. Set **Team** to your Apple Developer Team
3. Set **Bundle Identifier** to `com.spacenexus.app`
4. Add capabilities:
   - **Push Notifications** (for APNs)
   - **Associated Domains** (for Universal Links: `applinks:spacenexus.us`)
   - **Background Modes** → Remote notifications
   - **Face ID Usage** (adds `NSFaceIDUsageDescription`)

### Info.plist Entries
Add these keys to `ios/App/App/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>SpaceNexus uses Face ID for quick, secure login to your account.</string>

<key>NSCameraUsageDescription</key>
<string>SpaceNexus may use the camera for profile photos and document scanning.</string>
```

### Privacy Manifest
Copy the prepared privacy manifest into the Xcode project:
```bash
cp ios-assets/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```
Then add it to the Xcode project via **File → Add Files to "App"**.

---

## Step 3: Configure Push Notifications (APNs)

### Create APNs Key
1. Go to [developer.apple.com/account/resources/authkeys](https://developer.apple.com/account/resources/authkeys/list)
2. Create a new key with **Apple Push Notifications service (APNs)** enabled
3. Download the `.p8` key file
4. Note the **Key ID** and your **Team ID**

### Set Environment Variables
Add to your server environment (Railway):

```
APNS_KEY_ID=<your-key-id>
APNS_TEAM_ID=<your-team-id>
APNS_PRIVATE_KEY=<contents-of-.p8-file>
APNS_BUNDLE_ID=com.spacenexus.app
```

The `src/lib/apns-sender.ts` server module reads these to deliver push notifications.

---

## Step 4: Update Universal Links

Replace `TEAM_ID` in `public/.well-known/apple-app-site-association`:
```json
"appIDs": ["YOUR_ACTUAL_TEAM_ID.com.spacenexus.app"]
```

Also update the `webcredentials` section with the same Team ID.

---

## Step 5: Build & Archive

```bash
# Sync latest web code
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select **Any iOS Device** as the build target
2. **Product → Archive**
3. Once archived, click **Distribute App → App Store Connect**
4. Follow the upload wizard

---

## Step 6: App Store Connect Metadata

### App Information
| Field | Value |
|-------|-------|
| **App Name** | SpaceNexus |
| **Subtitle** | Space Industry Intelligence Hub |
| **Bundle ID** | com.spacenexus.app |
| **SKU** | spacenexus-ios-001 |
| **Primary Category** | Business |
| **Secondary Category** | News |
| **Content Rights** | Does not contain third-party content requiring rights |
| **Age Rating** | 4+ (no objectionable content) |

### Keywords (100 char limit)
```
space industry,satellite tracker,launch schedule,space economy,market intelligence,aerospace,NASA
```

### Description
```
SpaceNexus is the all-in-one intelligence platform for the space industry. Track satellites in real-time, monitor launch schedules, analyze market trends, discover business opportunities, and stay ahead with AI-powered insights.

Features:
- Real-time satellite tracking with orbital data
- Live launch countdowns and notifications
- Space economy market intelligence and analytics
- Company profiles for 100+ aerospace organizations
- Space job board and talent marketplace
- Government contract and procurement tracking
- Regulatory compliance monitoring
- AI-powered procurement copilot

Whether you're a space startup, defense contractor, investor, or enthusiast, SpaceNexus gives you the data and tools to navigate the growing space economy.

Free tier available. Pro and Enterprise plans unlock advanced features.
```

### Privacy Labels (App Store Connect)

| Data Type | Collection | Usage | Linked to Identity |
|-----------|-----------|-------|--------------------|
| Email Address | Yes | App Functionality, Analytics | Yes |
| Name | Yes | App Functionality | Yes |
| User ID | Yes | App Functionality | Yes |
| Device ID | Yes | App Functionality (push tokens) | No |
| Usage Data | Yes | Analytics | No |
| Crash Data | Yes | App Functionality | No |

**Data NOT collected**: Location, contacts, photos, browsing history, search history, financial info, health data, fitness data, sensitive info, messages, game content, audio data, diagnostics beyond crash data.

**Tracking**: No. SpaceNexus does not track users across apps/websites owned by other companies.

---

## Step 7: Screenshots

Generate screenshots using the existing script:
```bash
npx tsx scripts/generate-apple-store-screenshots.ts
```

### Required Sizes
| Device | Size (pixels) | Count |
|--------|--------------|-------|
| iPhone 16 Pro Max | 1320 x 2868 | 6 |
| iPad Pro 13" | 2064 x 2752 | 2 |

### Screenshot Content Suggestions
1. Mission Control dashboard
2. Satellite tracking map
3. News feed with AI insights
4. Company profiles directory
5. Marketplace / procurement search
6. Launch countdown with notifications

---

## Step 8: App Icon

- Size: 1024 x 1024 px
- **No alpha channel** (must be opaque)
- **No rounded corners** (iOS adds them automatically)
- Format: PNG
- Generated by `scripts/generate-apple-store-screenshots.ts`

---

## Step 9: Review Guidelines Checklist

Apple reviews against their [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

| Guideline | Status |
|-----------|--------|
| **4.2 Design** | Native push, haptics, biometrics, share — NOT a PWA wrapper |
| **5.1.1 Data Collection** | Privacy policy link, privacy labels, PrivacyInfo.xcprivacy |
| **5.1.2 Data Use** | App Tracking Transparency not needed (no tracking) |
| **3.1.1 In-App Purchase** | Stripe handles web payments; no IAP in native app |
| **2.1 App Completeness** | No placeholder content, all features functional |
| **4.0 Design** | iOS Human Interface Guidelines followed |
| **5.6.1 Account Deletion** | Self-service deletion at /account |
| **2.5.4 Background Processes** | Only push notifications, no background data mining |
| **1.2 User Generated Content** | Moderation via admin review for marketplace/RFQs |

### Important: In-App Purchases
If SpaceNexus Pro/Enterprise subscriptions are sold within the iOS app, Apple requires 30% commission via StoreKit. **Current approach**: subscriptions are handled via Stripe on the web, and the native app accesses the user's existing subscription. If Apple rejects this, we may need to:
- Remove pricing/upgrade CTAs from the native app, OR
- Implement StoreKit for iOS-native subscriptions

---

## Step 10: Submit for Review

1. Upload build via Xcode Organizer
2. In App Store Connect, select the uploaded build
3. Fill in all metadata, screenshots, and privacy info
4. Submit for review
5. Typical review time: 24-48 hours
6. If rejected, address feedback and resubmit

---

## Environment Variables Summary

| Variable | Purpose | Required For |
|----------|---------|-------------|
| `APNS_KEY_ID` | APNs authentication key ID | Push notifications |
| `APNS_TEAM_ID` | Apple Developer Team ID | Push notifications |
| `APNS_PRIVATE_KEY` | APNs `.p8` key contents | Push notifications |
| `APNS_BUNDLE_ID` | App bundle identifier | Push notifications |

---

## File Reference

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Capacitor configuration |
| `src/lib/capacitor.ts` | Platform detection bridge |
| `src/lib/native-push.ts` | Push notification setup |
| `src/lib/native-biometric.ts` | Face ID / Touch ID |
| `src/lib/native-share.ts` | Native share sheet |
| `src/lib/native-local-notifications.ts` | Scheduled notifications |
| `src/lib/native-badge.ts` | App icon badge |
| `src/lib/apns-sender.ts` | Server-side APNs delivery |
| `src/hooks/useHaptics.ts` | Haptic feedback (native + web) |
| `src/hooks/useNativePlatform.ts` | Platform detection hook |
| `src/components/ServiceWorkerRegistration.tsx` | Native init on Capacitor |
| `src/app/api/push-token/route.ts` | Device token registration |
| `src/app/api/account/delete/route.ts` | Account self-deletion |
| `src/app/account/page.tsx` | Account settings UI |
| `ios-assets/PrivacyInfo.xcprivacy` | Apple Privacy Manifest |
| `public/.well-known/apple-app-site-association` | Universal Links |
| `scripts/generate-apple-store-screenshots.ts` | Screenshot generation |
