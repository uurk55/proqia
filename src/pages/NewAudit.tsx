// src/pages/NewAudit.tsx

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; 

import {
  Title, Text, Paper, Button, Stack, TextInput, Select, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle, IconCalendar } from '@tabler/icons-react';

// Mantine'in tarih seçici paketini kullanacağız
import { DateInput } from '@mantine/dates';

function NewAudit() {  
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // Form state'leri
  const [auditType, setAuditType] = useState('İç Denetim');
  const [department, setDepartment] = useState('');
  const [leadAuditor, setLeadAuditor] = useState('');
  const [auditDate, setAuditDate] = useState<Date | null>(null);

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !leadAuditor || !auditDate || !proqiaUser || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "audits"), {
        company_id: proqiaUser.company_id,
        audit_code: `DEN-${Date.now()}`, 
        audit_type: auditType,
        department: department,
        lead_auditor: leadAuditor,
        audit_date: Timestamp.fromDate(auditDate),
        status: "Planlandı", 
        created_at: Timestamp.now(),
        created_by: currentUser.uid
      });

      notifications.show({
        title: 'Başarılı!',
        message: 'Yeni denetim başarıyla planlandı.',
        color: 'teal',
        icon: <IconCheck />,
      });
      
      navigate('/audits'); 

    } catch (error) {
      console.error("Denetim planlama hatası: ", error);
      notifications.show({
        title: 'Hata!',
        message: 'Denetim planlanırken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = !department.trim() || !leadAuditor.trim() || !auditDate;

  return (
    <Box maw={800} mx="auto"> 
      <Title order={2} mb="xs">Yeni Denetim Planla</Title>
      <Text c="dimmed" mb="lg">
        Yeni bir iç veya dış denetim planlamak için aşağıdaki bilgileri doldurun.
      </Text>
      
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateAudit}>
          <Stack gap="md">
            <Select
              required
              label="Denetim Tipi"
              value={auditType}
              onChange={(value) => setAuditType(value || 'İç Denetim')}
              data={['İç Denetim', 'Tedarikçi Denetimi', 'Belgelendirme Denetimi']}
            />
            <TextInput
              required
              label="Denetlenecek Bölüm / Tedarikçi"
              placeholder="Örn: Üretim Departmanı veya Örnek Tedarikçi A.Ş."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <TextInput
              required
              label="Baş Denetçi"
              placeholder="Denetimi yönetecek kişinin adı"
              value={leadAuditor}
              onChange={(e) => setLeadAuditor(e.target.value)}
            />
            <DateInput
              required
              label="Planlanan Denetim Tarihi"
              placeholder="Bir tarih seçin"
              value={auditDate}
              // SİZİN ÇALIŞAN KODUNUZ: Metni Tarih objesine çeviren doğru yöntem
              onChange={(value) => setAuditDate(value ? new Date(value) : null)}
    
              // --- BENİM GÜZELLEŞTİRME EKLENTİLERİM ---
              locale="tr"
              valueFormat="DD MMMM YYYY"
              leftSection={<IconCalendar size={16} stroke={1.5} />}
              clearable 
            />

            <Button type="submit" loading={isSubmitting} disabled={isFormInvalid} size="md" mt="md">
              Denetimi Planla
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewAudit;