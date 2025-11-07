// src/pages/ComplaintDetail.tsx

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

import {
  Title, Text, Paper, Loader, Alert, Stack, Group, Button, Badge, Divider
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconCircleDotted } from '@tabler/icons-react';

interface Complaint extends DocumentData {
  id: string;
  complaint_code: string;
  customer_name: string;
  complaint_subject: string;
  complaint_details: string;
  status: string;
  created_at: { toDate: () => Date };
}

// Status renkleri (ComplaintList'ten kopyalandı)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Açık': return 'red';
    case 'İnceleniyor': return 'orange';
    case 'DÖF Başlatıldı': return 'grape';
    case 'Kapandı': return 'teal';
    default: return 'gray';
  }
};

function ComplaintDetail() {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const { proqiaUser, permissions } = useAuth(); // permissions'ı da alalım

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!complaintId || !proqiaUser) {
        setLoading(false);
        return;
    }
    const fetchComplaintDetails = async () => {
      setLoading(true);
      try {
        const complaintRef = doc(db, 'complaints', complaintId);
        const complaintSnap = await getDoc(complaintRef);
        
        if (!complaintSnap.exists() || complaintSnap.data().company_id !== proqiaUser.company_id) {
          throw new Error("Şikayet kaydı bulunamadı veya bu şirkete ait değil.");
        }
        setComplaint({ id: complaintSnap.id, ...complaintSnap.data() } as Complaint);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaintDetails();
  }, [complaintId, proqiaUser]);

  // TODO: DÖF Başlatma Fonksiyonu
  const handleStartDof = () => {
    if (!complaint) return;

    // 1. Yeni DÖF sayfasına yönlendir.
    // 2. 'state' prop'u ile şikayet bilgilerini o sayfaya "gizlice" gönder.
    navigate('/dof/new', { 
      state: {
        // DÖF formunda hangi alanların dolmasını istiyorsak, onları burada tanımlıyoruz.
        initialSubject: `Şikayet: ${complaint.complaint_subject}`,
        initialProblemDescription: `Müşteri: ${complaint.customer_name}\n\nŞikayet Detayları:\n--------------------\n${complaint.complaint_details}`
      }
    });
  };


  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;
  if (!complaint) return <Text>Şikayet verileri yüklenemedi.</Text>;

  return (
    <Stack gap="lg">
      {/* BAŞLIK VE BİLGİ ALANI */}
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Group>
                <Title order={2}>{complaint.complaint_subject}</Title>
                <Badge color={getStatusColor(complaint.status)} variant="filled" size="lg">{complaint.status}</Badge>
            </Group>
            <Text c="dimmed">Müşteri: {complaint.customer_name}</Text>
          </Stack>
          <Button component={Link} to="/complaints" variant="light" leftSection={<IconArrowLeft size={14} />}>
            Şikayet Listesine Dön
          </Button>
        </Group>
      </Paper>

      {/* DETAY VE AKSİYON ALANI */}
      <Paper withBorder p="lg" radius="md">
        <Title order={4}>Şikayet Detayları</Title>
        <Divider my="sm" />
        <Text style={{ whiteSpace: 'pre-wrap' }}>{complaint.complaint_details}</Text>

        <Divider my="lg" label="Aksiyonlar" labelPosition="center" />
        
        {/* DÖF Başlatma Butonu (sadece DÖF açma izni olanlar görecek) */}
        {permissions?.dof_create && (
            <Button
                leftSection={<IconCircleDotted size={14} />}
                variant="outline"
                color="grape"
                onClick={handleStartDof}
            >
                Bu Şikayet İçin DÖF Başlat
            </Button>
        )}
      </Paper>
    </Stack>
  );
}

export default ComplaintDetail;