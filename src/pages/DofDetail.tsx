// src/pages/DofDetail.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

import {
  Title, Text, Paper, Loader, Alert, Stack, Group, Button, Badge, Divider
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

// DÖF dokümanının detaylı tipini tanımlayalım
interface Dof extends DocumentData {
  id: string;
  dof_code: string;
  subject: string;
  status: string;
  created_at: { toDate: () => Date };
  problem_description: string;
  // TODO: Diğer alanlar eklenecek
}

// Status renklerini belirleyen yardımcı fonksiyon (DofList'ten kopyalandı)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Açık': return 'blue';
    case 'Değerlendirmede': return 'orange';
    case 'Kapalı': return 'teal';
    case 'Reddedildi': return 'red';
    default: return 'gray';
  }
};

function DofDetail() {
  const { dofId } = useParams<{ dofId: string }>();
  const { proqiaUser } = useAuth();

  const [dof, setDof] = useState<Dof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dofId || !proqiaUser) {
        setLoading(false);
        return;
    }

    const fetchDofDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const dofRef = doc(db, 'corrective_actions', dofId);
        const dofSnap = await getDoc(dofRef);
        
        if (!dofSnap.exists() || dofSnap.data().company_id !== proqiaUser.company_id) {
          throw new Error("DÖF kaydı bulunamadı veya bu şirkete ait değil.");
        }
        
        setDof({ id: dofSnap.id, ...dofSnap.data() } as Dof);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDofDetails();
  }, [dofId, proqiaUser]);


  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;
  if (!dof) return <Text>DÖF verileri yüklenemedi.</Text>;

  return (
    <Stack gap="lg">
      {/* BAŞLIK VE BİLGİ ALANI */}
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Group>
                <Text c="dimmed" size="sm">{dof.dof_code}</Text>
                <Badge color={getStatusColor(dof.status)} variant="filled">{dof.status}</Badge>
            </Group>
            <Title order={2}>{dof.subject}</Title>
          </Stack>
          <Button component={Link} to="/dofs" variant="light" leftSection={<IconArrowLeft size={14} />}>
            DÖF Listesine Dön
          </Button>
        </Group>
      </Paper>

      {/* DETAY ALANLARI */}
      <Paper withBorder p="lg" radius="md">
        <Title order={4}>Sorun Tanımı</Title>
        <Text mt="xs">{dof.problem_description}</Text>
        
        <Divider my="lg" />

        {/* TODO: Kök Neden Analizi ve Aksiyonlar için alanlar buraya eklenecek */}
        <Text c="dimmed">Kök Neden Analizi ve Alınacak Aksiyonlar bölümleri yakında eklenecektir.</Text>
      </Paper>
    </Stack>
  );
}

export default DofDetail;