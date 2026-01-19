import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app/App.jsx';
import NotificationProvider from '@shared/notifications/NotificationProvider.jsx';

function supportsModernViewportUnits() {
  return typeof window !== 'undefined'
    && window.CSS
    && typeof window.CSS.supports === 'function'
    && (window.CSS.supports('height: 100dvh') || window.CSS.supports('height: 100svh'));
}

if (typeof window !== 'undefined' && !window.__youScoutsViewportFixApplied && !supportsModernViewportUnits()) {
  const setViewportUnit = () => {
    const vh = (window.innerHeight ?? window.document?.documentElement?.clientHeight ?? 0) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  let rafId = null;
  const refreshViewportUnit = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      setViewportUnit();
    });
  };

  setViewportUnit();
  window.addEventListener('resize', refreshViewportUnit);
  window.addEventListener('orientationchange', refreshViewportUnit);

  window.__youScoutsViewportFixApplied = true;
}

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <StrictMode>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </StrictMode>
);
