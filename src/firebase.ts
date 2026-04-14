import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getRemoteConfig } from 'firebase/remote-config';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// RN doesn't support multi-tab; use memory fallback if persistence isn't available.
export const db = initializeFirestore(app, {
  localCache:
    typeof window === 'undefined'
      ? memoryLocalCache()
      : persistentLocalCache()
});

export const storage = getStorage(app);
export const remoteConfig = getRemoteConfig(app);

// firebase/analytics web SDK is not supported in native RN runtime.
export const analytics = Promise.resolve(null);

remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
remoteConfig.defaultConfig = {
  ramadan_promo_enabled: false,
  reward_points_multiplier: 1,
  onboarding_style: 'wizard',
  cta_label_style: 'post',
  browse_sort_default: 'rating'
};
