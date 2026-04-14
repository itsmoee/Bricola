import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export class NotificationService {
  static async init() {
    if (!Device.isDevice) {
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    await this.saveTokenToUser(token.data);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX
      });
    }
  }

  static async saveTokenToUser(token: string) {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { fcmToken: token });
      } catch {
        // Non-blocking if token save fails.
      }
    }
  }

  static async scheduleOnboardingReminder(userId: string, lang: 'AR' | 'EN') {
    try {
      const title = lang === 'AR' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile';
      const body =
        lang === 'AR'
          ? 'صورة، تخصص، أم موقع؟ أكملهم لبدء العمل!'
          : 'Photo, specialty, or location? Finish them to start working!';

      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { reminderScheduled: true });
    } catch {
      // Notification scheduling is optional.
    }
  }

  static async cancelOnboardingReminder() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignore cancel failures.
    }
  }
}
