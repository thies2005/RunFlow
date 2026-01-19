import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runflow.app',
  appName: 'RunFlow',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    url: 'https://runflow.schuelken.uk',
    cleartext: false
  }
};

export default config;
