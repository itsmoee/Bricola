import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary as RNErrorBoundary } from 'react-error-boundary';

const Fallback: React.FC<{ resetErrorBoundary: () => void }> = ({ resetErrorBoundary }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>Please restart the app</Text>
      <Pressable style={styles.button} onPress={resetErrorBoundary}>
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );
};

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RNErrorBoundary FallbackComponent={Fallback}>
      {children}
    </RNErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF'
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 18 },
  button: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' }
});
