// Platform bridge — detects Capacitor native environment and provides typed access
// All native integrations import from this file

let _isNative: boolean | null = null;

/**
 * Returns true when running inside Capacitor native shell (iOS/Android).
 * Returns false in a regular web browser or on the server.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  if (_isNative !== null) return _isNative;

  try {
    const win = window as any;
    _isNative = !!(
      win.Capacitor &&
      win.Capacitor.isNativePlatform &&
      win.Capacitor.isNativePlatform()
    );
  } catch {
    _isNative = false;
  }
  return _isNative;
}

/**
 * Returns 'ios', 'android', or 'web'.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (!isNativePlatform()) return 'web';
  try {
    const win = window as any;
    return win.Capacitor.getPlatform() as 'ios' | 'android';
  } catch {
    return 'web';
  }
}

/**
 * Returns true only when running on iOS inside Capacitor shell.
 */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
