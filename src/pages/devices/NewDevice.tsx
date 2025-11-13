// src/pages/NewDevice.tsx

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; 

import {
  Title, Text, Paper, Button, Stack, TextInput, Box, NumberInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle, IconCalendar } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import 'dayjs/locale/tr';

function NewDevice() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // Form state'leri
  const [deviceName, setDeviceName] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [location, setLocation] = useState('');
  const [maintenancePeriod, setMaintenancePeriod] = useState<string | number>(6);
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState<Date | null>(null);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName || !deviceCode || !location || !lastMaintenanceDate || !proqiaUser || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      // Bir sonraki bakım tarihini otomatik hesapla
      const nextDate = new Date(lastMaintenanceDate);
      nextDate.setMonth(nextDate.getMonth() + Number(maintenancePeriod));

      await addDoc(collection(db, "devices"), {
        company_id: proqiaUser.company_id,
        device_name: deviceName,
        device_code: deviceCode,
        location: location,
        maintenance_period: Number(maintenancePeriod),
        last_maintenance_date: Timestamp.fromDate(lastMaintenanceDate),
        next_maintenance_date: Timestamp.fromDate(nextDate),
        status: "Aktif", 
        created_at: Timestamp.now(),
        created_by: currentUser.uid
      });

      notifications.show({
        title: 'Başarılı!',
        message: 'Yeni cihaz başarıyla kaydedildi.',
        color: 'teal',
        icon: <IconCheck />,
      });
      
      navigate('/devices'); 

    } catch (error) {
      console.error("Cihaz oluşturma hatası: ", error);
      notifications.show({
        title: 'Hata!',
        message: 'Cihaz kaydedilirken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid = !deviceName.trim() || !deviceCode.trim() || !location.trim() || !lastMaintenanceDate;

  return (
    <Box maw={800} mx="auto"> 
      <Title order={2} mb="xs">Yeni Cihaz / Ekipman Kaydı</Title>
      <Text c="dimmed" mb="lg">
        Bakım ve kalibrasyon takibi yapılacak yeni bir cihazı sisteme ekleyin.
      </Text>
      
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateDevice}>
          <Stack gap="md">
            <TextInput required label="Cihaz Adı" placeholder="Örn: Hassas Terazi No: 3" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
            <TextInput required label="Cihaz Kodu / Seri No" placeholder="Örn: HT-003" value={deviceCode} onChange={(e) => setDeviceCode(e.target.value)} />
            <TextInput required label="Bulunduğu Yer" placeholder="Örn: Kalite Kontrol Laboratuvarı" value={location} onChange={(e) => setLocation(e.target.value)} />
            <NumberInput required label="Bakım / Kalibrasyon Periyodu (Ay)" placeholder="Örn: 6" min={1} value={maintenancePeriod} onChange={setMaintenancePeriod} />
            <DateInput
                required
                label="Son Bakım / Kalibrasyon Tarihi"
                placeholder="Bir tarih seçin"
                value={lastMaintenanceDate}
                onChange={(value) => setLastMaintenanceDate(value ? new Date(value) : null)}
                locale="tr" valueFormat="DD MMMM YYYY"
                leftSection={<IconCalendar size={16} stroke={1.5} />}
                clearable
            />
            <Button type="submit" loading={isSubmitting} disabled={isFormInvalid} size="md" mt="md">
              Cihazı Kaydet
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewDevice;
