// src/pages/NewComplaint.tsx

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; 

import {
  Title, Text, Paper, Button, Stack, TextInput, Textarea, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

function NewComplaint() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // Form state'leri
  const [customerName, setCustomerName] = useState('');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !complaintSubject || !complaintDetails || !proqiaUser || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "complaints"), {
        company_id: proqiaUser.company_id,
        complaint_code: `SIK-${Date.now()}`, 
        customer_name: customerName,
        complaint_subject: complaintSubject,
        complaint_details: complaintDetails,
        status: "Açık", 
        created_at: Timestamp.now(),
        created_by: currentUser.uid
      });

      notifications.show({
        title: 'Başarılı!',
        message: 'Yeni müşteri şikayeti kaydı başarıyla oluşturuldu.',
        color: 'teal',
        icon: <IconCheck />,
      });
      
      // TODO: Şikayet listesi sayfasına yönlendir
      navigate('/complaints');

    } catch (error) {
      console.error("Şikayet oluşturma hatası: ", error);
      notifications.show({
        title: 'Hata!',
        message: 'Şikayet kaydı oluşturulurken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = !customerName.trim() || !complaintSubject.trim() || !complaintDetails.trim();

  return (
    <Box maw={800} mx="auto"> 
      <Title order={2} mb="xs">Yeni Müşteri Şikayeti Kaydı</Title>
      <Text c="dimmed" mb="lg">
        Müşteriden gelen bir şikayeti veya geri bildirimi sisteme kaydedin.
      </Text>
      
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateComplaint}>
          <Stack gap="md">
            <TextInput
              required
              label="Müşteri Adı / Unvanı"
              placeholder="Örn: Örnek Müşteri Ltd. Şti."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <TextInput
              required
              label="Şikayet Konusu"
              placeholder="Örn: XYZ ürünündeki çizikler"
              value={complaintSubject}
              onChange={(e) => setComplaintSubject(e.target.value)}
            />
            <Textarea
              required
              label="Şikayetin Detayları"
              placeholder="Şikayetin tüm ayrıntılarını, tarihleri ve ilgili kişileri buraya yazın."
              value={complaintDetails}
              onChange={(e) => setComplaintDetails(e.target.value)}
              minRows={5}
            />
            <Button type="submit" loading={isSubmitting} disabled={isFormInvalid} size="md" mt="md">
              Şikayet Kaydını Oluştur
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewComplaint;