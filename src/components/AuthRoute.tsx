// src/components/AuthRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react'; // Tipi import et

interface AuthRouteProps {
  children: ReactNode;
}

function AuthRoute({ children }: AuthRouteProps) {
  // Global context'imizden giriş durumunu çekiyoruz
  const { currentUser, loading } = useAuth();

  // 1. Durum Kontrolü: Henüz Auth durumu belli değilse (yükleniyor)
  if (loading) {
    return <div>Oturum durumu kontrol ediliyor...</div>;
  }

  // 2. Durum Kontrolü: Yüklendi VE kullanıcı giriş yapmış
  if (currentUser) {
    // Kullanıcı zaten giriş yapmış! Onu /login veya /signup
    // yerine ana sayfaya (Dashboard) yönlendir.
    return <Navigate to="/" replace />;
  }

  // 3. Durum Kontrolü: Yüklendi VE kullanıcı giriş yapmamış
  // Harika, istediği sayfayı (Login veya Signup) göster
  return children;
}

export default AuthRoute;