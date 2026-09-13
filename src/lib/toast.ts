'use client';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** An optional action rendered as a link inside the toast (2026-09-13):
 *  `href` renders an anchor, `onClick` a button; both dismiss the toast. */
export interface ToastLink {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  link?: ToastLink;
}

export interface ToastOptions {
  link?: ToastLink;
}

type ToastListener = (toast: Toast) => void;
type DismissListener = (id: string) => void;

const toastListeners: Set<ToastListener> = new Set();
const dismissListeners: Set<DismissListener> = new Set();

let idCounter = 0;

function generateId(): string {
  return `toast_${++idCounter}_${Date.now()}`;
}

export function onToast(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => { toastListeners.delete(listener); };
}

export function onDismiss(listener: DismissListener): () => void {
  dismissListeners.add(listener);
  return () => { dismissListeners.delete(listener); };
}

function showToast(type: ToastType, message: string, title?: string, duration?: number, options?: ToastOptions): string {
  const id = generateId();
  const toast: Toast = { id, type, message, title, duration: duration ?? 5000, ...(options?.link ? { link: options.link } : {}) };
  toastListeners.forEach((listener) => listener(toast));
  return id;
}

export function dismissToast(id: string): void {
  dismissListeners.forEach((listener) => listener(id));
}

export const toast = {
  success: (message: string, title?: string, duration?: number, options?: ToastOptions) =>
    showToast('success', message, title, duration, options),
  error: (message: string, title?: string, duration?: number, options?: ToastOptions) =>
    showToast('error', message, title, duration, options),
  warning: (message: string, title?: string, duration?: number, options?: ToastOptions) =>
    showToast('warning', message, title, duration, options),
  info: (message: string, title?: string, duration?: number, options?: ToastOptions) =>
    showToast('info', message, title, duration, options),
};
