// src/pages/Signup.tsx (YENİ VE CİLALANMIŞ HALİ)

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebaseConfig'; 
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // updateProfile eklendi
import { setDoc, addDoc, collection, doc, Timestamp } from 'firebase/firestore';

import {
  Paper, Title, Text, TextInput, PasswordInput, Button, Anchor, Stack, Alert, Center
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

function Signup() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. GÜNCELLEME: handleSignup fonksiyonunu daha temiz hale getiriyoruz
  // (Cloud Function'a geçmediğimiz için eski mantık korunuyor ama daha temiz yazılıyor)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!fullName || !companyName || !email || !password) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Auth'a kaydet
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Kullanıcının Auth profiline ismini ekleyelim (Hoş geldin demek için faydalı)
      await updateProfile(newUser, { displayName: fullName });

      // 2. 'companies' koleksiyonuna kaydet
      const companyRef = await addDoc(collection(db, "companies"), {
        company_name: companyName,
        owner_user_id: newUser.uid,
        subscription_status: "free_trial", 
        created_at: Timestamp.now()
      });

      // 3. 'users' koleksiyonuna kaydet
      await setDoc(doc(db, "users", newUser.uid), {
        user_id: newUser.uid,
        full_name: fullName,
        email: email,
        company_id: companyRef.id,
        role_id: 'admin', // İlk kullanıcıya 'admin' rolünü atıyoruz
        department_id: null, 
        created_at: Timestamp.now()
      });

      // 4. Ana sayfaya yönlendir
      navigate('/'); 

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kullanılıyor.');
      } else if (err.code === 'auth/weak-password') {
        setError('Şifre en az 6 karakter olmalı.');
      } else {
        setError('Kayıt başarısız oldu. Lütfen daha sonra tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // Sayfayı dikeyde ortalamak için <Center> kullanıyoruz
    // paddingTop'ı biraz azaltarak daha iyi bir görünüm elde edebiliriz
    <Center style={{ paddingTop: '30px', paddingBottom: '30px' }}>
      <Paper withBorder shadow="md" p="xl" radius="md" w={450}>
        
        {/* 2. YENİ: Marka kimliği için logo ekliyoruz */}
        <Title order={2} ta="center" c="myColor"> 
          PROQIA
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Yeni şirket hesabınızı ve admin kullanıcınızı oluşturun.
        </Text>

        <form onSubmit={handleSignup}>
          <Stack gap="md">
            
            {error && (
              <Alert 
                icon={<IconAlertCircle size="1.2rem" />} 
                title="Kayıt Hatası" 
                color="red" 
                radius="md" 
                withCloseButton
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            <TextInput required label="Tam Adınız" placeholder="Adınız Soyadınız" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <TextInput required label="Şirket Adınız" placeholder="Örnek A.Ş." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <TextInput required label="E-posta Adresiniz" placeholder="admin@sirket.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput required label="Şifre" placeholder="En az 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} />

            <Button type="submit" loading={loading} fullWidth mt="md">
              Ücretsiz Kayıt Ol
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="lg">
          Zaten bir hesabınız var mı?{' '}
          <Anchor component={Link} to="/login" size="sm">
            Giriş Yapın
          </Anchor>
        </Text>
        
      </Paper>
    </Center>
  );
}

export default Signup;