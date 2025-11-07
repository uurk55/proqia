// src/pages/DocumentList.tsx (YENİ VE MODERN ARAYÜZ)

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore'; 
import { Link } from 'react-router-dom'; 

// 1. GÜNCELLEME: Sayfa düzeni için <Stack> ekliyoruz
import {
  Title, Text, Paper, Table, Button, Group, Loader, TextInput, Alert, Stack
} from '@mantine/core';
import { IconSearch, IconAlertCircle } from '@tabler/icons-react';

// Tip tanımı aynı kalıyor
interface DocumentItem extends DocumentData {
  id: string;
  doc_code: string;
  doc_name: string;
  doc_type: string;
  status: string;
}

function DocumentList() {
  const { proqiaUser, permissions } = useAuth();
  
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([]); 
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 

  // Veri çekme ve filtreleme mantığı tamamen aynı, çünkü zaten çok iyi çalışıyor.
  useEffect(() => {
    if (!permissions?.doc_view_list) {
      setLoading(false);
      setError("Yayınlanmış dokümanları görme yetkiniz yok.");
      return; 
    }
    if (!proqiaUser) return; 

    const fetchDocuments = async () => {
      setLoading(true);
      setError('');
      try {
        const docsQuery = query(
          collection(db, "documents"),
          where("company_id", "==", proqiaUser.company_id),
          where("status", "==", "Yayınlandı")
        );

        const querySnapshot = await getDocs(docsQuery);
        const docsList: DocumentItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentItem));
        
        setAllDocuments(docsList); 
        setFilteredDocuments(docsList); 

      } catch (err: any) {
        setError("Dokümanlar çekilemedi. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [proqiaUser, permissions]);

  useEffect(() => {
    const filtered = allDocuments.filter((doc: DocumentItem) => 
      doc.doc_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.doc_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDocuments(filtered);
  }, [searchTerm, allDocuments]);

  // Yükleme ve Hata durumları aynı
  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Erişim Reddedildi!" color="red">{error}</Alert>;


  // --- 2. GÜNCELLEME: ARAYÜZÜN TAMAMEN YENİLENMİŞ HALİ ---
  return (
    <Stack gap="lg">
      {/* BAŞLIK VE ARAMA ALANI */}
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>Doküman Kütüphanesi</Title>
          <Text c="dimmed">Yayınlanmış ve güncel dokümanları arayın ve görüntüleyin.</Text>
        </Stack>
        <TextInput
          placeholder="Kod, ad veya tipe göre ara..."
          leftSection={<IconSearch size="0.9rem" stroke={1.5} />} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '350px' }}
        />
      </Group>
      
      {/* TABLO ALANI */}
      <Paper withBorder shadow="sm" radius="md">
        {allDocuments.length === 0 ? ( 
          <Text ta="center" p="xl" c="dimmed">
            Şu anda yayınlanmış bir doküman bulunmuyor.
          </Text>
        ) : filteredDocuments.length === 0 ? ( 
          <Text ta="center" p="xl" c="dimmed">
            Arama kriterlerinize uyan doküman bulunamadı.
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Doküman Kodu</Table.Th>
                <Table.Th>Doküman Adı</Table.Th>
                <Table.Th>Tipi</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDocuments.map(doc => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.doc_code}</Table.Td>
                  <Table.Td>{doc.doc_name}</Table.Td>
                  <Table.Td>{doc.doc_type}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {/* 3. GÜNCELLEME: Butonu tema rengimizle vurguluyoruz */}
                    <Button 
                      component={Link} 
                      to={`/doc/${doc.id}`} 
                      variant="filled" // veya sadece 'variant'ı kaldırın
                      size="xs"
                    >
                      Görüntüle
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}

export default DocumentList;