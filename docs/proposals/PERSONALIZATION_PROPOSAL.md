# SpaceNexus User Personalization Features Proposal

## Executive Summary

This proposal outlines a comprehensive personalization system for SpaceNexus, enabling users to save searches, create watchlists, set custom alerts, customize their dashboard, and receive notifications across multiple channels. The system builds upon the existing `UserModulePreference` and `NotificationCenter` infrastructure while adding robust server-side persistence and real-time delivery capabilities.

---

## 1. Saved Searches & Watchlists

### 1.1 Saved Search Queries

Users can save complex search queries for quick access and automated monitoring.

**Features:**
- Save search queries for companies, regulations, launches, news, and contracts
- Name and organize searches into folders
- Set search refresh frequency (real-time, hourly, daily)
- Toggle notifications when new results match saved search

**Database Schema:**
```prisma
model SavedSearch {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name            String
  description     String?

  // Search configuration
  searchType      String   // company, regulation, launch, news, contract, satellite, debris
  query           String   // The search query text
  filters         String?  // JSON object of applied filters
  sortBy          String?  // Sorting preference

  // Notification settings
  notifyOnNewResults Boolean @default(false)
  notifyFrequency    String? // realtime, hourly, daily, weekly
  lastNotifiedAt     DateTime?
  lastResultCount    Int      @default(0)

  // Organization
  folderId        String?
  folder          SearchFolder? @relation(fields: [folderId], references: [id])

  // Metadata
  isActive        Boolean  @default(true)
  runCount        Int      @default(0)
  lastRunAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([searchType])
  @@index([isActive])
}

model SearchFolder {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  color     String?  // Hex color for UI
  icon      String?  // Icon identifier
  position  Int      @default(0)

  searches  SavedSearch[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, name])
  @@index([userId])
}
```

### 1.2 Company Watchlists

Track specific companies with customized notification preferences.

**Features:**
- Add/remove companies to personal watchlist
- Set per-company notification preferences (news, stock alerts, launches, contracts)
- Priority levels (high, medium, low) for sorting
- Notes and tags per watched company

**Database Schema:**
```prisma
model CompanyWatchlist {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  companyId       String
  company         SpaceCompany @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // User customization
  nickname        String?  // Custom name for the company
  notes           String?  // Personal notes
  tags            String?  // JSON array of user-defined tags
  priority        String   @default("medium") // high, medium, low

  // Notification preferences (per-company)
  notifyNews           Boolean @default(true)
  notifyStockPrice     Boolean @default(true)
  stockPriceThreshold  Float?  // Percentage change threshold
  notifyLaunches       Boolean @default(true)
  notifyContracts      Boolean @default(true)
  notifyRegulatory     Boolean @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
  @@index([priority])
}
```

### 1.3 Satellite/Debris Tracking Watchlists

Monitor specific satellites or debris objects for conjunction alerts and status updates.

**Features:**
- Track satellites by NORAD ID or name
- Track debris objects of concern
- Receive conjunction warnings when tracked objects are involved
- Get maneuver notifications for watched satellites

**Database Schema:**
```prisma
model SatelliteWatchlist {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Object identification
  objectType      String   // satellite, debris, rocket_body
  noradId         String?  // NORAD catalog number
  objectName      String   // Display name
  operator        String?  // Satellite operator if known

  // User notes
  nickname        String?
  notes           String?
  tags            String?  // JSON array
  priority        String   @default("medium")

  // Notification preferences
  notifyConjunctions    Boolean @default(true)
  conjunctionThreshold  Float   @default(1.0) // km miss distance threshold
  notifyManeuvers       Boolean @default(true)
  notifyStatusChange    Boolean @default(true)
  notifyDeorbit         Boolean @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, noradId])
  @@index([userId])
  @@index([noradId])
}
```

### 1.4 Stock Portfolio Tracking

Create a virtual portfolio to track space industry stocks.

**Features:**
- Add stocks with purchase price and quantity (virtual tracking)
- Calculate portfolio performance and P&L
- Set price alerts per stock
- Track sector allocation

