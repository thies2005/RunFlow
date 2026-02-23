import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runflow.app',
  appName: 'RunFlow',
  webDir: 'public',
  backgroundColor: '#00000000',
  server: {
    androidScheme: 'https',
    url: 'https://runflow.schuelken.uk',
    cleartext: false
  }
};

export default config;
