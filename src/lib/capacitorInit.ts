/**
 * Capacitor Native App Integration
 * - Android back button: navigates history instead of closing app
 * - Status bar configuration
 * - Safe area handling
 * - Keyboard (IME) overlay detection for Android WebView
 * - Dynamic --vh unit for viewport height
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

let initialized = false;

export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Set --vh CSS variable to actual viewport height (fixes Android address bar / keyboard issues).
 * Uses visualViewport when available for most accurate value.
 */
const updateVhVariable = () => {
  const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

/**
 * Detect if env(safe-area-inset-*) is returning 0 and apply JS-based fallbacks.
 * On Android WebView without edge-to-edge Java config, these CSS env vars are 0
 * even though system bars overlap the WebView.
 */
const applySafeAreaFallbacks = () => {
  const root = document.documentElement;
  const platform = Capacitor.getPlatform();

  // Measure env() values via probe elements
  const testEl = document.createElement('div');
  testEl.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(testEl);
  const envBottom = testEl.offsetHeight;
  document.body.removeChild(testEl);

  const testTop = document.createElement('div');
  testTop.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(testTop);
  const envTop = testTop.offsetHeight;
  document.body.removeChild(testTop);

  if (envTop > 0) {
    root.style.setProperty('--safe-top', `${envTop}px`);
  } else if (platform === 'android') {
    // Android status bar: typically 24dp but can be 28-32dp on newer devices
    root.style.setProperty('--safe-top', '32px');
  }

  if (envBottom > 0) {
    root.style.setProperty('--safe-bottom', `${envBottom}px`);
  } else if (platform === 'android') {
    // Detect navigation mode: gesture nav has thin bar (~16dp), 3-button has ~48dp
    const dpr = window.devicePixelRatio || 1;
    const screenCssPx = window.screen.height / dpr;
    const chromeHeight = screenCssPx - window.innerHeight;
    // chromeHeight includes status bar + nav bar; subtract estimated status bar
    const navEstimate = chromeHeight - 32;
    const navBarPx = navEstimate > 40 ? 48 : navEstimate > 15 ? 24 : 16;
    root.style.setProperty('--safe-bottom', `${navBarPx}px`);
  }

  console.log('[Capacitor SafeArea]', {
    platform, envTop, envBottom,
    safeTop: root.style.getPropertyValue('--safe-top'),
    safeBottom: root.style.getPropertyValue('--safe-bottom'),
  });
};

export const initCapacitor = () => {
  if (initialized || !isNativeApp()) return;
  initialized = true;

  // Handle Android back button
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.minimizeApp();
    }
  });

  // Apply safe area CSS variables for native app
  document.documentElement.classList.add('capacitor-app');

  // ── Dynamic --vh unit ──
  updateVhVariable();

  // Apply safe area fallbacks for Android (where env() may return 0)
  requestAnimationFrame(() => {
    applySafeAreaFallbacks();
  });

  // ── Keyboard (IME) overlay detection via visualViewport ──
  if (window.visualViewport) {
    const vv = window.visualViewport;
    let prevKeyboardOpen = false;
    
    const onViewportChange = () => {
      const keyboardHeight = window.innerHeight - vv.height;
      const isKeyboardOpen = keyboardHeight > 50;

      document.documentElement.style.setProperty(
        '--keyboard-height',
        isKeyboardOpen ? `${keyboardHeight}px` : '0px'
      );

      if (isKeyboardOpen !== prevKeyboardOpen) {
        if (isKeyboardOpen) {
          document.documentElement.classList.add('keyboard-open');
        } else {
          document.documentElement.classList.remove('keyboard-open');
        }
        prevKeyboardOpen = isKeyboardOpen;
      }

      // Update --vh whenever viewport changes (keyboard open/close)
      updateVhVariable();
    };

    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
  }

  // ── Auto-scroll focused inputs into view when keyboard opens ──
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Skip auto-scroll for inputs inside fixed/sticky containers (e.g. messenger chat)
      // These layouts handle keyboard positioning via flex + adjustResize naturally
      const isInsideFixedContainer = target.closest('[class*="fixed"]') || 
                                      target.closest('[data-no-keyboard-scroll]');
      if (isInsideFixedContainer) return;

      setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    }
  });

  // Re-calculate on orientation change and resize
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      applySafeAreaFallbacks();
      updateVhVariable();
    }, 500);
  });

  window.addEventListener('resize', () => {
    updateVhVariable();
  });

  console.log('[Capacitor Viewport]', {
    platform: Capacitor.getPlatform(),
    screenW: window.screen.width,
    innerW: window.innerWidth,
    dpr: window.devicePixelRatio,
    viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content'),
  });
};
