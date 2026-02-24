
import React from 'react';
import { analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  declare props: Readonly<{ children: React.ReactNode }>;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    analytics.then(a => {
      if (!a) return;
      logEvent(a, 'app_error', {
        error_message: error.message.slice(0, 100),
        component_stack: (info.componentStack ?? '').slice(0, 150),
        fatal: true,
        category: 'react_boundary'
      });
    });
  }

  render() {
    if (this.state.hasError) {
      const isAr = document.documentElement.dir === 'rtl';
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh',
          padding: '2rem', textAlign: 'center', background: '#fff'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>
            {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2rem' }}>
            {isAr ? 'يرجى إعادة تشغيل التطبيق' : 'Please restart the app'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem', background: '#f97316', color: '#fff',
              borderRadius: '1rem', fontWeight: 900, border: 'none',
              cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            {isAr ? 'إعادة التشغيل' : 'Reload'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
