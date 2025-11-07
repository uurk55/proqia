// src/components/Navbar.tsx (YENİ VE GELİŞTİRİLMİŞ HALİ)

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

// 1. GÜNCELLEME: Mantine'den yeni bileşenler import ediyoruz
import { Group, Button, Text, Anchor, Box, Divider, Title } from '@mantine/core';
import { useMantineTheme } from '@mantine/core'; // Temamızın renklerine erişmek için

function Navbar() {
  const { currentUser, proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();
  
  // 2. GÜNCELLEME: Temamızın renklerine erişmek için bir hook kullanıyoruz
  const theme = useMantineTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error("Çıkış yapılamadı:", err);
    }
  };

  // 3. GÜNCELLEME: createLinkButton fonksiyonunu daha modern hale getiriyoruz
  // Artık sadece Link değil, aktif sayfayı da vurgulayabiliriz (şimdilik sade tutalım)
  const createLinkButton = (to: string, label: string) => (
    <Button
      component={Link}
      to={to}
      variant="subtle" // 'subtle' arka plansız, temiz bir görünüm verir
      color="gray"    // Normalde gri, üzerine gelince tema rengi olacak
      c={theme.colors.gray[7]} // Yazı rengini biraz daha belirgin yapalım
    >
      {label}
    </Button>
  );

  return (
    // 4. GÜNCELLEME: Ana Group bileşenini bir Box içine alarak daha iyi kontrol sağlıyoruz
    <Box>
      <Group justify="space-between" h="100%">
        
        {/* Sol Taraf (Logo ve Navigasyon Linkleri) */}
        <Group>
          {/* 5. GÜNCELLEME: Logoyu daha belirgin hale getiriyoruz */}
          <Anchor component={Link} to="/" underline="never">
            <Title order={3} c={theme.primaryColor}>PROQIA</Title>
          </Anchor>

          {currentUser && proqiaUser && (
            // 6. GÜNCELLEME: Logo ile linkler arasına ince bir ayırıcı (Divider) koyuyoruz
            <Group gap="xs" ml="md">
              <Divider orientation="vertical" />
              {permissions?.doc_view_list && createLinkButton("/documents", "Kütüphane")}
              {permissions?.doc_create && createLinkButton("/documents/new", "Yeni Doküman")}
              {permissions?.dof_create && createLinkButton("/dof/new", "Yeni DÖF")}
              {permissions?.dof_view_list && createLinkButton("/dofs", "DÖF Listesi")}
              {permissions?.audit_create && createLinkButton("/audit/new", "Yeni Denetim")}
              {permissions?.audit_view_list && createLinkButton("/audits", "Denetim Listesi")}
              {permissions?.complaint_create && createLinkButton("/complaint/new", "Yeni Şikayet")}
              {permissions?.complaint_view_list && createLinkButton("/complaints", "Şikayet Listesi")}
              {permissions?.device_create && createLinkButton("/device/new", "Yeni Cihaz")}
              
              {/* Admin linklerini ayırmak için */}
              {(permissions?.role_manage || permissions?.workflow_manage) && (
                <>
                  <Divider orientation="vertical" />
                  <Text size="sm" fw={500} c="dimmed">Admin:</Text>
                  {permissions?.role_manage && createLinkButton("/admin/roles", "Roller")}
                  {permissions?.workflow_manage && createLinkButton("/admin/workflows", "İş Akışları")}
                </>
              )}
            </Group>
          )}
        </Group>
        
        {/* Sağ Taraf (Kullanıcı Bilgisi ve Çıkış) */}
        <Group>
          {currentUser && proqiaUser ? (
            <>
              <Text size="sm" c="dimmed">Hoş geldin, <Text span fw={500} c="dark">{proqiaUser.full_name}</Text></Text>
              <Button variant="light" color="red" size="sm" onClick={handleLogout}>
                Çıkış Yap
              </Button>
            </>
          ) : (
            <Group>
              {/* 7. GÜNCELLEME: Giriş ve Kayıt butonlarını daha standart hale getiriyoruz */}
              <Button component={Link} to="/login" variant="default" size="sm">
                Giriş Yap
              </Button>
              <Button component={Link} to="/signup" size="sm"> {/* primaryColor otomatik olarak atanır */}
                Kayıt Ol
              </Button>
            </Group>
          )}
        </Group>
      </Group>
    </Box>
  );
}

export default Navbar;