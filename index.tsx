
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

// Global unhandled error monitoring — logs to Firebase Analytics
const reportError = (message: string, category: string) => {
  analytics.then(a => {
    if (!a) return;
    logEvent(a, 'app_error', {
      error_message: message.slice(0, 100),
      category,
      fatal: false
    });
  });
};

window.onerror = (_msg, _src, _line, _col, error) => {
  reportError(error?.message ?? String(_msg), 'uncaught_error');
  return false;
};

window.addEventListener('unhandledrejection', (event) => {
  reportError(
    String(event.reason?.message ?? event.reason ?? 'unhandled rejection'),
    'unhandled_promise'
  );
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);
