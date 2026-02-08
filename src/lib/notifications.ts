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

  // No notifications yet — they'll be created by the system via addNotification()
  return [];
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
