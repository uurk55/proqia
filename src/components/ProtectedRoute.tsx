// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react'; // Tipi import et

// Bu bileşen, içine koyduğumuz diğer bileşenleri (children) sarmalar
// (Eski React'ta 'children' props'u kullanılırdı,
// v6 ve sonrasında 'Outlet' daha yaygın veya 'children' props'u alınabilir)

// Children props'unu alacak şekilde düzeltelim:
interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Global context'imizden giriş durumunu çekiyoruz
  const { currentUser, loading } = useAuth();

  // 1. Durum Kontrolü: Henüz Auth durumu belli değilse (yükleniyor)
  if (loading) {
    return <div>Oturum durumu kontrol ediliyor...</div>;
  }

  // 2. Durum Kontrolü: Yüklendi AMA kullanıcı giriş yapmamış
  if (!currentUser) {
    // Kullanıcı giriş yapmamış, onu /login sayfasına yönlendir
    // 'replace' kullanıyoruz ki tarayıcı geçmişinde geri gelemesin
    return <Navigate to="/login" replace />;
  }

  // 3. Durum Kontrolü: Yüklendi VE kullanıcı giriş yapmış
  // Harika, istediği sayfayı (children) göster
  return children;
}

export default ProtectedRoute;