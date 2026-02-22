
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { db, auth } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
    static async init() {
        if (!Capacitor.isNativePlatform()) return;

        // Request permission to use push notifications
        // iOS will prompt, Android >13 will too
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === 'granted') {
            // Register with Apple / Google to receive push via APNS/FCM
            await PushNotifications.register();
        }

        // On success, we should be able to receive notifications
        PushNotifications.addListener('registration', (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            this.saveTokenToUser(token.value);
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push received: ' + JSON.stringify(notification));
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            console.log('Push action performed: ' + JSON.stringify(action));
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
            } catch (error) {
                console.error('Error saving FCM token:', error);
            }
        }
    }
}
