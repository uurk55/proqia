// src/pages/AuditList.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore'; 
import { Link } from 'react-router-dom'; 

import {
  Title, Text, Paper, Table, Button, Group, Loader, Alert, Stack, Badge
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// Denetim dokümanının tipini tanımlayalım
interface AuditItem extends DocumentData {
  id: string;
  audit_code: string;
  audit_type: string;
  department: string;
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

function AuditList() {
  const { proqiaUser, permissions } = useAuth();
  const [allAudits, setAllAudits] = useState<AuditItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!proqiaUser) { setLoading(false); return; }; 

    const fetchAudits = async () => {
      setLoading(true);
      setError('');
      try {
        const auditsQuery = query(
          collection(db, "audits"),
          where("company_id", "==", proqiaUser.company_id),
          orderBy("audit_date", "desc")
        );

        const querySnapshot = await getDocs(auditsQuery);
        const auditsList: AuditItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditItem));
        setAllAudits(auditsList); 

      } catch (err: any) {
        console.error("Denetimler çekilemedi:", err);
        setError("Denetimler çekilemedi. Lütfen Firestore index'lerini kontrol edin (F12).");
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, [proqiaUser, permissions]);

  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>Denetimler</Title>
          <Text c="dimmed">Şirketinizde planlanmış tüm denetimleri görüntüleyin.</Text>
        </Stack>
      </Group>
      
      <Paper withBorder shadow="sm" radius="md">
        {allAudits.length === 0 ? ( 
          <Text ta="center" p="xl" c="dimmed">
            Şu anda planlanmış bir denetim bulunmuyor.
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Denetim Tipi</Table.Th>
                <Table.Th>Bölüm / Tedarikçi</Table.Th>
                <Table.Th>Planlanan Tarih</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allAudits.map(audit => (
                <Table.Tr key={audit.id}>
                  <Table.Td>{audit.audit_type}</Table.Td>
                  <Table.Td>{audit.department}</Table.Td>
                  <Table.Td>{audit.audit_date.toDate().toLocaleDateString('tr-TR')}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(audit.status)} variant="light">
                      {audit.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button component={Link} to={`/audit/${audit.id}`} size="xs">
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

export default AuditList;