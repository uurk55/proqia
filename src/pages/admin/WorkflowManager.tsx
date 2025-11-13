// src/pages/WorkflowManager.tsx (YENİ VE CİLALANMIŞ HALİ)

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

// 1. GÜNCELLEME: Gerekli Mantine bileşenlerini ve bildirim sistemini import ediyoruz
import {
  Title, Text, Paper, Table, Button, Group, Alert, Loader, TextInput,
  Stack, Select, Grid, ActionIcon, Badge, Tooltip
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconTrash } from '@tabler/icons-react';

// Tipler aynı kalıyor
interface RoleDoc { id: string; name: string; }
interface WorkflowStep { step_number: number; step_name: string; role_id: string; }
interface WorkflowDoc { id: string; name: string; module: string; steps: WorkflowStep[]; }

function WorkflowManager() {
  const { permissions, proqiaUser } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<RoleDoc[]>([]);
  const [existingWorkflows, setExistingWorkflows] = useState<WorkflowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowModule, setNewWorkflowModule] = useState('Dokümanlar');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  
  // 2. YENİ: Kaydetme butonu için ayrı bir yükleme state'i
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Veri çekme useEffect'i aynı
  useEffect(() => {
    // ... (içerik tamamen aynı)
    if (!permissions?.workflow_manage) { setLoading(false); return; }
    const fetchData = async () => {
      if (!proqiaUser) return;
      try {
        const rolesQuery = query(collection(db, "roles"), where("company_id", "==", proqiaUser.company_id));
        const rolesSnapshot = await getDocs(rolesQuery);
        const rolesList: RoleDoc[] = rolesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setAvailableRoles(rolesList);

        const workflowsQuery = query(collection(db, "workflows"), where("company_id", "==", proqiaUser.company_id));
        const workflowsSnapshot = await getDocs(workflowsQuery);
        const workflowsList: WorkflowDoc[] = workflowsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, module: doc.data().module, steps: doc.data().steps }));
        setExistingWorkflows(workflowsList);
      } catch (error) { console.error("İş akışı/Rol verisi çekilemedi:", error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [permissions, proqiaUser]);

  // Form yönetim fonksiyonları aynı
  const handleAddStep = () => { setSteps([...steps, { step_number: steps.length + 1, step_name: '', role_id: '' }]); };
  const handleStepChange = (index: number, field: 'step_name' | 'role_id', value: string) => { const newSteps = [...steps]; newSteps[index][field] = value; setSteps(newSteps); };
  const handleRemoveStep = (index: number) => { const newSteps = steps.filter((_, i) => i !== index); setSteps(newSteps.map((step, i) => ({ ...step, step_number: i + 1 }))); };

  // 3. GÜNCELLEME: handleCreateWorkflow fonksiyonunu bildirim kullanacak şekilde güncelliyoruz
  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim() || steps.length === 0 || !proqiaUser) return;
    
    setIsSubmitting(true); // Yükleme animasyonunu başlat
    const newWorkflowId = `wf_${newWorkflowName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    try {
      const newWorkflowData = { name: newWorkflowName, module: newWorkflowModule, company_id: proqiaUser.company_id, steps: steps, created_at: Timestamp.now() };
      const workflowDocRef = doc(db, 'workflows', newWorkflowId);
      await setDoc(workflowDocRef, newWorkflowData);
      
      setExistingWorkflows(prev => [...prev, { id: newWorkflowId, ...newWorkflowData }]);
      setNewWorkflowName('');
      setNewWorkflowModule('Dokümanlar');
      setSteps([]);

      notifications.show({
        title: 'Başarılı!',
        message: `"${newWorkflowName}" iş akışı başarıyla oluşturuldu.`,
        color: 'teal',
        icon: <IconCheck />,
      });

    } catch (error) {
      console.error("İş akışı oluşturulamadı: ", error);
      notifications.show({
        title: 'Hata!',
        message: 'İş akışı oluşturulurken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false); // Yükleme animasyonunu durdur
    }
  };

  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (!permissions?.workflow_manage) {
    return <Alert icon={<IconAlertCircle />} title="Erişim Reddedildi!" color="red">Bu sayfayı görüntüleme yetkiniz yok.</Alert>;
  }

  return (
    <div>
      <Title order={2} mb="lg">İş Akışı Tasarımcısı</Title>
      <Grid>
        <Grid.Col span={7}>
          <Paper withBorder shadow="sm" p="lg" radius="md">
            <Title order={3} mb="md">Yeni İş Akışı Oluştur</Title>
            <form onSubmit={handleCreateWorkflow}>
              <Stack gap="md">
                <TextInput required label="İş Akışı Adı" placeholder="Örn: Standart Talimat Onayı" value={newWorkflowName} onChange={(e) => setNewWorkflowName(e.target.value)} />
                <Select label="Modül" value={newWorkflowModule} onChange={(value) => setNewWorkflowModule(value || 'Dokümanlar')} data={[{ value: 'Dokümanlar', label: 'Dokümanlar' }, { value: 'DÖF', label: 'DÖF (Yakında)', disabled: true }]} />
                <Text fw={500} mt="md">Onay Adımları:</Text>
                <Stack gap="xs">
                  {steps.map((step, index) => (
                    <Paper key={index} withBorder p="md" radius="sm">
                      <Group justify="space-between" mb="sm">
                        <Text fw={500}>Adım {step.step_number}</Text>
                        <ActionIcon color="red" variant="light" onClick={() => handleRemoveStep(index)} title="Bu adımı sil"><IconTrash size="1rem" /></ActionIcon>
                      </Group>
                      <Stack gap="sm">
                        <TextInput label="Adım Adı (Opsiyonel)" placeholder="Örn: Kalite Kontrol Onayı" value={step.step_name} onChange={(e) => handleStepChange(index, 'step_name', e.target.value)} />
                        <Select required label="Onaylayacak Rol" placeholder="Lütfen bir rol seçin..." value={step.role_id} onChange={(value) => handleStepChange(index, 'role_id', value || '')} data={availableRoles.map(role => ({ value: role.id, label: role.name }))} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
                <Button type="button" onClick={handleAddStep} variant="outline" mt="sm">+ Yeni Onay Adımı Ekle</Button>
                
                {/* 4. GÜNCELLEME: Buton artık daha akıllı */}
                <Button type="submit" mt="md" loading={isSubmitting} disabled={!newWorkflowName.trim() || steps.length === 0}>
                  Yeni İş Akışını Kaydet
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid.Col>
        <Grid.Col span={5}>
          <Paper withBorder shadow="sm" p="lg" radius="md">
            <Title order={3} mb="md">Mevcut İş Akışları</Title>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr><Table.Th>Akış Adı</Table.Th><Table.Th>Modül</Table.Th><Table.Th>Adım Sayısı</Table.Th><Table.Th>Aksiyon</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {existingWorkflows.map(wf => (
                  <Table.Tr key={wf.id}>
                    <Table.Td><Text fw={500}>{wf.name}</Text></Table.Td>
                    <Table.Td>
                      {/* 5. GÜNCELLEME: Modülü şık bir rozet içinde gösteriyoruz */}
                      <Badge color="grape" variant="light">{wf.module}</Badge>
                    </Table.Td>
                    <Table.Td>{wf.steps.length} Adım</Table.Td>
                    <Table.Td>
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

export default WorkflowManager;