**Database Schema:**
```prisma
model StockPortfolio {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name            String   @default("My Portfolio")
  description     String?
  isDefault       Boolean  @default(false)

  holdings        StockHolding[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
}

model StockHolding {
  id              String   @id @default(cuid())
  portfolioId     String
  portfolio       StockPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)

  // Stock info
  ticker          String
  companyId       String?
  company         SpaceCompany? @relation(fields: [companyId], references: [id])

  // Position details (virtual tracking)
  shares          Float    @default(0)
  avgCostBasis    Float?   // Average purchase price
  targetPrice     Float?   // User's target sell price
  notes           String?

  // Alert settings
  alertAbove      Float?   // Alert when price goes above
  alertBelow      Float?   // Alert when price goes below
  alertPercentChange Float? // Alert on % change

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([portfolioId, ticker])
  @@index([portfolioId])
  @@index([ticker])
}
```

---

## 2. Custom Alerts System

### 2.1 Alert Types

The system supports multiple alert categories, each with specific trigger conditions.

**Database Schema:**
```prisma
model UserAlert {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Alert identification
  name            String
  alertType       String   // launch_countdown, regulatory_deadline, stock_price,
                           // solar_weather, conjunction, news_keyword, contract_deadline

  // Alert configuration (type-specific JSON)
  config          String   // JSON object with type-specific settings

  // Trigger settings
  triggerCondition String  // JSON defining when to trigger
  cooldownMinutes  Int     @default(60) // Minimum time between alerts
  maxAlertsPerDay  Int?    // Optional daily limit

  // Delivery preferences
  deliveryChannels String  // JSON array: ["in_app", "email", "push", "sms", "webhook"]

  // Status
  isActive        Boolean  @default(true)
  isPaused        Boolean  @default(false)
  pauseUntil      DateTime?

  // Statistics
  triggerCount    Int      @default(0)
  lastTriggered   DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([alertType])
  @@index([isActive])
}
```

### 2.2 Alert Type Configurations

**Launch Countdown Alerts:**
```typescript
interface LaunchCountdownConfig {
  eventId?: string;           // Specific event, or null for all
  agency?: string[];          // Filter by agency
  country?: string[];         // Filter by country
  rocketType?: string[];      // Filter by rocket
  alertTimes: number[];       // Minutes before launch: [1440, 60, 15, 5]
  includeDelays: boolean;     // Notify on launch delays
  includeSuccess: boolean;    // Notify on successful launch
}
```

**Regulatory Deadline Reminders:**
```typescript
interface RegulatoryDeadlineConfig {
  regulationIds?: string[];   // Specific regulations, or null for all
  agency?: string[];          // Filter by agency: ["FAA", "FCC", "NOAA"]
  category?: string[];        // Filter by category
  reminderDays: number[];     // Days before deadline: [30, 7, 1]
  includeNewRegulations: boolean;
}
```

**Stock Price Alerts:**
```typescript
interface StockPriceConfig {
  ticker: string;
  priceAbove?: number;
  priceBelow?: number;
  percentChangeUp?: number;   // Alert on X% increase
  percentChangeDown?: number; // Alert on X% decrease
  volumeSpike?: number;       // Alert on volume N times average
  timeframe: 'realtime' | 'daily' | 'weekly';
}
```

**Solar Flare/Space Weather Alerts:**
```typescript
interface SpaceWeatherConfig {
  flareClassMin: 'B' | 'C' | 'M' | 'X';  // Minimum flare class
  geomagneticStormMin: 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme';
  radioBlackoutMin: 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme';
  protonEventAlert: boolean;
  kpIndexThreshold?: number;  // Alert when Kp >= threshold
  includeForecasts: boolean;  // Include forecast alerts
  forecastHorizon: number;    // Hours ahead for forecasts
}
```

**Conjunction/Debris Alerts:**
```typescript
interface ConjunctionConfig {
  watchedObjectsOnly: boolean;  // Only for watchlist items
  missDistanceThreshold: number; // km
  probabilityThreshold: number;  // 0-1
  alertLevels: ('green' | 'yellow' | 'orange' | 'red')[];
  includeManeuvers: boolean;
  altitude?: { min?: number; max?: number };
  orbitType?: string[];
}
```

---

## 3. Dashboard Customization

### 3.1 Widget Layout System

Extend the existing `UserModulePreference` model to support full widget customization.

