import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bricola.app',
  appName: 'Bricola',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
