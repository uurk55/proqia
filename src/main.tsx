// src/main.tsx (GÜNCELLENMİŞ VE TEMALI HALİ)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// './index.css' dosyasını sildiğimiz için bu satırı da silebiliriz.
// import './index.css'; 
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';

import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

// 1. YENİ: Oluşturduğumuz tema dosyasını import ediyoruz
import { theme } from './theme.ts';

import '@mantine/notifications/styles.css';
import { Notifications } from '@mantine/notifications';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. YENİ: MantineProvider'a 'theme' prop'u ile temamızı veriyoruz */}
      <MantineProvider theme={theme}> 
        <Notifications /> {/* <-- 2. YENİ: Bu satırı ekleyin */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);