// src/pages/NewDof.tsx

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom'; 

import {
  Title, Text, Paper, Button, Stack, TextInput, Textarea, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

function NewDof() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  // 1. YENİ: Gelen 'state' verisini almak için useLocation hook'unu kullan
  const location = useLocation();
  const complaintData = location.state;

  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // 2. YENİ: useState'lerin başlangıç değerlerini gelen veriye göre ayarla
  const [subject, setSubject] = useState(complaintData?.initialSubject || '');
  const [problemDescription, setProblemDescription] = useState(complaintData?.initialProblemDescription || '');

  const handleCreateDof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !problemDescription || !proqiaUser || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "corrective_actions"), {
        company_id: proqiaUser.company_id,
        // TODO: DÖF kodunu otomatik oluşturacak bir mekanizma lazım (örn: Cloud Function)
        dof_code: `DOF-${Date.now()}`, 
        subject: subject,
        problem_description: problemDescription,
        root_cause_analysis: '', // Bu alanlar sonraki adımlarda doldurulacak
        actions_to_be_taken: '', // Bu alanlar sonraki adımlarda doldurulacak
        status: "Açık", 
        created_at: Timestamp.now(),
        created_by: currentUser.uid
      });

      notifications.show({
        title: 'Başarılı!',
        message: 'Yeni DÖF kaydı başarıyla oluşturuldu.',
        color: 'teal',
        icon: <IconCheck />,
      });
      
      // TODO: DÖF listeleme sayfasını oluşturunca oraya yönlendirelim
      navigate('/'); 

    } catch (error) {
      console.error("DÖF oluşturma hatası: ", error);
      notifications.show({
        title: 'Hata!',
        message: 'DÖF oluşturulurken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = !subject.trim() || !problemDescription.trim();

  return (
    <Box maw={800} mx="auto"> 
      <Title order={2} mb="xs">Yeni Düzeltici Faaliyet (DÖF) Aç</Title>
      <Text c="dimmed" mb="lg">
        Tespit ettiğiniz bir uygunsuzluk veya iyileştirme fırsatı için yeni bir kayıt oluşturun.
      </Text>
      
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateDof}>
          <Stack gap="md">
            <TextInput
              required
              label="Konu / Başlık"
              placeholder="Örn: Üretim hattında XYZ hatası"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              required
              label="Sorun veya Geliştirme Alanının Detaylı Tanımı"
              placeholder="Sorun nerede, ne zaman, nasıl ve kim tarafından tespit edildi? Detaylıca açıklayın."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              minRows={5}
            />
            <Button type="submit" loading={isSubmitting} disabled={isFormInvalid} size="md" mt="md">
              DÖF Kaydını Oluştur
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewDof;