import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * Opens a legal page (privacy policy, terms) without leaving the app.
 *
 * `Linking.openURL` used to be what both Settings' "Read the full privacy policy" and
 * signup's Terms/Privacy links called, and on native that hands the URL to iOS/Android,
 * which launches Safari or Chrome as a SEPARATE app — the student loses their place in
 * Stacked and has to switch back manually. `WebBrowser.openBrowserAsync` instead opens an
 * SFSafariViewController (iOS) / Custom Tab (Android): a sheet that slides up over the app
 * itself, with its own "Done" button, and closing it returns to exactly where the student
 * was. It is still trystacked.app rendering the real page — one policy, read the same way on
 * the website and from the app, rather than a second copy of the text living in the app that
 * someone has to remember to update in step with the real one.
 *
 * Web is the one platform where this already behaves the way this function wants everywhere
 * else — `window.open` (a real new tab, dismissible with the tab's own X) is the closest a
 * browser has to "slides over and comes back", so it keeps using Linking there rather than
 * asking expo-web-browser to reinvent what the browser already does correctly.
 */
export function openLegalPage(url: string) {
  if (Platform.OS === 'web') {
    void Linking.openURL(url);
    return;
  }
  void WebBrowser.openBrowserAsync(url);
}

export const PRIVACY_URL = 'https://trystacked.app/privacy.html';
export const TERMS_URL = 'https://trystacked.app/terms.html';
