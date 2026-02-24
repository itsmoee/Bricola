
import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsScreen } from './components/SettingsScreen';
import { ProfilePage } from './components/ProfilePage';
import { RequestControlPanel } from './components/RequestControlPanel';
import { Onboarding } from './components/Onboarding';
import { SystemAdminTool } from './components/SystemAdminTool';
import { UserRole, UserProfile, ServiceRequest, translations } from './types';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { NotificationService } from './utils/notificationService';
import { analytics, db } from './firebase';
import { logEvent } from 'firebase/analytics';
import { App as CapApp } from '@capacitor/app';
import { doc, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const { profile: user, loading, logout, setProfile } = useAuth();
  const { language, setLanguage } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState<'WELCOME' | 'AUTH' | 'DASHBOARD' | 'SETTINGS' | 'PROFILE' | 'REQUEST_DETAILS' | 'ONBOARDING' | 'SYSTEM_RESET'>('WELCOME');

  useEffect(() => {
    const setupDeepLinks = async () => {
      // For initial launch from a link
      const launchUrl = await CapApp.getLaunchUrl();
      if (launchUrl) {
         handleIncomingUrl(launchUrl.url);
      }

      // While app is already open
      CapApp.addListener('appUrlOpen', (data) => {
        handleIncomingUrl(data.url);
      });
    };

    const handleIncomingUrl = (urlStr: string) => {
      if (!urlStr) return;
      try {
        const url = new URL(urlStr);
        // Check if it's a Firebase Dynamic Link or a direct deep link
        const deepLink = url.searchParams.get('link');
        const processingUrl = deepLink ? new URL(deepLink) : url;

        if (processingUrl.pathname.includes('/ref/')) {
           const parts = processingUrl.pathname.split('/ref/');
           const refId = parts[1].split('/')[0];
           if (refId) {
              localStorage.setItem('bricola_referred_by', refId);
           }
        }

        if (processingUrl.pathname.includes('/tech/')) {
           const parts = processingUrl.pathname.split('/tech/');
           const techId = parts[1].split('/')[0];
           if (techId) {
              localStorage.setItem('bricola_view_tech_profile', techId);
           }
        }
      } catch {
        // Silently ignore malformed URLs
      }
    };

    setupDeepLinks();
  }, []);

  const [previousStep, setPreviousStep] = useState<'WELCOME' | 'AUTH' | 'DASHBOARD' | 'SETTINGS' | 'PROFILE' | 'REQUEST_DETAILS' | 'ONBOARDING' | 'SYSTEM_RESET'>('WELCOME');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(() => {
    return localStorage.getItem('bricola_selected_role') as UserRole | null;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Analytics tracking for app start
    analytics.then(a => a && logEvent(a, 'app_open'));
  }, []);

  const handleOnboardingFinish = (updatedUser: UserProfile) => {
    handleUpdateProfile(updatedUser);
    setCurrentStep('DASHBOARD');
  };

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (currentStep === 'WELCOME' || currentStep === 'AUTH') {
           if (user.onboardingCompleted) {
              setCurrentStep('DASHBOARD');
           } else {
              setCurrentStep('ONBOARDING');
           }
        }
      } else {
        if (currentStep === 'DASHBOARD' || currentStep === 'SETTINGS' || currentStep === 'ONBOARDING') {
          setCurrentStep('WELCOME');
        }
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (user && user.id !== 'mock_guest' && user.onboardingComplete !== true && !user.reminderScheduled) {
       NotificationService.scheduleOnboardingReminder(user.id, language as any);
    }
  }, [user, language]);

  useEffect(() => {
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
  }, [language]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    localStorage.setItem('bricola_selected_role', role);
    setCurrentStep('AUTH');
    analytics.then(a => a && logEvent(a, 'select_role', { role }));
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setProfile(profile);
    
    // Initialize real push notifications
    NotificationService.init();
    analytics.then(a => a && logEvent(a, 'login', { method: 'email', role: profile.role }));

    if (!profile.onboardingCompleted) {
       setCurrentStep('ONBOARDING');
    } else {
       setCurrentStep('DASHBOARD');
    }
  };

  const handleEnterPrototype = (role: UserRole = UserRole.CLIENT) => {
    const mockUser: UserProfile = {
      id: 'mock_guest',
      email: 'guest@bricola.tn',
      fullName: role === UserRole.CLIENT ? 'زائر حريف (Client Guest)' : 'زائر فني (Tech Guest)',
      role: role,
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
    setCurrentStep('DASHBOARD');
  };

  const handleLogout = async () => {
    await logout();
    setSelectedRole(null);
    setCurrentStep('WELCOME');
  };

  const handleOpenSettings = () => {
    setPreviousStep(currentStep as any);
    setCurrentStep('SETTINGS');
  };

  const handleOpenProfile = () => {
    setPreviousStep(currentStep as any);
    setCurrentStep('PROFILE');
  };

  const handleOpenRequestDetails = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setPreviousStep(currentStep as any);
    setCurrentStep('REQUEST_DETAILS');
  };

  const handleUpdateProfile = (updatedUser: UserProfile) => {
    setProfile(updatedUser);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen relative overflow-hidden bg-white ${language === 'AR' ? 'text-right' : 'text-left'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-slate-800 text-white text-xs font-black py-2 px-4 uppercase tracking-widest">
          <span>📵</span>
          {language === 'AR' ? 'لا يوجد اتصال بالإنترنت — وضع عدم الاتصال' : 'No internet connection — Offline mode'}
        </div>
      )}

      {/* Secret trigger: Triple-click top-left — only accessible to authenticated admins */}
      {currentStep === 'DASHBOARD' && user?.role === UserRole.ADMIN && (
        <div
          onClick={(e) => {
            if (e.detail === 3) setCurrentStep('SYSTEM_RESET');
          }}
          className="absolute top-0 left-0 w-20 h-20 z-[9999] opacity-0"
        />
      )}

      {currentStep === 'SYSTEM_RESET' && user?.role === UserRole.ADMIN && <SystemAdminTool />}

      <main className="flex-1 overflow-y-auto">
        {currentStep === 'WELCOME' && (
          <WelcomeScreen onSelectRole={handleRoleSelect} onEnterPrototype={handleEnterPrototype} />
        )}

        {currentStep === 'AUTH' && selectedRole && (
          <AuthForm 
            role={selectedRole} 
            onSuccess={handleAuthSuccess} 
            onBack={() => setCurrentStep('WELCOME')} 
          />
        )}

        {currentStep === 'DASHBOARD' && user && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {user.role === UserRole.ADMIN ? (
              <AdminDashboard user={user} onLogout={handleLogout} onSettings={handleOpenSettings} lang={language} />
            ) : (
              <Dashboard 
                user={user} 
                onLogout={handleLogout} 
                onSettings={handleOpenSettings} 
                onProfile={handleOpenProfile}
                onOnboarding={() => setCurrentStep('ONBOARDING')}
                onUpdateProfile={handleUpdateProfile}
                onRequestDetails={handleOpenRequestDetails}
                lang={language} 
              />
            )}
          </div>
        )}

        {currentStep === 'PROFILE' && user && (
          <ProfilePage 
            user={user} 
            lang={language} 
            onBack={() => setCurrentStep('DASHBOARD')} 
            onUpdateProfile={handleUpdateProfile} 
          />
        )}

        {currentStep === 'ONBOARDING' && user && (
          <Onboarding 
            user={user}
            lang={language}
            onFinish={handleOnboardingFinish}
          />
        )}

        {currentStep === 'REQUEST_DETAILS' && user && selectedRequest && (
          <RequestControlPanel 
            request={selectedRequest}
            user={user}
            lang={language}
            onBack={() => setCurrentStep('DASHBOARD')}
            onUpdateProfile={handleUpdateProfile}
            onStatusUpdate={(updatedReq) => setSelectedRequest(updatedReq)}
            onOpenChat={(reqId) => {
              // This can be handled by passing message to dashboard or navigation
              // For now, let's just go back and let the dashboard handle it,
              // or we can implement real chat here later.
              setCurrentStep('DASHBOARD');
            }}
          />
        )}

        {currentStep === 'DASHBOARD' && !user && (
          <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
             <p className="text-gray-500 font-bold">{translations[language]?.pleaseWait || 'Please wait...'}</p>
             <button onClick={handleLogout} className="text-orange-500 underline">{translations[language]?.exit || 'Exit'}</button>
          </div>
        )}

        {currentStep === 'SETTINGS' && user && (
          <SettingsScreen 
            user={user} 
            lang={language}
            onBack={() => setCurrentStep(previousStep)} 
            onLogout={handleLogout}
            onLanguageChange={setLanguage}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {currentStep !== 'DASHBOARD' && currentStep !== 'SETTINGS' && (
        <footer className="p-4 text-center">
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
            Bricola Tunisia &copy; 2025
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
