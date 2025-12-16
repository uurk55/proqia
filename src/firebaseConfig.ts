import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ŞİMDİLİK KAPALI (upload çalışınca geri açacağız)
// import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDFa8gQvM4jM5AanDi5YdtUF9v9bACXUhQ",
  authDomain: "proqia-3b772.firebaseapp.com",
  projectId: "proqia-3b772",
  storageBucket: "proqia-3b772.firebasestorage.app",
  messagingSenderId: "62921017813",
  appId: "1:62921017813:web:21d667df1ca94df57dd55c"
};

const app = initializeApp(firebaseConfig);

/*
// 🔐 APP CHECK (sonra açacağız)
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("BURAYA_SITE_KEY_GELECEK"),
  isTokenAutoRefreshEnabled: true,
});
*/

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
