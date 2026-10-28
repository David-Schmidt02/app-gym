import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/600.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import '@fontsource-variable/bricolage-grotesque';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

import App from './App';
import ProveedorSesion from './estado/ProveedorSesion';
import './estado/tema';
import './estilos.css';

if (Capacitor.isNativePlatform()) {
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  });

  const sincronizarBarra = () => {
    const oscuro = document.documentElement.dataset.theme === 'dark';
    StatusBar.setStyle({ style: oscuro ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: oscuro ? '#141210' : '#f2f0ec' }).catch(() => {});
  };

  sincronizarBarra();
  const observador = new MutationObserver(sincronizarBarra);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProveedorSesion>
      <App />
    </ProveedorSesion>
  </StrictMode>,
);
