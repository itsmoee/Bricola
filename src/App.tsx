import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppNavigator } from './navigation/AppNavigator';

const App = () => {
  return (
    <React.StrictMode>
      <SafeAreaProvider>
        <AuthProvider>
          <LanguageProvider>
            <ErrorBoundary>
              <StatusBar style="dark" />
              <AppNavigator />
            </ErrorBoundary>
          </LanguageProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </React.StrictMode>
  );
};

export default App;
