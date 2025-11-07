// src/firebaseConfig.js

// Firebase SDK'lerinden temel fonksiyonları import et
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ❗️❗️ BURAYA FIREBASE'İN SİZE VERDİĞİ CONFIG'İ YAPIŞTIRIN ❗️❗️
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};
// ❗️❗️ YUKARIDAKİ BİLGİLERİ KENDİ PROJENİZİNKİ İLE DEĞİŞTİRİN ❗️❗️

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// İhtiyacımız olan servisleri başlat ve dışa aktar (export et)
// Projenin başka yerlerinde bu değişkenleri kullanacağız.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ana uygulamayı da (gerekirse diye) dışa aktar
export default app;