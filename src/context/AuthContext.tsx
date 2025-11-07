// src/context/AuthContext.tsx

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 

// --- Tipler ---

// 1. Proqia Kullanıcı Tipi (Firestore'daki 'users' koleksiyonu)
interface ProqiaUser extends DocumentData {
  user_id: string;
  full_name: string;
  email: string;
  company_id: string;
  role_id: string;
  department_id?: string | null;
}

// YENİ: Rolün İzin Haritasının Tipi
export interface ProqiaPermissions {
  [key: string]: boolean; // Örn: { doc_create: true, role_manage: false }
}

// 2. Context'in Tutacağı Verilerin Tipi
interface AuthContextType {
  currentUser: User | null;         
  proqiaUser: ProqiaUser | null;  
  permissions: ProqiaPermissions | null; // YENİ: Kullanıcının yetkileri
  loading: boolean;                 
}

// 3. Context'i Oluşturma (Varsayılan değerlerle)
const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  proqiaUser: null, 
  permissions: null, // YENİ: Başlangıçta yetkiler boş
  loading: true 
});

// 4. Hook (Kanca)
export function useAuth() {
  return useContext(AuthContext);
}

// 5. Provider (Sağlayıcı)
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [proqiaUser, setProqiaUser] = useState<ProqiaUser | null>(null);
  const [permissions, setPermissions] = useState<ProqiaPermissions | null>(null); // YENİ: Yetkiler için state
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    // onAuthStateChanged dinleyicisi
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user); 
      
      if (user) {
        // Kullanıcı giriş yaptıysa...
        // 1. ADIM: Firestore'dan 'users' koleksiyonundaki profilini çek
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as ProqiaUser;
          setProqiaUser(userData);

          // 2. YENİ ADIM: Kullanıcının rolünü ('admin' vb.) al
          const roleId = userData.role_id;
          if (roleId) {
            // 3. YENİ ADIM: 'roles' koleksiyonundan o rolün izinlerini çek
            const roleDocRef = doc(db, 'roles', roleId);
            const roleDocSnap = await getDoc(roleDocRef);

            if (roleDocSnap.exists()) {
              // 4. YENİ ADIM: İzinleri (permissions) global state'e kaydet
              // Güvenlik kontrolü: Bu rol, bu kullanıcının şirketine mi ait?
              if (roleDocSnap.data().company_id === userData.company_id) {
                setPermissions(roleDocSnap.data().permissions);
              } else {
                console.error("Kritik Güvenlik Hatası: Rol ve Şirket Uyuşmazlığı!");
                setPermissions(null); // İzinleri reddet
              }
            } else {
              console.error(`Rol bulunamadı: ${roleId}`);
              setPermissions(null); // Rol bulunamadıysa izin yok
            }
          } else {
            setPermissions(null); // Rol ID'si yoksa izin yok
          }
        } else {
          console.error("Auth kullanıcısı var ama Firestore'da user kaydı yok!");
          setProqiaUser(null);
          setPermissions(null);
        }
      } else {
        // Kullanıcı çıkış yaptıysa...
        setProqiaUser(null);
        setPermissions(null); // YENİ: Yetkileri temizle
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []); 

  // Sağlayacağımız güncel değerler
  const value = {
    currentUser,
    proqiaUser,
    permissions, // YENİ: İzinleri de context'e ekle
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}