**Enhanced Database Schema:**
```prisma
model UserModulePreference {
  id         String  @id @default(cuid())
  userId     String
  moduleId   String
  enabled    Boolean @default(true)
  position   Int     @default(0)
  settings   String? // JSON string for module-specific settings

  // NEW: Layout configuration
  gridColumn   Int?    // Column position (0-based)
  gridRow      Int?    // Row position (0-based)
  gridWidth    Int     @default(1) // Column span (1-4)
  gridHeight   Int     @default(1) // Row span (1-3)
  isCollapsed  Boolean @default(false)
  isMinimized  Boolean @default(false)

  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, moduleId])
  @@index([userId])
}
```

### 3.2 Module-Specific Settings Schema

```typescript
interface ModuleSettings {
  // News Feed Module
  'news-feed'?: {
    categories: string[];
    sources: string[];
    refreshInterval: number; // minutes
    cardStyle: 'compact' | 'standard' | 'expanded';
    showImages: boolean;
    maxItems: number;
  };

  // Market Intel Module
  'market-intel'?: {
    defaultTickers: string[];
    chartTimeframe: '1D' | '1W' | '1M' | '3M' | '1Y';
    showPreMarket: boolean;
    showAfterHours: boolean;
    priceChangeFormat: 'percent' | 'absolute' | 'both';
  };

  // Mission Control Module
  'mission-control'?: {
    displayMode: 'list' | 'calendar' | 'timeline';
    eventTypes: string[];
    agencies: string[];
    countries: string[];
    showPastEvents: boolean;
    daysAhead: number;
  };

  // Solar Flares Module
  'solar-flares'?: {
    minFlareClass: 'B' | 'C' | 'M' | 'X';
    showForecast: boolean;
    showActivityGraph: boolean;
    daysHistory: number;
  };

  // ... Additional module settings
}
```

### 3.3 Theme & Display Preferences

**Database Schema:**
```prisma
model UserDisplayPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Theme
  theme           String   @default("dark") // dark, light, system, high-contrast
  accentColor     String   @default("cyan") // cyan, blue, green, orange, purple

  // Layout
  sidebarCollapsed Boolean @default(false)
  compactMode      Boolean @default(false)
  showModuleHeaders Boolean @default(true)
  animationsEnabled Boolean @default(true)

  // Data display
  dateFormat       String   @default("relative") // relative, absolute, iso
  timeZone         String   @default("local") // local, UTC, or specific timezone
  numberFormat     String   @default("abbreviated") // full, abbreviated, scientific

  // Refresh settings
  globalRefreshRate Int     @default(300) // seconds, 0 = manual only
  autoRefreshEnabled Boolean @default(true)

  // Accessibility
  reducedMotion    Boolean @default(false)
  highContrast     Boolean @default(false)
  fontSize         String   @default("medium") // small, medium, large, xlarge

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 4. User Preferences Storage Strategy

### 4.1 Storage Architecture

| Data Type | Primary Storage | Fallback | Sync Strategy |
|-----------|----------------|----------|---------------|
| Module preferences | PostgreSQL | localStorage | Server-authoritative |
| Display preferences | PostgreSQL | localStorage | Server-authoritative |
| Watchlists & alerts | PostgreSQL only | N/A | Server-only |
| Recent searches | localStorage | N/A | Client-only |
| UI state (collapsed panels) | localStorage | sessionStorage | Client-only |

### 4.2 Sync Service

```typescript
// src/lib/preferences-sync.ts

interface SyncState {
  lastSyncedAt: string;
  pendingChanges: PendingChange[];
  syncStatus: 'idle' | 'syncing' | 'error';
}

interface PreferencesSyncService {
  // Pull preferences from server
  fetchPreferences(): Promise<UserPreferences>;

  // Push local changes to server
  syncToServer(changes: PreferenceChange[]): Promise<void>;

  // Handle offline changes
  queueChange(change: PreferenceChange): void;

  // Process queued changes when back online
  processQueue(): Promise<void>;

  // Conflict resolution
  resolveConflict(local: UserPreferences, server: UserPreferences): UserPreferences;
}
```

### 4.3 Cross-Device Sync

The system uses a timestamp-based last-write-wins strategy with optional conflict detection:

```typescript
interface SyncMetadata {
  deviceId: string;
  lastModifiedAt: string;
  version: number;
}

