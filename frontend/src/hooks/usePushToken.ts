/**
 * usePushToken — registers an Expo push token with the backend.
 *
 * Push notifications require a standalone / development build.
 * expo-notifications is NOT compatible with Expo Go (SDK 53+) and is
 * intentionally excluded from this project until a dev build is set up.
 *
 * This hook is a no-op placeholder. Wire it up when running `npx expo run:android`.
 */
export function usePushToken() {
  // no-op in Expo Go
}
