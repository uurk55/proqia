// src/pages/DocumentDetail.tsx (YENİ VE MODERN ARAYÜZ)

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

// 1. GÜNCELLEME: Gerekli Mantine bileşenlerini import ediyoruz
import {
  Title, Text, Paper, Loader, Alert, Stack, Group, Button, Box, Anchor
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

// Tipler aynı kalıyor
interface Doc extends DocumentData { doc_name: string; doc_code: string; current_version_id: string; }
interface DocVersion extends DocumentData { version_number: string; file_url: string; revision_notes: string; }

function DocumentDetail() {
  const { docId } = useParams<{ docId: string }>();
  const { proqiaUser, permissions } = useAuth();

  const [mainDoc, setMainDoc] = useState<Doc | null>(null);
  const [docVersion, setDocVersion] = useState<DocVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Veri çekme mantığı tamamen aynı kalıyor
  useEffect(() => {
    if (!docId || !proqiaUser) {
      if (permissions !== null && !permissions?.doc_view_list) {
        setError("Bu dokümanı görüntüleme yetkiniz yok.");
        setLoading(false);
      }
      return;
    }

    const fetchDocumentDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const docRef = doc(db, 'documents', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() || docSnap.data().company_id !== proqiaUser.company_id) {
          throw new Error("Doküman bulunamadı veya bu şirkete ait değil.");
        }
        const docData = docSnap.data() as Doc;
        setMainDoc(docData);

        if (!docData.current_version_id) {
          throw new Error("Dokümanın güncel bir versiyonu bulunamadı.");
        }
        
        const versionRef = doc(db, 'document_versions', docData.current_version_id);
        const versionSnap = await getDoc(versionRef);
        if (!versionSnap.exists() || versionSnap.data().company_id !== proqiaUser.company_id) {
          throw new Error("Doküman versiyonu bulunamadı.");
        }
        setDocVersion(versionSnap.data() as DocVersion);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (permissions?.doc_view_list) {
        fetchDocumentDetails();
    }
  }, [docId, proqiaUser, permissions]);

  // Yükleme ve Hata durumları aynı
  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;
  if (!mainDoc || !docVersion) return <Text>Doküman verileri yüklenemedi.</Text>;


  // --- 2. GÜNCELLEME: ARAYÜZÜN TAMAMEN YENİLENMİŞ HALİ ---
  return (
    <Stack gap="lg">
      {/* BAŞLIK VE BİLGİ ALANI */}
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Text c="dimmed" size="sm">{mainDoc.doc_code}</Text>
            <Title order={2}>{mainDoc.doc_name}</Title>
            <Text mt="xs">
              Mevcut Versiyon: <Text span fw={700}>{docVersion.version_number}</Text>
            </Text>
            <Text c="dimmed" size="sm" mt="xs">
              Revizyon Notu: {docVersion.revision_notes}
            </Text>
          </Stack>
          {/* "Kütüphaneye Dön" butonu */}
          <Button
            component={Link}
            to="/documents"
            variant="light"
            leftSection={<IconArrowLeft size={14} />}
          >
            Kütüphaneye Dön
          </Button>
        </Group>
      </Paper>

      {/* DOSYA GÖRÜNTÜLEYİCİ ALANI */}
      <Paper withBorder shadow="sm" radius="md" p="xs">
        <Box 
            component="iframe"
            src={docVersion.file_url}
            w="100%"
            h="calc(100vh - 280px)" // Ekran yüksekliğine göre dinamik yükseklik
            style={{ border: 0 }}
            title="Doküman Görüntüleyici"
        />
        {/* Fallback linki (iframe engellenirse) */}
        <Anchor href={docVersion.file_url} target="_blank" rel="noopener noreferrer" p="md" display="none">
          Önizleme yüklenemedi. Dosyayı yeni sekmede açmak için tıklayın.
        </Anchor>
      </Paper>
    </Stack>
  );
}

export default DocumentDetail;