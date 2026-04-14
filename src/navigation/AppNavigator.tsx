 import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { appStorage, storageKeys } from '../storage/appStorage';
import { UserRole, UserProfile, ServiceRequest } from '../types';
import { NotificationService } from '../utils/notificationService';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { AuthForm } from '../components/AuthForm';
import { Dashboard } from '../components/Dashboard';
import { AdminDashboard } from '../components/AdminDashboard';
import { SettingsScreen } from '../components/SettingsScreen';
import { ProfilePage } from '../components/ProfilePage';
import { Onboarding } from '../components/Onboarding';
import { RequestControlPanel } from '../components/RequestControlPanel';
import { SystemAdminTool } from '../components/SystemAdminTool';

type RootStackParamList = {
  WELCOME: undefined;
  AUTH: undefined;
  DASHBOARD: undefined;
  SETTINGS: undefined;
  PROFILE: undefined;
  REQUEST_DETAILS: undefined;
  ONBOARDING: undefined;
  SYSTEM_RESET: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { profile: user, loading, logout, setProfile } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      setIsOnline(Boolean(state.isConnected));
    });
    return () => sub();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const role = (await appStorage.get(storageKeys.selectedRole)) as UserRole | null;
      if (role) {
        setSelectedRole(role);
      }

      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleIncomingUrl(initialUrl);
      }

      Linking.addEventListener('url', ({ url }) => {
        void handleIncomingUrl(url);
      });
    };

    const handleIncomingUrl = async (urlStr: string) => {
      try {
        const url = new URL(urlStr);
        const deepLink = url.searchParams.get('link');
        const processingUrl = deepLink ? new URL(deepLink) : url;

        if (processingUrl.pathname.includes('/ref/')) {
          const parts = processingUrl.pathname.split('/ref/');
          const refId = parts[1]?.split('/')[0];
          if (refId) {
            await appStorage.set(storageKeys.referredBy, refId);
          }
        }

        if (processingUrl.pathname.includes('/tech/')) {
          const parts = processingUrl.pathname.split('/tech/');
          const techId = parts[1]?.split('/')[0];
          if (techId) {
            await appStorage.set(storageKeys.viewTechProfile, techId);
          }
        }
      } catch {
        // Ignore malformed links.
      }
    };

    void bootstrap();
  }, []);

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
    await appStorage.set(storageKeys.selectedRole, role);
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setProfile(profile);
    void NotificationService.init();
  };

  const handleEnterPrototype = (role: UserRole = UserRole.CLIENT) => {
    const mockUser: UserProfile = {
      id: 'mock_guest',
      email: 'guest@bricola.tn',
      fullName:
        role === UserRole.CLIENT
          ? 'زائر حريف (Client Guest)'
          : 'زائر فني (Tech Guest)',
      role,
      status: 'APPROVED',
      isOnline: role === UserRole.TECHNICIAN ? true : undefined,
      notifications: [
        {
          id: '1',
          title: 'تجربة التطبيق',
          body: 'أنت تتصفح التطبيق في وضع التجربة. لا يتم حفظ البيانات.',
          createdAt: new Date().toLocaleDateString(),
          read: false
        }
      ]
    };
    setSelectedRole(role);
    setProfile(mockUser);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {language === 'AR' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection'}
          </Text>
        </View>
      ) : null}

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="WELCOME">
              {({ navigation }) => (
                <WelcomeScreen
                  onSelectRole={async role => {
                    await handleRoleSelect(role);
                    navigation.navigate('AUTH');
                  }}
                  onEnterPrototype={handleEnterPrototype}
                />
              )}
            </Stack.Screen>
            {selectedRole ? (
              <Stack.Screen name="AUTH">
                {({ navigation }) => (
                  <AuthForm
                    role={selectedRole}
                    onSuccess={profile => {
                      handleAuthSuccess(profile);
                      navigation.replace('DASHBOARD');
                    }}
                    onBack={() => navigation.goBack()}
                  />
                )}
              </Stack.Screen>
            ) : null}
          </>
        ) : (
          <>
            <Stack.Screen name="DASHBOARD">
              {({ navigation }) => (
                <View style={{ flex: 1 }}>
                  {user.role === UserRole.ADMIN ? (
                    <AdminDashboard
                      user={user}
                      onLogout={logout}
                      onSettings={() => navigation.navigate('SETTINGS')}
                      lang={language}
                    />
                  ) : (
                    <Dashboard
                      user={user}
                      onLogout={logout}
                      onSettings={() => navigation.navigate('SETTINGS')}
                      onProfile={() => navigation.navigate('PROFILE')}
                      onOnboarding={() => navigation.navigate('ONBOARDING')}
                      onUpdateProfile={setProfile}
                      onRequestDetails={req => {
                        setSelectedRequest(req);
                        navigation.navigate('REQUEST_DETAILS');
                      }}
                      lang={language}
                    />
                  )}
                  {user.role === UserRole.ADMIN ? (
                    <Pressable style={styles.adminTrigger} onPress={() => navigation.navigate('SYSTEM_RESET')} />
                  ) : null}
                </View>
              )}
            </Stack.Screen>
            <Stack.Screen name="PROFILE">
              {({ navigation }) => (
                <ProfilePage user={user} lang={language} onBack={() => navigation.goBack()} onUpdateProfile={setProfile} />
              )}
            </Stack.Screen>
            <Stack.Screen name="ONBOARDING">
              {({ navigation }) => (
                <Onboarding
                  user={user}
                  lang={language}
                  onFinish={updated => {
                    setProfile(updated);
                    navigation.replace('DASHBOARD');
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="REQUEST_DETAILS">
              {({ navigation }) =>
                selectedRequest ? (
                  <RequestControlPanel
                    request={selectedRequest}
                    user={user}
                    lang={language}
                    onBack={() => navigation.goBack()}
                    onUpdateProfile={setProfile}
                    onStatusUpdate={setSelectedRequest}
                    onOpenChat={() => navigation.goBack()}
                  />
                ) : (
                  <View style={styles.centered}>
                    <Text>No request selected</Text>
                  </View>
                )
              }
            </Stack.Screen>
            <Stack.Screen name="SETTINGS">
              {({ navigation }) => (
                <SettingsScreen
                  user={user}
                  lang={language}
                  onBack={() => navigation.goBack()}
                  onLogout={logout}
                  onLanguageChange={setLanguage}
                  onUpdateProfile={setProfile}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SYSTEM_RESET">
              {({ navigation }) => <SystemAdminTool onDone={() => navigation.goBack()} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  offlineText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' },
  adminTrigger: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
    opacity: 0.01
  }
});
