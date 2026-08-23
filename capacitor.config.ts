import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alivia.salud',
  appName: 'ALIVIA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#1a2a20',
      showSpinner: false,
    },
  },
};

export default config;
