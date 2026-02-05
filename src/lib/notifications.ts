// Notification types and utilities for SpaceNexus

export type NotificationType = 'launch' | 'price_alert' | 'news' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  metadata?: {
    launchId?: string;
    companySymbol?: string;
    priceChange?: number;
    articleId?: string;
  };
}

const STORAGE_KEY = 'spacenexus_notifications';

// Get notifications from localStorage
export function getNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse notifications from localStorage:', error);
  }

  // Return mock notifications if none exist
  const mockNotifications = generateMockNotifications();
  setNotifications(mockNotifications);
  return mockNotifications;
}

// Save notifications to localStorage
export function setNotifications(notifications: Notification[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications to localStorage:', error);
  }
}

// Mark a single notification as read
export function markAsRead(notificationId: string): Notification[] {
  const notifications = getNotifications();
  const updated = notifications.map(n =>
    n.id === notificationId ? { ...n, read: true } : n
  );
  setNotifications(updated);
  return updated;
}

// Mark all notifications as read
export function markAllAsRead(): Notification[] {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  setNotifications(updated);
  return updated;
}

// Get unread count
export function getUnreadCount(): number {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
}

// Add a new notification
export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification[] {
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const updated = [newNotification, ...notifications].slice(0, 50); // Keep max 50 notifications
  setNotifications(updated);
  return updated;
}

// Delete a notification
export function deleteNotification(notificationId: string): Notification[] {
  const notifications = getNotifications();
  const updated = notifications.filter(n => n.id !== notificationId);
  setNotifications(updated);
  return updated;
}

// Clear all notifications
export function clearAllNotifications(): void {
  setNotifications([]);
}

// Generate mock notifications for demo purposes
export function generateMockNotifications(): Notification[] {
  const now = new Date();

  return [
    // Launch alerts
    {
      id: 'notif_launch_1',
      type: 'launch',
      title: 'Launch Alert: T-24 Hours',
      message: 'SpaceX Falcon 9 launching Starlink Group 12-15 from Kennedy Space Center',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      read: false,
      link: '/mission-control',
      metadata: {
        launchId: 'spacex-starlink-12-15',
      },
    },
    {
      id: 'notif_launch_2',
      type: 'launch',
      title: 'Launch Alert: T-1 Hour',
      message: 'Rocket Lab Electron launching satellite constellation from LC-1',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 mins ago
      read: false,
      link: '/mission-control',
      metadata: {
        launchId: 'rocketlab-electron-52',
      },
    },
    {
      id: 'notif_launch_3',
      type: 'launch',
      title: 'Launch Successful',
      message: 'Blue Origin New Glenn maiden flight completed successfully',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      read: true,
      link: '/mission-control',
      metadata: {
        launchId: 'blueorigin-newglenn-1',
      },
    },

    // Price alerts
    {
      id: 'notif_price_1',
      type: 'price_alert',
      title: 'Stock Alert: RKLB +7.2%',
      message: 'Rocket Lab USA (RKLB) surged 7.2% following successful Neutron test',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      read: false,
      link: '/market-intel',
      metadata: {
        companySymbol: 'RKLB',
        priceChange: 7.2,
      },
    },
    {
      id: 'notif_price_2',
      type: 'price_alert',
      title: 'Stock Alert: SPCE -5.3%',
      message: 'Virgin Galactic (SPCE) dropped 5.3% on delayed flight schedule',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      read: false,
      link: '/market-intel',
      metadata: {
        companySymbol: 'SPCE',
        priceChange: -5.3,
      },
    },
    {
      id: 'notif_price_3',
      type: 'price_alert',
      title: 'Stock Alert: ASTS +12.4%',
      message: 'AST SpaceMobile (ASTS) jumped 12.4% on successful satellite deployment',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      read: true,
      link: '/market-intel',
      metadata: {
        companySymbol: 'ASTS',
        priceChange: 12.4,
      },
    },

    // News alerts
    {
      id: 'notif_news_1',
      type: 'news',
      title: 'Breaking: NASA Artemis Update',
      message: 'NASA announces accelerated timeline for Artemis III lunar landing mission',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      read: false,
      link: '/news',
      metadata: {
        articleId: 'nasa-artemis-update-2026',
      },
    },
    {
      id: 'notif_news_2',
      type: 'news',
      title: 'SpaceX Starship Update',
      message: 'SpaceX receives FAA approval for Starship Flight 10 orbital test',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      read: false,
      link: '/news',
      metadata: {
        articleId: 'spacex-starship-flight10',
      },
    },
    {
      id: 'notif_news_3',
      type: 'news',
      title: 'ESA Partnership Announced',
      message: 'European Space Agency signs major contract with Arianespace for next-gen rockets',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      read: true,
      link: '/news',
      metadata: {
        articleId: 'esa-arianespace-contract',
      },
    },

    // System notifications
    {
      id: 'notif_system_1',
      type: 'system',
      title: 'New Feature: Solar Flare Alerts',
      message: 'Real-time solar activity monitoring is now available in the Solar Flares module',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      read: true,
      link: '/solar-flares',
    },
    {
      id: 'notif_system_2',
      type: 'system',
      title: 'Platform Maintenance Complete',
      message: 'Scheduled maintenance completed. All systems operational.',
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      read: true,
    },
  ];
}

// Format relative time for display
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get icon for notification type
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'launch':
      return 'rocket';
    case 'price_alert':
      return 'chart';
    case 'news':
      return 'newspaper';
    case 'system':
      return 'settings';
    default:
      return 'bell';
  }
}
