'use client';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
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

function showToast(type: ToastType, message: string, title?: string, duration?: number): string {
  const id = generateId();
  const toast: Toast = { id, type, message, title, duration: duration ?? 5000 };
  toastListeners.forEach((listener) => listener(toast));
  return id;
}

export function dismissToast(id: string): void {
  dismissListeners.forEach((listener) => listener(id));
}

export const toast = {
  success: (message: string, title?: string, duration?: number) =>
    showToast('success', message, title, duration),
  error: (message: string, title?: string, duration?: number) =>
    showToast('error', message, title, duration),
  warning: (message: string, title?: string, duration?: number) =>
    showToast('warning', message, title, duration),
  info: (message: string, title?: string, duration?: number) =>
    showToast('info', message, title, duration),
};
