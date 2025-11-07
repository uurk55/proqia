// src/pages/ComplaintList.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore'; 
import { Link } from 'react-router-dom'; 

import {
  Title, Text, Paper, Table, Button, Group, Loader, Alert, Stack, Badge
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ComplaintItem extends DocumentData {
  id: string;
  complaint_code: string;
  customer_name: string;
  complaint_subject: string;
  status: string;
  created_at: { toDate: () => Date };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Açık': return 'red';
    case 'İnceleniyor': return 'orange';
    case 'DÖF Başlatıldı': return 'grape';
    case 'Kapandı': return 'teal';
    default: return 'gray';
  }
};

function ComplaintList() {
  const { proqiaUser, permissions } = useAuth();
  
  const [allComplaints, setAllComplaints] = useState<ComplaintItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!proqiaUser) { setLoading(false); return; }; 

    const fetchComplaints = async () => {
      setLoading(true);
      setError('');
      try {
        const complaintsQuery = query(
          collection(db, "complaints"),
          where("company_id", "==", proqiaUser.company_id),
          orderBy("created_at", "desc")
        );

        const querySnapshot = await getDocs(complaintsQuery);
        const complaintsList: ComplaintItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComplaintItem));
        setAllComplaints(complaintsList); 

      } catch (err: any) {
        console.error("Şikayetler çekilemedi:", err);
        setError("Şikayetler çekilemedi. Lütfen Firestore index'lerini kontrol edin (F12).");
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [proqiaUser, permissions]);

  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>Müşteri Şikayetleri</Title>
          <Text c="dimmed">Şirketinize iletilen tüm müşteri şikayetlerini ve geri bildirimleri yönetin.</Text>
        </Stack>
      </Group>
      
      <Paper withBorder shadow="sm" radius="md">
        {allComplaints.length === 0 ? ( 
          <Text ta="center" p="xl" c="dimmed">
            Sistemde kayıtlı bir müşteri şikayeti bulunmuyor.
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Müşteri</Table.Th>
                <Table.Th>Konu</Table.Th>
                <Table.Th>Kayıt Tarihi</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allComplaints.map(complaint => (
                <Table.Tr key={complaint.id}>
                  <Table.Td>{complaint.customer_name}</Table.Td>
                  <Table.Td>{complaint.complaint_subject}</Table.Td>
                  <Table.Td>{complaint.created_at.toDate().toLocaleDateString('tr-TR')}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(complaint.status)} variant="light">
                      {complaint.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button 
                      component={Link} 
                      to={`/complaint/${complaint.id}`} 
                      size="xs"
                    >
                      İncele
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

export default ComplaintList;