import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import and auto-run performance optimizations
import '@/lib/performanceUtils';
// Import mobile performance manager (battery, visibility, adaptive intervals)
import '@/lib/mobilePerformance';
// Initialize Capacitor native app features (back button, safe areas)
import { initCapacitor } from '@/lib/capacitorInit';

// Init native app features before render
initCapacitor();

// Ultra-fast render - no blocking operations
const root = document.getElementById("root")!;

// Use concurrent features for better INP
const appRoot = createRoot(root);
appRoot.render(<App />);

// Defer all non-critical operations until after first paint
const deferredInit = () => {
  // Prefetch auth page
  const authLink = document.createElement('link');
  authLink.rel = 'prefetch';
  authLink.href = '/auth';
  document.head.appendChild(authLink);
  
  // Preconnect to Supabase for faster API calls
  const supabaseLink = document.createElement('link');
  supabaseLink.rel = 'preconnect';
  supabaseLink.href = 'https://vubvqjqhfnalqjocgvae.supabase.co';
  supabaseLink.crossOrigin = 'anonymous';
  document.head.appendChild(supabaseLink);
  
  // DNS prefetch for fonts
  const fontsLink = document.createElement('link');
  fontsLink.rel = 'dns-prefetch';
  fontsLink.href = 'https://fonts.googleapis.com';
  document.head.appendChild(fontsLink);
  
  // Preconnect to S3/storage
  const s3Link = document.createElement('link');
  s3Link.rel = 'preconnect';
  s3Link.href = 'https://chatsev-media.s3.eu-central-1.amazonaws.com';
  s3Link.crossOrigin = 'anonymous';
  document.head.appendChild(s3Link);
};

// Run deferred init after first paint using scheduler API or fallback
if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
  (window as any).scheduler.postTask(deferredInit, { priority: 'background' });
} else if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(deferredInit, { timeout: 1000 });
} else {
  setTimeout(deferredInit, 50);
}

