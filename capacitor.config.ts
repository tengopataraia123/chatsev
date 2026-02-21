import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fac70b203bcb4f2f9f7e8193e1ee985e',
  appName: 'ChatSev',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    // Enable WebView debugging for diagnostics (set false for production)
    webContentsDebuggingEnabled: true,
    // Keyboard resizes the WebView instead of panning
    adjustModeResize: true,
    initialFocus: false,
  },
  server: {
    url: 'https://chatsev.com',
    androidScheme: 'https',
    allowNavigation: [
      'chatsev.com',
      '*.chatsev.com',
    ],
  },
  plugins: {},
};

export default config;
