import { isNativePlatform } from '@/lib/capacitor';

export interface BiometricResult {
  isAvailable: boolean;
  biometryType: 'faceId' | 'touchId' | 'fingerprint' | 'none';
}

/**
 * Check if biometric authentication is available on this device.
 */
export async function checkBiometricAvailability(): Promise<BiometricResult> {
  if (!isNativePlatform()) {
    return { isAvailable: false, biometryType: 'none' };
  }

  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();

    let biometryType: BiometricResult['biometryType'] = 'none';
    if (result.isAvailable) {
      // biometryType: 1 = TouchID, 2 = FaceID, 3 = fingerprint (Android)
      switch (result.biometryType) {
        case 1: biometryType = 'touchId'; break;
        case 2: biometryType = 'faceId'; break;
        case 3: biometryType = 'fingerprint'; break;
      }
    }

    return { isAvailable: result.isAvailable, biometryType };
  } catch {
    return { isAvailable: false, biometryType: 'none' };
  }
}

/**
 * Prompt the user for biometric authentication.
 * Returns true if verified, false otherwise.
 */
export async function authenticateWithBiometric(
  reason: string = 'Verify your identity'
): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'SpaceNexus Authentication',
      subtitle: reason,
      description: 'Use biometrics to continue',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Store credentials in the device's secure enclave (Keychain on iOS).
 */
export async function storeCredentials(
  server: string,
  username: string,
  password: string
): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.setCredentials({ server, username, password });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve stored credentials after biometric verification.
 */
export async function getCredentials(
  server: string
): Promise<{ username: string; password: string } | null> {
  if (!isNativePlatform()) return null;

  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const result = await NativeBiometric.getCredentials({ server });
    return { username: result.username, password: result.password };
  } catch {
    return null;
  }
}
