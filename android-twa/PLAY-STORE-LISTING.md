# Google Play Store Listing - SpaceNexus

## App Details

- **Package Name**: com.spacenexus.app
- **App Name**: SpaceNexus - Space Industry Intelligence
- **Developer Name**: SpaceNexus LLC

## Store Listing Text

### Short Description (80 chars max)
Space industry intelligence: launches, market data, news & satellite tracking.

### Full Description (4000 chars max)
SpaceNexus is the comprehensive space industry intelligence platform built for professionals. Whether you're launching a satellite, evaluating a startup for investment, or advising a client on ITAR compliance, SpaceNexus puts the data you need at your fingertips.

**Key Features:**

- Live Launch Tracking — Real-time countdown timers, mission details, live stream links, and post-launch analysis for every orbital and suborbital mission worldwide.

- Market Intelligence — Track space industry stocks, company valuations, market cap data, and earnings across 119+ space companies. Live stock prices for publicly-traded companies like SpaceX, Rocket Lab, Boeing, and Lockheed Martin.

- Real-Time Space News — Aggregated news from 50+ sources across categories including launches, satellites, defense, earnings, M&A, and policy. Color-coded by category with source attribution.

- Company Intelligence — Detailed profiles for 100+ space companies with financial data, satellite assets, facility locations, news tagging, and competitive analysis. Tier 1/2/3 company classification.

- Space Marketplace — Find and connect with space industry service providers. Browse launch services, satellite components, ground stations, engineering services, and more. AI-powered RFQ matching.

- Satellite Tracking — Monitor satellite orbits, constellation status, ground station networks, and orbital management data.

- Mission Planning — Cost calculators, launch window optimization, vehicle comparison, insurance estimation, and resource exchange tools.

- Regulatory & Compliance — Track space treaties, ITAR/EAR regulations, FCC filings, spectrum management, and policy developments.

- Space Environment — Solar weather monitoring, debris tracking, and space operations awareness.

- Space Talent Hub — Find space industry jobs and workforce analytics.

**Built for:**
- Entrepreneurs & Founders
- CEOs & Executives
- Mission Planners
- Supply Chain Professionals
- Lawyers & Compliance Officers
- Space Enthusiasts

SpaceNexus combines data from NASA, NOAA, ESA, SpaceX, and dozens of other sources into a single, powerful platform. Free tier available with premium features for Pro and Enterprise users.

### Category
Business (Primary) / News & Magazines (Secondary)

### Tags
space, aerospace, satellite, rocket, launch, intelligence, market data, SpaceX, NASA, defense

## Content Rating
Everyone (IARC)

## Contact Information
- **Email**: support@spacenexus.us
- **Website**: https://spacenexus.us
- **Privacy Policy**: https://spacenexus.us/privacy

## Build Artifacts

- **Signed AAB**: `android-twa/app-release.aab` (3.4 MB)
- **Signing Key**: `android-twa/spacenexus.keystore`
  - Alias: `spacenexus`
  - SHA-256: `2B:F4:84:9F:6B:BD:77:4E:3E:1D:57:64:A3:28:37:CC:7C:F2:76:FA:E9:E0:4B:33:80:BE:6C:52:E1:CB:7E:42`

## Digital Asset Links
File deployed at: `https://spacenexus.us/.well-known/assetlinks.json`

## Upload Steps

1. Go to https://play.google.com/console
2. Create a new app → "SpaceNexus"
3. Fill in Store Listing using text above
4. Upload screenshots from `public/play-store/nb-*` files
5. Upload feature graphic: `public/play-store/nb-feature-graphic-1024x500.png`
6. Upload app icon: `public/play-store/nb-app-icon-512x512.png`
7. Go to Release → Production → Create new release
8. Upload `android-twa/app-release.aab`
9. Complete Content Rating questionnaire (Everyone)
10. Set Pricing → Free
11. Submit for review

## IMPORTANT: Keystore Security
The `spacenexus.keystore` file is your app signing key.
- **NEVER** commit it to a public repository
- Back it up securely - if you lose it, you cannot update your app
- Store password: `spacenexus2026` (change this for production)
- Key password: `spacenexus2026` (change this for production)