// Each preference record includes sync metadata
interface SyncablePreference {
  data: unknown;
  sync: SyncMetadata;
}
```

---

## 5. Notification Delivery System

### 5.1 Unified Notification Model

**Database Schema:**
```prisma
model Notification {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Content
  type            String   // launch, price_alert, news, regulatory, conjunction, solar, system
  title           String
  message         String
  data            String?  // JSON with type-specific data

  // Linking
  link            String?  // In-app link
  externalUrl     String?  // External link

  // Priority & Category
  priority        String   @default("normal") // low, normal, high, urgent
  category        String?  // For grouping in notification center

  // Delivery tracking
  channels        String   // JSON array of channels this was sent to
  inAppRead       Boolean  @default(false)
  inAppReadAt     DateTime?
  emailSent       Boolean  @default(false)
  emailSentAt     DateTime?
  pushSent        Boolean  @default(false)
  pushSentAt      DateTime?
  smsSent         Boolean  @default(false)
  smsSentAt       DateTime?
  webhookSent     Boolean  @default(false)
  webhookSentAt   DateTime?

  // Metadata
  sourceAlertId   String?  // UserAlert that triggered this
  sourceAlert     UserAlert? @relation(fields: [sourceAlertId], references: [id])
  expiresAt       DateTime?

  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([type])
  @@index([createdAt])
  @@index([inAppRead])
}
```

### 5.2 Notification Preferences

```prisma
model NotificationPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Global settings
  notificationsEnabled Boolean @default(true)
  quietHoursEnabled    Boolean @default(false)
  quietHoursStart      String? // "22:00"
  quietHoursEnd        String? // "08:00"
  quietHoursTimezone   String? // User's timezone

  // Channel preferences (default for each channel)
  inAppEnabled         Boolean @default(true)
  emailEnabled         Boolean @default(true)
  emailDigestOnly      Boolean @default(false) // Bundle into digest instead of individual
  pushEnabled          Boolean @default(false)
  smsEnabled           Boolean @default(false)

  // Type-specific channel overrides (JSON)
  // e.g., { "launch": { "email": true, "push": true }, "news": { "email": false } }
  channelOverrides     String?

  // Email settings
  emailAddress         String? // Override from user profile
  emailFrequency       String  @default("realtime") // realtime, hourly, daily
  dailyDigestTime      String  @default("08:00")

  // Push settings
  pushSubscription     String? // JSON Web Push subscription object

  // SMS settings (enterprise)
  smsPhoneNumber       String?
  smsVerified          Boolean @default(false)

  // Webhook settings (enterprise)
  webhookUrl           String?
  webhookSecret        String?
  webhookEvents        String? // JSON array of event types to send

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### 5.3 Email Notification System

```typescript
// src/lib/notification-email.ts

interface EmailNotificationService {
  // Send immediate notification email
  sendNotificationEmail(notification: Notification): Promise<void>;

  // Generate and send digest
  sendDailyDigest(userId: string): Promise<void>;

  // Email templates
  templates: {
    launch: (data: LaunchNotificationData) => EmailContent;
    priceAlert: (data: PriceAlertData) => EmailContent;
    regulatory: (data: RegulatoryAlertData) => EmailContent;
    conjunction: (data: ConjunctionAlertData) => EmailContent;
    solarWeather: (data: SolarWeatherData) => EmailContent;
    digest: (data: DigestData) => EmailContent;
  };
}
```

### 5.4 PWA Push Notifications

```typescript
// src/lib/notification-push.ts

interface PushNotificationService {
  // Request permission and subscribe
  subscribe(userId: string): Promise<PushSubscription>;

  // Unsubscribe
  unsubscribe(userId: string): Promise<void>;

  // Send push notification
  sendPush(userId: string, notification: Notification): Promise<void>;

  // Batch send to multiple users
  sendBatch(userIds: string[], notification: Notification): Promise<void>;
}

// Service worker registration
// src/app/sw.ts
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      data: data.link,
      actions: data.actions,
    })
  );
});
```

### 5.5 Enterprise Integrations

**SMS via Twilio:**
```typescript
interface SMSNotificationService {
  sendSMS(phoneNumber: string, message: string): Promise<void>;
  verifyPhoneNumber(phoneNumber: string): Promise<string>; // Returns verification code
  confirmVerification(phoneNumber: string, code: string): Promise<boolean>;
}
```

**Webhook Integration:**
```typescript
interface WebhookNotificationService {
  sendWebhook(
    url: string,
    payload: WebhookPayload,
    secret: string
  ): Promise<WebhookResponse>;

  // Retry failed webhooks
  retryFailed(): Promise<void>;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: unknown;
  signature: string;
}
```

