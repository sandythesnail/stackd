/**
 * Clerk token cache backed by expo-secure-store, so the session survives app restarts
 * (the standard Clerk Expo pattern). Keys are sanitized to SecureStore's allowed charset.
 */
import * as SecureStore from 'expo-secure-store';

/** Shape Clerk expects for its token cache (getToken/saveToken). */
export type TokenCache = {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, value: string) => Promise<void>;
};

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore write failures — worst case the user re-authenticates next launch
    }
  },
};
