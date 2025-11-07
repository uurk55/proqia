// src/pages/DofList.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore'; 
import { Link } from 'react-router-dom'; 

import {
  Title, Text, Paper, Table, Button, Group, Loader, TextInput, Alert, Stack, Badge
} from '@mantine/core';
import { IconSearch, IconAlertCircle } from '@tabler/icons-react';

// DÖF dokümanının tipini tanımlayalım
interface DofItem extends DocumentData {
  id: string;
  dof_code: string;
  subject: string;
  status: string;
  created_at: { toDate: () => Date };
}

// Status renklerini belirleyen bir yardımcı fonksiyon
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Açık': return 'blue';
    case 'Değerlendirmede': return 'orange';
    case 'Kapalı': return 'teal';
    case 'Reddedildi': return 'red';
    default: return 'gray';
  }
};

function DofList() {
  const { proqiaUser, permissions } = useAuth();
  
  const [allDofs, setAllDofs] = useState<DofItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // TODO: Arama ve filtreleme eklenecek
  // const [searchTerm, setSearchTerm] = useState(''); 

  useEffect(() => {
    // TODO: 'dof_view_list' iznini oluşturup kontrol etmeliyiz
    if (!proqiaUser) {
        setLoading(false);
        return;
    }; 

    const fetchDofs = async () => {
      setLoading(true);
      setError('');
      try {
        const dofsQuery = query(
          collection(db, "corrective_actions"),
          where("company_id", "==", proqiaUser.company_id),
          orderBy("created_at", "desc") // En yeniden en eskiye sırala
        );

        const querySnapshot = await getDocs(dofsQuery);
        const dofsList: DofItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DofItem));
        
        setAllDofs(dofsList); 

      } catch (err: any) {
        console.error("DÖF'ler çekilemedi:", err);
        setError("DÖF'ler çekilemedi. Lütfen Firestore index'lerini kontrol edin.");
      } finally {
        setLoading(false);
      }
    };

    fetchDofs();
  }, [proqiaUser, permissions]);

  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>Düzeltici Faaliyetler (DÖF)</Title>
          <Text c="dimmed">Şirketinizde açılmış tüm DÖF kayıtlarını görüntüleyin.</Text>
        </Stack>
        {/* TODO: Arama kutusu eklenecek */}
      </Group>
      
      <Paper withBorder shadow="sm" radius="md">
        {allDofs.length === 0 ? ( 
          <Text ta="center" p="xl" c="dimmed">
            Şu anda açılmış bir DÖF kaydı bulunmuyor.
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>DÖF Kodu</Table.Th>
                <Table.Th>Konu</Table.Th>
                <Table.Th>Oluşturma Tarihi</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allDofs.map(dof => (
                <Table.Tr key={dof.id}>
                  <Table.Td>{dof.dof_code}</Table.Td>
                  <Table.Td>{dof.subject}</Table.Td>
                  <Table.Td>{dof.created_at.toDate().toLocaleDateString('tr-TR')}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(dof.status)} variant="light">
                      {dof.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button 
                      // TODO: DÖF detay sayfası oluşturulunca linki güncellenecek
                      component={Link} 
                      to={`/dof/${dof.id}`} 
                      variant="filled"
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

export default DofList;