---

## 6. Technical Implementation

### 6.1 Complete Prisma Schema Additions

```prisma
// Add to existing User model
model User {
  // ... existing fields ...

  // New relations for personalization
  savedSearches        SavedSearch[]
  searchFolders        SearchFolder[]
  companyWatchlist     CompanyWatchlist[]
  satelliteWatchlist   SatelliteWatchlist[]
  stockPortfolios      StockPortfolio[]
  alerts               UserAlert[]
  notifications        Notification[]
  displayPreferences   UserDisplayPreferences?
  notificationPrefs    NotificationPreferences?
}

// Add relation to SpaceCompany
model SpaceCompany {
  // ... existing fields ...

  watchlistEntries     CompanyWatchlist[]
  stockHoldings        StockHolding[]
}
```

### 6.2 API Endpoints

```typescript
// Saved Searches
GET    /api/saved-searches              // List user's saved searches
POST   /api/saved-searches              // Create new saved search
GET    /api/saved-searches/:id          // Get saved search details
PUT    /api/saved-searches/:id          // Update saved search
DELETE /api/saved-searches/:id          // Delete saved search
POST   /api/saved-searches/:id/run      // Execute saved search

// Search Folders
GET    /api/search-folders              // List folders
POST   /api/search-folders              // Create folder
PUT    /api/search-folders/:id          // Update folder
DELETE /api/search-folders/:id          // Delete folder

// Watchlists
GET    /api/watchlists/companies        // List watched companies
POST   /api/watchlists/companies        // Add company to watchlist
PUT    /api/watchlists/companies/:id    // Update watchlist entry
DELETE /api/watchlists/companies/:id    // Remove from watchlist

GET    /api/watchlists/satellites       // List watched satellites
POST   /api/watchlists/satellites       // Add satellite to watchlist
PUT    /api/watchlists/satellites/:id   // Update watchlist entry
DELETE /api/watchlists/satellites/:id   // Remove from watchlist

// Stock Portfolios
GET    /api/portfolios                  // List portfolios
POST   /api/portfolios                  // Create portfolio
GET    /api/portfolios/:id              // Get portfolio with holdings
PUT    /api/portfolios/:id              // Update portfolio
DELETE /api/portfolios/:id              // Delete portfolio

GET    /api/portfolios/:id/holdings     // List holdings
POST   /api/portfolios/:id/holdings     // Add holding
PUT    /api/portfolios/:id/holdings/:holdingId  // Update holding
DELETE /api/portfolios/:id/holdings/:holdingId  // Remove holding
GET    /api/portfolios/:id/performance  // Calculate portfolio performance

// Alerts
GET    /api/alerts                      // List user's alerts
POST   /api/alerts                      // Create new alert
GET    /api/alerts/:id                  // Get alert details
PUT    /api/alerts/:id                  // Update alert
DELETE /api/alerts/:id                  // Delete alert
POST   /api/alerts/:id/pause            // Pause alert
POST   /api/alerts/:id/resume           // Resume alert
GET    /api/alerts/:id/history          // Get alert trigger history

// Notifications
GET    /api/notifications               // List notifications (paginated)
POST   /api/notifications/:id/read      // Mark as read
POST   /api/notifications/read-all      // Mark all as read
DELETE /api/notifications/:id           // Delete notification
DELETE /api/notifications               // Clear all notifications

// Preferences
GET    /api/preferences/display         // Get display preferences
PUT    /api/preferences/display         // Update display preferences
GET    /api/preferences/notifications   // Get notification preferences
PUT    /api/preferences/notifications   // Update notification preferences
POST   /api/preferences/sync            // Sync preferences from client
```

### 6.3 Real-Time Updates

**Option A: Server-Sent Events (Recommended for MVP)**

