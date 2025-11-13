// src/pages/AuditDetail.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

import {
  Title, Text, Paper, Loader, Alert, Stack, Group, Button, Badge, Divider
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

// Denetim dokümanının detaylı tipini tanımlayalım
interface Audit extends DocumentData {
  id: string;
  audit_code: string;
  audit_type: string;
  department: string;
  lead_auditor: string;
  status: string;
  audit_date: { toDate: () => Date };
}

// Status renklerini belirleyen yardımcı fonksiyon
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Planlandı': return 'blue';
    case 'Devam Ediyor': return 'orange';
    case 'Tamamlandı': return 'teal';
    default: return 'gray';
  }
};

function AuditDetail() {
  const { auditId } = useParams<{ auditId: string }>();
  const { proqiaUser } = useAuth();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auditId || !proqiaUser) {
        setLoading(false);
        return;
    }

    const fetchAuditDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const auditRef = doc(db, 'audits', auditId);
        const auditSnap = await getDoc(auditRef);
        
        if (!auditSnap.exists() || auditSnap.data().company_id !== proqiaUser.company_id) {
          throw new Error("Denetim kaydı bulunamadı veya bu şirkete ait değil.");
        }
        
        setAudit({ id: auditSnap.id, ...auditSnap.data() } as Audit);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditDetails();
  }, [auditId, proqiaUser]);


  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;
  if (!audit) return <Text>Denetim verileri yüklenemedi.</Text>;

  return (
    <Stack gap="lg">
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Group>
                <Title order={2}>{audit.audit_type}</Title>
                <Badge color={getStatusColor(audit.status)} variant="filled" size="lg">{audit.status}</Badge>
            </Group>
            <Text c="dimmed">Denetlenecek: {audit.department}</Text>
          </Stack>
          <Button component={Link} to="/audits" variant="light" leftSection={<IconArrowLeft size={14} />}>
            Denetim Listesine Dön
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Title order={4}>Denetim Bilgileri</Title>
        <Divider my="sm" />
        <Group mt="md">
            <Stack gap={0} w={200}>
                <Text fz="sm" c="dimmed">Planlanan Tarih</Text>
                <Text fw={500}>{audit.audit_date.toDate().toLocaleDateString('tr-TR')}</Text>
            </Stack>
            <Stack gap={0} w={200}>
                <Text fz="sm" c="dimmed">Baş Denetçi</Text>
                <Text fw={500}>{audit.lead_auditor}</Text>
            </Stack>
        </Group>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Title order={4}>Denetim Bulguları ve Rapor</Title>
        <Divider my="sm" />
        <Text c="dimmed" mt="md">Denetim bulguları ve raporlama özellikleri yakında eklenecektir.</Text>
      </Paper>
    </Stack>
  );
}

export default AuditDetail;