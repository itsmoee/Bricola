
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getRemoteConfig } from "firebase/remote-config";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const storage = getStorage(app);

// Initialize with checks for web vs native
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);
export const remoteConfig = getRemoteConfig(app);

// Set default config
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
remoteConfig.defaultConfig = {
    'ramadan_promo_enabled': false,
    'reward_points_multiplier': 1,
    'onboarding_style': 'wizard',
    'cta_label_style': 'post',
    'browse_sort_default': 'rating',
};
