// src/pages/RoleManager.tsx (YENİ VE CİLALANMIŞ HALİ)

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ProqiaPermissions } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

// 1. GÜNCELLEME: Yeni Mantine bileşenlerini ve bildirim sistemini import ediyoruz
import {
  Title, Text, Paper, Table, Button, Alert, Loader, TextInput, Stack,
  Checkbox, Accordion, Grid, Badge, Tooltip // Badge ve Tooltip eklendi
} from '@mantine/core';
import { notifications } from '@mantine/notifications'; // Bildirim sistemi
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

// Tipler aynı kalıyor
interface PermissionDoc { id: string; permissions: { [key: string]: string }; }
interface RoleDoc { id: string; name: string; permissions: ProqiaPermissions; }

function RoleManager() {
  const { permissions, proqiaUser } = useAuth();
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDoc[]>([]);
  const [existingRoles, setExistingRoles] = useState<RoleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<ProqiaPermissions>({});
  
  // 2. YENİ: Kaydetme butonu için ayrı bir yükleme state'i
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Veri çekme useEffect'i aynı
  useEffect(() => {
    // ... (içerik tamamen aynı)
    if (!permissions?.role_manage) { setLoading(false); return; }
    const fetchData = async () => {
      if (!proqiaUser) return;
      try {
        const permsQuery = query(collection(db, "permissions"));
        const permsSnapshot = await getDocs(permsQuery);
        const permsList: PermissionDoc[] = permsSnapshot.docs.map(doc => ({ id: doc.id, permissions: doc.data() }));
        setAvailablePermissions(permsList);

        const rolesQuery = query(collection(db, "roles"), where("company_id", "==", proqiaUser.company_id));
        const rolesSnapshot = await getDocs(rolesQuery);
        const rolesList: RoleDoc[] = rolesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, permissions: doc.data().permissions }));
        setExistingRoles(rolesList);
      } catch (error) { console.error("Rol/İzin verisi çekilemedi:", error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [permissions, proqiaUser]);

  const handlePermissionChange = (permKey: string) => {
    setNewRolePermissions(prev => ({ ...prev, [permKey]: !prev[permKey] }));
  };

  // 3. GÜNCELLEME: handleCreateRole fonksiyonunu bildirim kullanacak şekilde güncelliyoruz
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !proqiaUser) return;
    
    setIsSubmitting(true); // Yükleme animasyonunu başlat
    const newRoleId = newRoleName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    try {
      const roleDocRef = doc(db, 'roles', newRoleId);
      await setDoc(roleDocRef, {
        name: newRoleName,
        company_id: proqiaUser.company_id,
        permissions: newRolePermissions,
        created_at: Timestamp.now()
      });
      
      // State'i güncelle (veya daha iyisi veriyi yeniden çek)
      setExistingRoles(prev => [...prev, { id: newRoleId, name: newRoleName, permissions: newRolePermissions }]);
      setNewRoleName('');
      setNewRolePermissions({});

      // alert() yerine modern bildirim göster
      notifications.show({
        title: 'Başarılı!',
        message: `"${newRoleName}" rolü başarıyla oluşturuldu.`,
        color: 'teal',
        icon: <IconCheck />,
      });

    } catch (error) {
      console.error("Rol oluşturulamadı: ", error);
      // Hata durumunda da bildirim göster
      notifications.show({
        title: 'Hata!',
        message: 'Rol oluşturulurken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false); // Yükleme animasyonunu durdur
    }
  };

  // Yükleme ve yetki kontrolü aynı
  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (!permissions?.role_manage) {
    return <Alert icon={<IconAlertCircle />} title="Erişim Reddedildi!" color="red">Bu sayfayı görüntüleme yetkiniz yok.</Alert>;
  }

  return (
    <div>
      <Title order={2} mb="lg">Rol Yönetimi</Title>
      <Grid>
        <Grid.Col span={7}>
          <Paper withBorder shadow="sm" p="lg" radius="md">
            <Title order={3} mb="md">Yeni Rol Oluştur</Title>
            <form onSubmit={handleCreateRole}>
              <Stack gap="md">
                <TextInput required label="Yeni Rol Adı" placeholder="Örn: Kalite Müdürü" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                <Text fw={500} mt="md">İzinleri Seçin:</Text>
                <Accordion variant="separated">
                  {availablePermissions.map(doc => (
                    <Accordion.Item key={doc.id} value={doc.id}>
                      <Accordion.Control>{doc.id.replace('_', ' ').toUpperCase()}</Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="sm">
                          {Object.entries(doc.permissions).map(([key, description]) => (
                            <Checkbox key={key} label={`${description} (${key})`} checked={!!newRolePermissions[key]} onChange={() => handlePermissionChange(key)} />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
                
                {/* 4. GÜNCELLEME: Buton artık daha akıllı */}
                <Button type="submit" mt="md" loading={isSubmitting} disabled={!newRoleName.trim()}>
                  Yeni Rolü Kaydet
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid.Col>
        <Grid.Col span={5}>
          <Paper withBorder shadow="sm" p="lg" radius="md">
            <Title order={3} mb="md">Mevcut Roller</Title>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr><Table.Th>Rol Adı</Table.Th><Table.Th>İzin Sayısı</Table.Th><Table.Th>Aksiyon</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {existingRoles.map(role => (
                  <Table.Tr key={role.id}>
                    <Table.Td><Text fw={500}>{role.name}</Text></Table.Td>
                    <Table.Td>
                      {/* 5. GÜNCELLEME: Sayıyı şık bir rozet içinde gösteriyoruz */}
                      <Badge color="blue" variant="light">
                        {Object.values(role.permissions).filter(Boolean).length}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {/* 6. GÜNCELLEME: Pasif butona açıklama ekliyoruz */}
                      <Tooltip label="Bu özellik yakında eklenecektir.">
                        <Button variant="outline" size="xs" disabled>Düzenle</Button>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>
    </div>
  );
}

export default RoleManager;