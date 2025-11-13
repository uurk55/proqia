// src/pages/Dashboard.tsx (TAM VE HATASIZ KOD)

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore'; 
import { Link } from 'react-router-dom';

import {
  Title,
  Text,
  Paper,
  Table,
  Button,
  Group,
  Alert,
  Loader,
  Stack
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface TaskDoc extends DocumentData {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: { toDate: () => Date };
  related_version_id: string;
}

function Dashboard() {
  const { proqiaUser } = useAuth();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!proqiaUser) {
      setLoading(false);
      return; 
    }

    const fetchTasks = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. YENİ: Sorgu objemizi 'let' ile tanımlıyoruz ki sonradan değiştirebilelim.
        let tasksQuery = query(
          collection(db, "tasks"),
          where("company_id", "==", proqiaUser.company_id),
          where("status", "==", "Beklemede")
        );

        // 2. YENİ: KULLANICI ADMIN DEĞİLSE, sadece kendi rolünün görevlerini görecek filtreyi ekle.
        if (proqiaUser.role_id !== 'admin') {
          tasksQuery = query(tasksQuery, where("assigned_to_role_id", "==", proqiaUser.role_id));
        }
        
        // Admin ise, yukarıdaki filtre eklenmeyecek ve şirketteki TÜM bekleyen görevler gelecek.

        const querySnapshot = await getDocs(tasksQuery);
        
        const tasksList: TaskDoc[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TaskDoc));

        // 3. GÜNCELLEME: Client-side sıralamayı geri ekliyoruz, çünkü orderBy olmadan index gerekmez.
        tasksList.sort((a, b) => b.created_at.toDate().getTime() - a.created_at.toDate().getTime());
        
        setTasks(tasksList);

      } catch (err: any) {
        console.error("Firestore sorgu hatası:", err);
        setError("Görevler çekilemedi. Lütfen tarayıcı konsolunu (F12) kontrol edin.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [proqiaUser]);

  if (loading) {
    return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  }

  // ÖNEMLİ: Hata durumunda konsolu kontrol etmeyi söyleyen daha net bir mesaj
  if (error) {
    return (
        <Alert icon={<IconAlertCircle size="1.2rem" />} title="Bir Hata Oluştu!" color="red">
            {error} <br/>
            Eğer bu bir index hatasıysa, çözüm için gerekli link genellikle tarayıcı konsolunda (F12) görünür.
        </Alert>
    );
  }

  // Arayüz kısmı aynı
  return (
    <Stack>
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Hoş Geldin, {proqiaUser?.full_name}!</Title>
            <Text c="dimmed">Bugün tamamlaman gereken görevlerin aşağıda listeleniyor.</Text>
          </Stack>
        </Group>
      </Paper>

      <Group justify="space-between" mt="xl" mb="xs">
        <Title order={3}>Bekleyen Görevlerim</Title>
        <Text c="dimmed">{tasks.length} adet bekleyen göreviniz var.</Text>
      </Group>

      <Paper withBorder shadow="sm" radius="md">
        {tasks.length === 0 ? (
          <Text ta="center" p="lg" c="dimmed">
            Size atanmış bekleyen bir göreviniz bulunmuyor. Harika!
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Görev Başlığı</Table.Th>
                <Table.Th>Atanma Tarihi</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map(task => (
                <Table.Tr key={task.id}>
                  <Table.Td>
                    <Text fw={500}>{task.title}</Text>
                    <Text size="xs" c="dimmed">{task.type}</Text>
                  </Table.Td>
                  <Table.Td>{task.created_at.toDate().toLocaleDateString('tr-TR')}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button component={Link} to={`/task/approve/${task.id}`} size="xs">
                      Görevi Aç
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

export default Dashboard;