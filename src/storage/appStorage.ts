import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  selectedRole: 'bricola_selected_role',
  referredBy: 'bricola_referred_by',
  viewTechProfile: 'bricola_view_tech_profile'
} as const;

export const appStorage = {
  async get(key: string) {
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string) {
    await AsyncStorage.removeItem(key);
  }
};
