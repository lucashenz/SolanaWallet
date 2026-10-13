// Persists the wallet secret in the OS keystore (Android Keystore /
// iOS Keychain) via expo-secure-store. Nothing secret goes to AsyncStorage,
// logs, or app backups (allowBackup is off in app.json).
import * as SecureStore from 'expo-secure-store';

const SECRET_KEY = 'wallet.secret.v1';
const NETWORK_KEY = 'wallet.network.v1';

const OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// secret: { type: 'mnemonic' | 'secretKey', value: string }
export async function saveSecret(secret) {
  await SecureStore.setItemAsync(SECRET_KEY, JSON.stringify(secret), OPTIONS);
}

export async function loadSecret() {
  const raw = await SecureStore.getItemAsync(SECRET_KEY, OPTIONS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === 'mnemonic' || parsed.type === 'secretKey') && parsed.value) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

export async function deleteSecret() {
  await SecureStore.deleteItemAsync(SECRET_KEY, OPTIONS);
}

export async function saveNetwork(network) {
  await SecureStore.setItemAsync(NETWORK_KEY, network);
}

export async function loadNetwork() {
  return SecureStore.getItemAsync(NETWORK_KEY);
}
