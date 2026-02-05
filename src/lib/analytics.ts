/**
 * Analytics Utility Functions
 *
 * Provides helper functions for tracking events, page views,
 * and managing user consent preferences.
 */

const CONSENT_KEY = 'spacenexus_cookie_consent';

// Type declaration for Google Analytics gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Get the current consent status from localStorage
 * @returns 'granted' | 'denied' | null (null means no decision made yet)
 */
export function getConsentStatus(): 'granted' | 'denied' | null {
  if (typeof window === 'undefined') return null;

  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'granted' || consent === 'denied') {
    return consent;
  }
  return null;
}

/**
 * Set the consent status in localStorage
 * @param granted - Whether the user has granted consent
 */
export function setConsentStatus(granted: boolean): void {
  if (typeof window === 'undefined') return;

  const status = granted ? 'granted' : 'denied';
  localStorage.setItem(CONSENT_KEY, status);

  // Update Google Analytics consent mode if gtag is available
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: status,
    });
  }
}

/**
 * Check if analytics tracking is allowed based on consent
 */
export function isTrackingAllowed(): boolean {
  return getConsentStatus() === 'granted';
}

/**
 * Track a custom event with Google Analytics
 * @param category - Event category (e.g., 'Navigation', 'Module', 'User')
 * @param action - Event action (e.g., 'click', 'view', 'submit')
 * @param label - Optional event label for additional context
 * @param value - Optional numeric value associated with the event
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
): void {
  if (typeof window === 'undefined' || !window.gtag || !isTrackingAllowed()) {
    return;
  }

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

/**
 * Track a page view with Google Analytics
 * @param path - The page path (e.g., '/mission-control', '/news')
 * @param title - Optional page title
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag || !isTrackingAllowed()) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  });
}

/**
 * Initialize the data layer for Google Analytics
 * This should be called before loading the gtag.js script
 */
export function initDataLayer(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  // Set default consent state
  const consentStatus = getConsentStatus();

  // Initialize gtag function
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  // Configure default consent
  window.gtag('consent', 'default', {
    analytics_storage: consentStatus === 'granted' ? 'granted' : 'denied',
  });

  // If consent was already granted, update to granted
  if (consentStatus === 'granted') {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
  }
}