```typescript
// src/app/api/notifications/stream/route.ts
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to notification events for this user
      const subscription = await subscribeToUserNotifications(userId, (notification) => {
        const data = `data: ${JSON.stringify(notification)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Option B: WebSocket (For Enterprise/High-Frequency)**

```typescript
// Using Socket.io with Next.js
// src/lib/socket-server.ts
import { Server } from 'socket.io';

export function initializeSocket(httpServer: any) {
  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle subscription to specific channels
    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
    });
  });

  return io;
}

// Emit notification to user
export function emitNotification(userId: string, notification: Notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}
```

**Option C: Polling (Fallback)**

```typescript
// Client-side polling hook
// src/hooks/useNotificationPolling.ts
export function useNotificationPolling(interval = 30000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const poll = async () => {
      const response = await fetch('/api/notifications?since=' + lastFetch);
      const data = await response.json();
      if (data.notifications.length > 0) {
        setNotifications(prev => [...data.notifications, ...prev]);
      }
    };

    const intervalId = setInterval(poll, interval);
    return () => clearInterval(intervalId);
  }, [interval]);

  return notifications;
}
```

### 6.4 Background Jobs (Alert Processing)

```typescript
// src/lib/jobs/alert-processor.ts
// Using a cron job or queue system (e.g., BullMQ, Inngest)

interface AlertProcessor {
  // Process all active alerts of a specific type
  processAlertType(type: AlertType): Promise<void>;

  // Individual alert processing
  processAlert(alert: UserAlert): Promise<AlertResult>;

  // Schedule recurring checks
  scheduleChecks(): void;
}

// Example: Launch countdown alert processor
async function processLaunchCountdownAlerts() {
  const upcomingEvents = await prisma.spaceEvent.findMany({
    where: {
      launchDate: {
        gte: new Date(),
        lte: addHours(new Date(), 24),
      },
    },
  });

  const alerts = await prisma.userAlert.findMany({
    where: {
      alertType: 'launch_countdown',
      isActive: true,
      isPaused: false,
    },
  });

  for (const alert of alerts) {
    const config = JSON.parse(alert.config) as LaunchCountdownConfig;

    for (const event of upcomingEvents) {
      const minutesUntilLaunch = differenceInMinutes(event.launchDate, new Date());

      if (config.alertTimes.includes(minutesUntilLaunch)) {
        await createNotification({
          userId: alert.userId,
          type: 'launch',
          title: `Launch Alert: T-${formatDuration(minutesUntilLaunch)}`,
          message: `${event.name} launching from ${event.location}`,
          data: { eventId: event.id },
          link: '/mission-control',
          sourceAlertId: alert.id,
        });
      }
    }
  }
}
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Migrate NotificationCenter from localStorage to database
- [ ] Create Notification and NotificationPreferences Prisma models
- [ ] Implement `/api/notifications` endpoints
- [ ] Add server-side notification storage
- [ ] Update NotificationCenter component to use API

### Phase 2: Watchlists (Weeks 3-4)
- [ ] Implement CompanyWatchlist model and API
- [ ] Create watchlist UI components
- [ ] Add "Add to Watchlist" buttons throughout the app
- [ ] Implement watchlist dashboard widget
- [ ] Add basic notification triggers for watched companies

### Phase 3: Custom Alerts (Weeks 5-6)
- [ ] Implement UserAlert model
- [ ] Create alert configuration UI
- [ ] Build alert processing background job system
- [ ] Implement launch countdown alerts
- [ ] Implement stock price alerts
- [ ] Add alert management dashboard

### Phase 4: Dashboard Customization (Weeks 7-8)
- [ ] Extend UserModulePreference with layout fields
- [ ] Implement drag-and-drop module reordering
- [ ] Add module resize functionality
- [ ] Create display preferences UI
- [ ] Implement theme switching (dark/light)
- [ ] Add per-module settings panels

### Phase 5: Email Notifications (Weeks 9-10)
- [ ] Set up email sending infrastructure (Resend/SendGrid)
- [ ] Create email notification templates
- [ ] Implement real-time email notifications
- [ ] Build daily digest system
- [ ] Add email preference management

### Phase 6: Advanced Features (Weeks 11-12)
- [ ] Implement PWA push notifications
- [ ] Add saved searches functionality
- [ ] Create stock portfolio tracking
- [ ] Implement satellite watchlist
- [ ] Add solar weather alerts
- [ ] Build conjunction alerts

### Phase 7: Enterprise Features (Weeks 13-14)
- [ ] Implement SMS notifications (Twilio)
- [ ] Add webhook integration
- [ ] Build real-time WebSocket infrastructure
- [ ] Create enterprise notification management
- [ ] Add team/organization preferences

---

## 8. UI/UX Considerations

### 8.1 Notification Center Enhancements

```
+------------------------------------------+
|  Notifications                    [Settings]
+------------------------------------------+
|  [All] [Launches] [Stocks] [News] [System]
+------------------------------------------+
|  NEW                                      |
|  +--------------------------------------+ |
|  | [!] Launch Alert: T-1 Hour           | |
|  | SpaceX Starship Flight 15 from...    | |
|  | 12 minutes ago                        | |
|  +--------------------------------------+ |
|  | [$$] RKLB +5.2%                       | |
|  | Rocket Lab surged following...        | |
|  | 45 minutes ago                        | |
|  +--------------------------------------+ |
|                                          |
|  EARLIER TODAY                           |
|  +--------------------------------------+ |
|  | [!] Regulatory Deadline               | |
|  | FCC comment period closes in 3 days   | |
|  | 2 hours ago                           | |
|  +--------------------------------------+ |
+------------------------------------------+
|  [View All] [Mark All as Read]           |
+------------------------------------------+
```

### 8.2 Watchlist Management

```
+------------------------------------------+
|  My Watchlists                           |
+------------------------------------------+
|  [Companies] [Satellites] [Portfolios]   |
+------------------------------------------+
|  COMPANIES (12)                          |
|  +--------------------------------------+ |
|  | SpaceX         | Private | *** HIGH  | |
|  | Last: Starship Flight 15 announced   | |
|  | [News] [Alerts] [Remove]              | |
|  +--------------------------------------+ |
|  | Rocket Lab     | RKLB $12.45 +2.3%   | |
|  | Last: Neutron update expected        | |
|  | [News] [Alerts] [Remove]              | |
|  +--------------------------------------+ |
|  | AST SpaceMobile| ASTS $8.92 -1.2%    | |
|  | Last: Satellite deployment Q2        | |
|  | [News] [Alerts] [Remove]              | |
|  +--------------------------------------+ |
|                                          |
|  [+ Add Company]                         |
+------------------------------------------+
```

### 8.3 Alert Configuration

```
+------------------------------------------+
|  Create Alert                            |
+------------------------------------------+
|  Alert Type: [Launch Countdown  v]       |
+------------------------------------------+
|  Configuration:                          |
|  +--------------------------------------+ |
|  | Alert Times:                         | |
|  | [x] 24 hours before                  | |
|  | [x] 1 hour before                    | |
|  | [x] 15 minutes before                | |
|  | [ ] At launch                        | |
|  +--------------------------------------+ |
|  | Filters:                             | |
|  | Agencies: [SpaceX] [Rocket Lab] [+]  | |
|  | Countries: [Any v]                   | |
|  +--------------------------------------+ |
|  | Notify me via:                       | |
|  | [x] In-app notification              | |
|  | [x] Email                            | |
|  | [ ] Push notification                | |
|  +--------------------------------------+ |
+------------------------------------------+
|  [Cancel]                    [Save Alert] |
+------------------------------------------+
```

---

## 9. Security Considerations

1. **Rate Limiting**: Implement rate limits on notification endpoints to prevent spam
2. **Webhook Validation**: Use HMAC signatures for webhook payloads
3. **Phone Verification**: Require SMS verification before enabling SMS notifications
4. **Permission Scoping**: Ensure users can only access their own preferences/notifications
5. **Data Sanitization**: Sanitize all user-provided content in notifications
6. **Audit Logging**: Log all alert creations and notification deliveries for enterprise tier

---

## 10. Performance Considerations

1. **Pagination**: All list endpoints should be paginated (default 20 items)
2. **Caching**: Cache notification preferences in Redis for fast alert processing
3. **Batch Processing**: Process alerts in batches to reduce database load
4. **Notification TTL**: Auto-delete notifications older than 30 days (configurable)
5. **Index Optimization**: Ensure proper indexes on frequently queried fields
6. **Background Processing**: Move all notification delivery to background jobs

---

## 11. Monitoring & Analytics

Track the following metrics:
- Notification delivery success rates by channel
- Alert trigger frequency
- User engagement with notifications (open rates, click rates)
- Watchlist growth and activity
- Most popular alert configurations
- API response times for preference endpoints

---

## Conclusion

This personalization system will transform SpaceNexus from a static information platform into a dynamic, user-centric intelligence hub. By allowing users to customize their experience, track specific entities, and receive timely alerts, we increase engagement, retention, and the overall value proposition of the platform.

The phased implementation approach ensures we can deliver value incrementally while building toward the comprehensive vision outlined in this proposal.
