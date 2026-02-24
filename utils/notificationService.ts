
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
    static async init() {
        if (!Capacitor.isNativePlatform()) return;

        // Remove any previously registered listeners to prevent accumulation on re-login
        await PushNotifications.removeAllListeners();

        // Ensure permissions for local notifications as well
        await LocalNotifications.requestPermissions();

        // Request permission to use push notifications
        // iOS will prompt, Android >13 will too
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === 'granted') {
            // Register with Apple / Google to receive push via APNS/FCM
            await PushNotifications.register();
        }

        // On success, we should be able to receive notifications
        PushNotifications.addListener('registration', (token: Token) => {
            this.saveTokenToUser(token.value);
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (_error: any) => {
            // Registration failed — handled silently in production
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
            // Notification received while app is in foreground
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (_action: ActionPerformed) => {
            // Handle navigation based on notification payload here if needed
        });
    }

    static async saveTokenToUser(token: string) {
        const user = auth.currentUser;
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                // In production, you'd want to store tokens in a sub-collection for multiple devices
                await updateDoc(userRef, {
                    fcmToken: token
                });
            } catch {
                // Token save failed — will retry on next app launch
            }
        }
    }

    static async scheduleOnboardingReminder(userId: string, lang: 'AR' | 'EN') {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const title = lang === 'AR' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile';
            const body = lang === 'AR' ? 'صورة، تخصص، أم موقع؟ أكملهم لبدء العمل!' : 'Photo, specialty, or location? Finish them to start working!';

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: 10055, // unique id
                        schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24) }, // 24 hours
                        smallIcon: 'ic_stat_name', // should match your res/drawable
                        iconColor: '#f97316'
                    }
                ]
            });

            // Mark as scheduled in Firestore so we don't do it again
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { reminderScheduled: true });
        } catch {
            // Notification scheduling failed — non-critical
        }
    }

    static async cancelOnboardingReminder() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 10055 }] });
        } catch {
            // Notification cancel failed (might not exist) — non-critical
        }
    }
}
