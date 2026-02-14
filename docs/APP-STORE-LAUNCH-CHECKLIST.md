# SpaceNexus App Store Launch Checklist

> **Last Updated**: February 13, 2026
> **Status**: Waiting on D-U-N-S Number
> **Package ID**: `com.spacenexus.app`
> **Website**: https://spacenexus.us

---

## Table of Contents
1. [Pre-Requisites (Both Platforms)](#1-pre-requisites-both-platforms)
2. [Google Play Store](#2-google-play-store)
3. [Apple App Store](#3-apple-app-store)
4. [Post-Launch](#4-post-launch)
5. [Status Summary](#5-status-summary)

---

## 1. Pre-Requisites (Both Platforms)

### 1.1 D-U-N-S Number
- [ ] Request D-U-N-S number from Dun & Bradstreet (free, ~5 business days)
  - Apply at: https://www.dnb.com/duns/get-a-duns.html
  - **Required for**: Google Play (organizational) AND Apple Developer Program
  - Business name must match exactly on both platforms
  - Note: Google pulls your org info from the D-U-N-S database, so ensure your business name, address, and phone are correct in D&B

### 1.2 Legal Pages (DONE)
- [x] Privacy Policy page — `src/app/privacy/page.tsx` (updated Feb 5, 2026)
- [x] Terms of Service page — `src/app/terms/page.tsx` (updated Feb 5, 2026)
- [ ] Review privacy policy to ensure it covers:
  - [ ] Data collected by the Android/iOS app specifically
  - [ ] Third-party SDKs and analytics (Google Analytics, AdSense, Anthropic API)
  - [ ] Push notification data handling
  - [ ] Device identifiers and advertising IDs
  - [ ] Account deletion procedures (Apple requires this)
  - [ ] Children's privacy (COPPA compliance if applicable)

### 1.3 Support Infrastructure (DONE)
- [x] Support email: `support@spacenexus.us`
- [x] Privacy email: `privacy@spacenexus.us`
- [x] Contact page: `/contact`
- [x] FAQ page: `/faq`
- [ ] Ensure support email is actively monitored (app stores check this)

### 1.4 Organization Website
- [x] https://spacenexus.us is live and functional
- [ ] Verify website has clear branding matching app name
- [ ] Ensure privacy policy is accessible from website footer (both stores check this)
- [ ] Google: Website should be on your business domain
- [ ] Apple: Website must NOT be a placeholder, social media page, or domain registrar page

### 1.5 Keystore / Signing Key Security
- [ ] **CRITICAL**: Change keystore passwords from development values before any production use
  - Current: `spacenexus2026` (development only!)
  - Store new passwords in a password manager (1Password, Bitwarden, etc.)
- [ ] Back up `android-twa/spacenexus.keystore` to a secure, encrypted location
  - If you lose this key, you **cannot** update your app on Google Play
- [ ] Store SHA-256 fingerprint for reference:
  `2B:F4:84:9F:6B:BD:77:4E:3E:1D:57:64:A3:28:37:CC:7C:F2:76:FA:E9:E0:4B:33:80:BE:6C:52:E1:CB:7E:42`

---

## 2. Google Play Store

### 2.1 Developer Account Setup
- [ ] Go to https://play.google.com/console
- [ ] Select **Organization** account type
- [ ] Enter D-U-N-S number
- [ ] Pay $25 one-time registration fee
- [ ] Provide organization details:
  - Legal name: SpaceNexus LLC
  - Address (must match D&B records)
  - Phone number
  - Organization website: https://spacenexus.us
- [ ] Upload verification document (one of):
  - Certificate of Incorporation / Articles of Organization
  - Business License
  - VAT/Tax Registration Certificate
  - Government-issued document confirming the business
- [ ] Verify developer email via OTP
- [ ] Verify contact phone via OTP
- [ ] Wait for Google verification (hours to several days)

### 2.2 App Creation & Store Listing

#### Create the App
- [ ] Click "Create app" in Play Console
- [ ] App name: `SpaceNexus - Space Industry Intelligence`
- [ ] Default language: English (United States)
- [ ] App type: App (not Game)
- [ ] Free or paid: Free

#### Store Listing Text
All text is pre-written in `android-twa/PLAY-STORE-LISTING.md`.

- [ ] **App name** (50 chars max):
  `SpaceNexus - Space Industry Intelligence`
- [ ] **Short description** (80 chars max):
  `Space industry intelligence: launches, market data, news & satellite tracking.`
- [ ] **Full description** (4000 chars max): See PLAY-STORE-LISTING.md
- [ ] **Category**: Business (primary)
- [ ] **Tags** (up to 5): space, aerospace, satellite, intelligence, market data

#### Graphic Assets
All assets are in `public/play-store/`.

- [ ] **App icon** (512x512 PNG): Upload `nb-app-icon-512x512.png`
- [ ] **Feature graphic** (1024x500 PNG/JPEG): Upload `nb-feature-graphic-1024x500.png`
- [ ] **Phone screenshots** (1080x1920, 2-8 images): Upload `nb-phone-screenshot-1.png` through `nb-phone-screenshot-6.png`
- [ ] **7-inch tablet screenshots** (1080x1920): Upload `tablet7-screenshot-1.png` through `tablet7-screenshot-4.png`
- [ ] **10-inch tablet screenshots** (2560x1600): Upload `tablet10-screenshot-1.png` through `tablet10-screenshot-4.png` OR `nb-tablet-screenshot-1.png` / `nb-tablet-screenshot-2.png`
- [ ] Add alt text for each screenshot (140 chars max)
- [ ] Optional: Add a YouTube promotional video

#### Contact Details
- [ ] Email: `support@spacenexus.us`
- [ ] Phone: (your business phone)
- [ ] Website: `https://spacenexus.us`

### 2.3 Content Rating (IARC)
- [ ] Complete IARC questionnaire in Play Console
- [ ] Expected answers for SpaceNexus:
  - Violence: None
  - Sexual content: None
  - Language: None
  - Controlled substances: None
  - User-generated content: Yes (comments, reviews)
  - Gambling: None
  - Advertising: Yes (in-app ads)
- [ ] Expected rating: **Everyone** (E)

### 2.4 Data Safety Declaration
- [ ] Complete Data Safety form in Play Console
- [ ] Data types SpaceNexus collects:
  - **Personal info**: Name, email address (account registration)
  - **Financial info**: Purchase history (Stripe subscriptions)
  - **App activity**: App interactions, search history
  - **Device IDs**: For analytics and ads
- [ ] Data sharing:
  - Analytics data shared with Google Analytics
  - Ad identifiers shared with Google AdSense
  - Payment data shared with Stripe
  - AI queries shared with Anthropic (copilot feature)
- [ ] Security practices:
  - [x] Data encrypted in transit (HTTPS)
  - [ ] Declare whether users can request data deletion
  - [x] App does not target children

### 2.5 Privacy Policy
- [ ] Link privacy policy URL: `https://spacenexus.us/privacy`
- [ ] Verify the URL is publicly accessible (not behind auth)
- [ ] Verify it's not a PDF (must be a web page)
- [ ] Verify it's not geofenced

### 2.6 Technical: Build & Upload

#### Pre-Built (DONE)
- [x] Android TWA project generated — `android-twa/`
- [x] Signed AAB built — `android-twa/app-release.aab` (3.4 MB)
- [x] Digital Asset Links — `public/.well-known/assetlinks.json`

#### Upload Steps
- [ ] Go to Release > Production > Create new release
- [ ] Upload `android-twa/app-release.aab`
- [ ] **IMPORTANT**: When Google provides their Play App Signing key SHA-256:
  - [ ] Add Google's SHA-256 fingerprint to `public/.well-known/assetlinks.json`
  - [ ] Deploy the updated assetlinks.json to production
  - [ ] This is critical — without it, users see a Chrome URL bar in the app
- [ ] Set release name: `1.0.0`
- [ ] Add release notes:
  ```
  Initial release of SpaceNexus for Android.
  - Live launch tracking with countdown timers
  - Space industry market intelligence and stock data
  - Real-time news from 50+ sources
  - Company profiles for 100+ space companies
  - Space marketplace for services and components
  - Satellite tracking and orbital management
  - Mission planning tools
  - Regulatory compliance tracking
  ```
- [ ] Review and submit for Google's review

#### Post-Upload Verification
- [ ] Verify Digital Asset Links with Google's tool:
  https://developers.google.com/digital-asset-links/tools/generator
- [ ] Test on a real Android device after approval
- [ ] Confirm no Chrome URL bar appears (DAL verification working)

### 2.7 App Signing (Google Play App Signing)
- [ ] When creating the first release, Google will ask about app signing
- [ ] Choose: "Let Google manage and protect your app signing key" (recommended)
- [ ] Upload your upload key certificate (from spacenexus.keystore)
- [ ] Save the **Play App Signing certificate SHA-256** that Google provides
- [ ] Add that SHA-256 to assetlinks.json alongside your upload key SHA-256

---

## 3. Apple App Store

### ⚠️ CRITICAL: Apple Rejects PWA Wrappers
Apple App Store Review Guideline 4.2 **rejects apps that are simply repackaged websites**. A TWA or basic WebView wrapper will NOT pass review. SpaceNexus needs genuine native functionality to be approved.

### 3.1 Developer Account Setup
- [ ] Go to https://developer.apple.com/programs/enroll/
- [ ] Sign in with Apple Account (enable two-factor authentication)
- [ ] Select **Organization** enrollment
- [ ] Enter D-U-N-S number
- [ ] Provide:
  - Legal entity name: SpaceNexus LLC
  - Headquarters address
  - Organization website: https://spacenexus.us
  - Phone number
- [ ] **Account Holder requirements**:
  - Must have legal authority to bind the organization
  - Must be owner/founder, executive, or have documented authority
  - If not owner: provide a verifiable reference (senior employee)
- [ ] Accept Apple Developer Program License Agreement
- [ ] Pay **$99/year** annual membership fee
- [ ] Wait for Apple verification (can take a few days)

### 3.2 iOS App Build Strategy

**Recommended approach**: Use **Capacitor** (already configured in `capacitor.config.json`) to wrap the web app but add native functionality that justifies App Store approval.

#### 3.2.1 Required Native Features (to pass Guideline 4.2)
- [ ] **Push Notifications** via Apple Push Notification service (APNs)
  - Install: `@capacitor/push-notifications`
  - Must use native APNs, not web push
  - Integrate with existing alert system (`src/lib/alerts/`)
- [ ] **Biometric Authentication** (Face ID / Touch ID)
  - For secure login and sensitive data access
  - Install: `@nicolo-nicolo/nicolo` ... wait, use `@nicolo-ribaudo/nicolo`... no.
  - Install: `capacitor-native-biometric` or `@nicolo-ribaudo/capacitor-biometrics`
  - Actually: `@nicolo-ribaudo/capacitor-biometrics`... NO.
  - Use: `capacitor-native-biometric` package
- [ ] **Native Share** functionality
  - Install: `@capacitor/share`
  - Share articles, company profiles, market data
- [ ] **Haptic Feedback** for interactions
  - Install: `@capacitor/haptics`
- [ ] **Local Notifications** for launch countdowns and alerts
  - Install: `@capacitor/local-notifications`
- [ ] **App Badge** for unread notification count
  - Install: `@capacitor/badge`

#### 3.2.2 Generate iOS Project
- [ ] **Requires a Mac with Xcode 16+** (cannot build iOS apps on Windows)
- [ ] Install Capacitor CLI: `npm install @capacitor/core @capacitor/ios`
- [ ] Generate iOS project: `npx cap add ios`
- [ ] Open in Xcode: `npx cap open ios`
- [ ] Configure:
  - Bundle ID: `com.spacenexus.app`
  - Deployment target: iOS 16.0+
  - Device orientation: All
  - Status bar style: Light Content

#### 3.2.3 App Signing (iOS)
- [ ] Create App ID in Apple Developer Portal
  - Bundle ID: `com.spacenexus.app`
  - Enable capabilities: Push Notifications, Associated Domains
- [ ] Create Distribution Certificate
- [ ] Create Provisioning Profile (App Store distribution)
- [ ] Configure signing in Xcode

#### 3.2.4 Apple App Site Association
- [x] File exists: `public/.well-known/apple-app-site-association`
- [ ] Replace `TEAM_ID` placeholder with your actual Apple Team ID
- [ ] Deploy updated file to production

### 3.3 App Store Connect: Store Listing

#### App Information
- [ ] **App name** (30 chars max): `SpaceNexus`
- [ ] **Subtitle** (30 chars max): `Space Industry Intelligence`
- [ ] **Category**: Business (primary), News (secondary)
- [ ] **Copyright**: `2026 SpaceNexus LLC`
- [ ] **Content rights**: Confirm you have rights to all content

#### Metadata
- [ ] **Promotional text** (170 chars, updatable anytime):
  `Real-time space industry intelligence. Track launches, markets, 100+ companies, news from 50+ sources. The Bloomberg Terminal for space.`
- [ ] **Description** (4000 chars): Adapt from `PLAY-STORE-LISTING.md`
- [ ] **Keywords** (100 chars, comma-separated):
  `space,aerospace,satellite,rocket,launch,SpaceX,NASA,market,intelligence,defense,tracking,orbital`
- [ ] **What's New** (4000 chars): Initial release notes
- [ ] **Support URL**: `https://spacenexus.us/faq`
- [ ] **Marketing URL**: `https://spacenexus.us`
- [ ] **Privacy Policy URL**: `https://spacenexus.us/privacy`

#### Screenshots
Apple requires specific sizes. Need to create these:

| Device | Size (portrait) | Status |
|--------|----------------|--------|
| 6.9" iPhone (iPhone 16 Pro Max) | 1320 x 2868 | [ ] Needed |
| 6.7" iPhone (iPhone 16 Plus) | 1290 x 2796 | [ ] Needed |
| 6.5" iPhone (iPhone 11 Pro Max) | 1284 x 2778 | [ ] Needed (optional if 6.9" provided) |
| 5.5" iPhone (iPhone 8 Plus) | 1242 x 2208 | [ ] Needed (optional if 6.9" provided) |
| 13" iPad Pro | 2064 x 2752 | [ ] Needed |
| 12.9" iPad Pro (6th gen) | 2048 x 2732 | [ ] Needed (optional if 13" provided) |

- [ ] Create iPhone screenshots at 1320x2868 (can use Nano Banana script with adjusted dimensions)
- [ ] Create iPad screenshots at 2064x2752
- [ ] 1-10 screenshots per device size
- [ ] Must show actual app UI (Apple is strict about this)

#### App Icon
- [ ] Create 1024x1024 PNG (no alpha, no rounded corners)
- [x] Already have `icons/icon-1024x1024.png` — verify no alpha channel
- [ ] Can also use Nano Banana to generate a polished version

### 3.4 Age Rating (Apple)
- [ ] Complete Apple's updated questionnaire (new system since Jan 2026)
- [ ] New rating tiers: 4+, 9+, 13+, 16+, 18+
- [ ] Expected rating for SpaceNexus: **4+** or **9+**
- [ ] Questionnaire areas:
  - [ ] In-app controls assessment
  - [ ] App capabilities
  - [ ] Medical/health topics: N/A
  - [ ] Violent content: None
  - [ ] AI content: Yes (AI Copilot uses Anthropic API — must disclose)

### 3.5 Privacy Declarations (App Privacy Labels)
- [ ] Complete App Privacy "Nutrition Labels" in App Store Connect
- [ ] Data types to declare:

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|---------------|-------------------|
| Name | Yes | Yes | No |
| Email | Yes | Yes | No |
| User ID | Yes | Yes | No |
| Purchase History | Yes | Yes | No |
| Search History | Yes | Yes | No |
| Browsing History | Yes | Yes | No |
| App Interactions | Yes | Yes | No |
| Crash Logs | Yes | No | No |
| Device ID | Yes | No | Yes (ads) |
| Advertising Data | Yes | No | Yes |

- [ ] Create Privacy Manifest file (`PrivacyInfo.xcprivacy`) declaring:
  - Required Reason APIs used
  - Third-party SDK data collection
- [ ] Ensure account deletion is available (Apple requirement if app has accounts)

### 3.6 Build & Submit (Requires Mac)
- [ ] Build the app in Xcode (Archive)
- [ ] Upload to App Store Connect via Xcode or Transporter
- [ ] Select build in App Store Connect
- [ ] Submit for review
- [ ] **Review time**: Typically 24-48 hours (90% under 24 hours)

---

## 4. Post-Launch (Both Platforms)

### 4.1 Monitoring
- [ ] Set up crash reporting (Firebase Crashlytics or Sentry)
- [ ] Monitor app reviews and ratings daily for first 2 weeks
- [ ] Respond to user reviews within 24 hours
- [ ] Monitor uninstall rates in Play Console / App Store Connect
- [ ] Set up alerts for negative reviews

### 4.2 ASO (App Store Optimization)
- [ ] Monitor keyword rankings
- [ ] A/B test screenshots and descriptions (Play Console has built-in experiments)
- [ ] Track conversion rates (store listing views → installs)
- [ ] Update keywords/description based on search analytics
- [ ] Encourage satisfied users to leave reviews

### 4.3 Updates
- [ ] Plan v1.1 update within 2-4 weeks of launch (shows active development)
- [ ] Android: Rebuild AAB with `cd android-twa && ./gradlew.bat bundleRelease`
- [ ] iOS: Rebuild in Xcode, archive, upload
- [ ] Both: Increment version codes and version names

### 4.4 Legal & Compliance
- [ ] Monitor for policy changes from Google and Apple
- [ ] Google: Developer verification requirement rolling out Sep 2026
- [ ] Apple: Xcode 26 / iOS 26 SDK required from Apr 2026
- [ ] Keep privacy policy updated when adding new data collection
- [ ] Maintain IARC and Apple age ratings when features change

---

## 5. Status Summary

### What's DONE

| Item | Platform | Location |
|------|----------|----------|
| Privacy Policy | Both | `src/app/privacy/page.tsx` |
| Terms of Service | Both | `src/app/terms/page.tsx` |
| Contact/Support Pages | Both | `src/app/contact/page.tsx`, `/faq` |
| Web Manifest | Both | `public/site.webmanifest` |
| Service Worker | Both | `public/sw.js` |
| Offline Page | Both | `public/offline.html` |
| App Icon (512x512) | Android | `public/play-store/nb-app-icon-512x512.png` |
| App Icon (1024x1024) | iOS | `public/icons/icon-1024x1024.png` |
| Feature Graphic | Android | `public/play-store/nb-feature-graphic-1024x500.png` |
| Phone Screenshots (6) | Android | `public/play-store/nb-phone-screenshot-*.png` |
| Tablet Screenshots | Android | `public/play-store/nb-tablet-screenshot-*.png` |
| Android TWA Project | Android | `android-twa/` |
| Signed AAB | Android | `android-twa/app-release.aab` |
| Signing Keystore | Android | `android-twa/spacenexus.keystore` |
| Digital Asset Links | Android | `public/.well-known/assetlinks.json` |
| Apple Site Association | iOS | `public/.well-known/apple-app-site-association` |
| Capacitor Config | iOS | `capacitor.config.json` |
| Store Listing Text | Android | `android-twa/PLAY-STORE-LISTING.md` |
| Accessibility (ARIA) | Both | 72+ ARIA implementations across components |

### What's NEEDED

| Item | Platform | Priority | Effort | Notes |
|------|----------|----------|--------|-------|
| D-U-N-S Number | Both | **BLOCKER** | 5 days | Waiting on Dun & Bradstreet |
| Google Developer Account | Android | High | 1 hour | $25, needs DUNS |
| Apple Developer Account | iOS | High | 1 hour | $99/yr, needs DUNS |
| Change keystore passwords | Android | High | 10 min | Before any production use |
| Back up keystore | Android | High | 5 min | Secure, encrypted storage |
| Data Safety form | Android | High | 30 min | In Play Console |
| IARC content rating | Android | High | 15 min | In Play Console |
| Upload AAB + listing | Android | High | 1 hour | Follow PLAY-STORE-LISTING.md |
| Update assetlinks.json | Android | High | 10 min | After Google provides Play App Signing key |
| Add native Capacitor plugins | iOS | High | 2-4 hours | Push notifications, biometrics, etc. |
| Generate iOS project | iOS | High | 1 hour | `npx cap add ios` (requires Mac) |
| iPhone screenshots (1320x2868) | iOS | High | 30 min | Can generate with Nano Banana |
| iPad screenshots (2064x2752) | iOS | Medium | 30 min | Can generate with Nano Banana |
| App Privacy labels | iOS | High | 45 min | In App Store Connect |
| Privacy Manifest file | iOS | High | 1 hour | `PrivacyInfo.xcprivacy` |
| Apple age rating questionnaire | iOS | High | 15 min | In App Store Connect |
| Replace TEAM_ID in AASA | iOS | High | 5 min | After Apple enrollment |
| Build & submit iOS app | iOS | High | 2 hours | Requires Mac + Xcode |
| Account deletion feature | Both | Medium | 4 hours | Apple requires if accounts exist |
| Review privacy policy coverage | Both | Medium | 1 hour | Ensure mobile-specific disclosures |
| Set up crash reporting | Both | Medium | 1 hour | Firebase Crashlytics / Sentry |
| Promotional video | Both | Low | 2-4 hours | YouTube URL (optional) |

### Timeline Estimate

| Phase | Timeframe | Tasks |
|-------|-----------|-------|
| **Now** | While waiting for DUNS | Review privacy policy, change keystore password, back up keystore, prepare iOS native plugins on Mac |
| **Day DUNS arrives** | Day 1 | Register Google + Apple developer accounts |
| **Google verified** | Day 2-3 | Upload AAB, fill in listing, submit for review |
| **Google approved** | Day 4-10 | Update assetlinks.json with Play App Signing key, verify on device |
| **Apple verified** | Day 3-7 | Build iOS app on Mac, submit for review |
| **Apple approved** | Day 5-9 | Verify, monitor initial reviews |
| **Both live** | Day 7-14 | Monitor, respond to reviews, plan v1.1 update |

---

## Appendix: Account Costs

| Item | Cost | Frequency |
|------|------|-----------|
| D-U-N-S Number | Free | One-time |
| Google Play Developer | $25 | One-time |
| Apple Developer Program | $99 | Annual |
| **Total Year 1** | **$124** | |
| **Total Subsequent Years** | **$99** | |

---

## Appendix: Key File Locations

```
spacehub/
├── android-twa/
│   ├── app-release.aab          # Signed Android App Bundle (UPLOAD THIS)
│   ├── spacenexus.keystore      # Signing key (BACK THIS UP, DO NOT COMMIT)
│   ├── twa-manifest.json        # TWA configuration
│   ├── PLAY-STORE-LISTING.md    # Store listing text & upload guide
│   └── app/build.gradle         # Android build config
├── public/
│   ├── play-store/
│   │   ├── nb-app-icon-512x512.png       # Play Store app icon
│   │   ├── nb-feature-graphic-*.png      # Play Store feature graphic
│   │   ├── nb-phone-screenshot-*.png     # Phone screenshots (6)
│   │   ├── nb-tablet-screenshot-*.png    # Tablet screenshots (2)
│   │   ├── phone-screenshot-*.png        # Alt phone screenshots (6)
│   │   └── tablet*-screenshot-*.png      # Alt tablet screenshots (8)
│   ├── .well-known/
│   │   ├── assetlinks.json               # Android Digital Asset Links
│   │   └── apple-app-site-association    # iOS Universal Links
│   ├── site.webmanifest                  # PWA manifest
│   ├── sw.js                             # Service worker
│   ├── offline.html                      # Offline fallback page
│   └── icons/                            # All app icons (48-1024px)
├── capacitor.config.json                 # iOS Capacitor config
├── src/app/privacy/page.tsx              # Privacy policy
├── src/app/terms/page.tsx                # Terms of service
└── scripts/
    ├── generate-play-store-assets.ts         # Screenshot generator (sharp)
    └── generate-play-store-nanobanana.ts     # AI screenshot generator (Gemini)
```
