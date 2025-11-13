// src/pages/DocumentApproval.tsx (YENİ VE MODERN ARAYÜZ)

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, addDoc, collection } from 'firebase/firestore'; // runTransaction eklendi
import type { DocumentData } from 'firebase/firestore';

// 1. GÜNCELLEME: Gerekli Mantine bileşenlerini ve bildirim sistemini import ediyoruz
import {
  Title, Text, Paper, Loader, Alert, Stack, Group, Button, Box, Textarea, Divider
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconArrowLeft } from '@tabler/icons-react';

// Tipler aynı kalıyor
interface Task extends DocumentData { id: string; title: string; related_version_id: string; related_document_id: string; workflow_step_number: number; }
interface DocVersion extends DocumentData { id: string; version_number: string; revision_notes: string; file_url: string; document_id: string; created_by: string; }
interface Doc extends DocumentData { id:string; doc_name: string; doc_code: string; workflow_id: string; }
interface Workflow extends DocumentData { steps: { role_id: string; step_name: string; }[] }

function DocumentApproval() {
  const { taskId } = useParams<{ taskId: string }>();
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [docVersion, setDocVersion] = useState<DocVersion | null>(null);
  const [mainDoc, setMainDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Veri çekme mantığı aynı
  useEffect(() => {
    // ... (içerik tamamen aynı) ...
    if (!taskId || !proqiaUser) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) throw new Error("Görev bulunamadı.");
        const taskData = { id: taskSnap.id, ...taskSnap.data() } as Task;
        setTask(taskData);
        
        const versionRef = doc(db, 'document_versions', taskData.related_version_id);
        const versionSnap = await getDoc(versionRef);
        if (!versionSnap.exists()) throw new Error("Doküman versiyonu bulunamadı.");
        setDocVersion({ id: versionSnap.id, ...versionSnap.data() } as DocVersion);
        
        const docRef = doc(db, 'documents', taskData.related_document_id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Ana doküman bulunamadı.");
        setMainDoc({ id: docSnap.id, ...docSnap.data() } as Doc);
        
      } catch (err: any) { setError(err.message); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [taskId, proqiaUser]);

  // 2. GÜNCELLEME: Onay ve Reddetme fonksiyonlarını bildirim kullanacak şekilde güncelliyoruz
  // (NOT: Bu fonksiyonlar hala veri bütünlüğü riski taşıyor. İleride Transaction'a çevirebiliriz.)
  const handleApprove = async () => {
    // ... (iç mantık aynı) ...
    if (!task || !mainDoc || !docVersion || !proqiaUser || !currentUser) return;
    setProcessing(true);
    try {
      const workflowRef = doc(db, 'workflows', mainDoc.workflow_id);
      const workflowSnap = await getDoc(workflowRef);
      if (!workflowSnap.exists()) throw new Error("İş akışı bulunamadı.");
      const workflow = workflowSnap.data() as Workflow;
      const historyEntry = { action: "Onaylandı", user_id: currentUser.uid, user_name: proqiaUser.full_name, role_name: proqiaUser.role_id, step: task.workflow_step_number, notes: "Onaylandı", timestamp: Timestamp.now() };
      await updateDoc(doc(db, 'tasks', task.id), { status: "Tamamlandı" });
      await updateDoc(doc(db, 'document_versions', docVersion.id), { approval_history: arrayUnion(historyEntry) });
      const currentStepIndex = task.workflow_step_number - 1;
      const nextStep = workflow.steps[currentStepIndex + 1];
      if (nextStep) {
        await addDoc(collection(db, "tasks"), { company_id: proqiaUser.company_id, assigned_to_role_id: nextStep.role_id, title: `Onay Bekleniyor: ${mainDoc.doc_code} (Adım ${currentStepIndex + 2})`, type: "Doküman Onayı", status: "Beklemede", related_document_id: mainDoc.id, related_version_id: docVersion.id, workflow_step_number: currentStepIndex + 2, created_at: Timestamp.now() });
        notifications.show({ title: 'Onaylandı!', message: 'Doküman bir sonraki onay adımına gönderildi.', color: 'blue' });
      } else {
        await updateDoc(doc(db, 'document_versions', docVersion.id), { status: "Yayınlandı" });
        await updateDoc(doc(db, 'documents', mainDoc.id), { status: "Yayınlandı" });
        notifications.show({ title: 'Onaylandı ve Yayınlandı!', message: 'Doküman başarıyla yayınlandı.', color: 'teal', icon: <IconCheck /> });
      }
      navigate('/');
    } catch (err: any) {
      setError("Onaylama hatası: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    // ... (iç mantık aynı) ...
    if (!task || !mainDoc || !docVersion || !proqiaUser || !currentUser || !rejectionNotes) return;
    setProcessing(true);
    try {
      const historyEntry = { action: "Reddedildi", user_id: currentUser.uid, user_name: proqiaUser.full_name, role_name: proqiaUser.role_id, step: task.workflow_step_number, notes: rejectionNotes, timestamp: Timestamp.now() };
      await updateDoc(doc(db, 'tasks', task.id), { status: "Tamamlandı" });
      await updateDoc(doc(db, 'document_versions', docVersion.id), { status: "Revizyonda", approval_history: arrayUnion(historyEntry) });
      await updateDoc(doc(db, 'documents', mainDoc.id), { status: "Revizyonda" });
      await addDoc(collection(db, "tasks"), { company_id: proqiaUser.company_id, assigned_to_user_id: docVersion.created_by, title: `Revizyon Gerekiyor: ${mainDoc.doc_code}`, type: "Revizyon Talebi", status: "Beklemede", related_document_id: mainDoc.id, related_version_id: docVersion.id, workflow_step_number: 0, created_at: Timestamp.now() });
      notifications.show({ title: 'Reddedildi!', message: 'Doküman revizyon için hazırlayana geri gönderildi.', color: 'orange' });
      navigate('/');
    } catch (err: any) {
      setError("Reddetme hatası: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Yükleme ve Hata durumları
  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle />} title="Hata!" color="red">{error}</Alert>;
  if (!task || !docVersion || !mainDoc) return <Text>Görev verileri yüklenemedi.</Text>;

  // --- 3. GÜNCELLEME: ARAYÜZÜN TAMAMEN YENİLENMİŞ HALİ ---
  return (
    <Stack gap="lg">
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={2}>Doküman Onay Görevi</Title>
            <Text c="dimmed">Lütfen aşağıdaki dokümanı inceleyip kararınızı belirtin.</Text>
          </Stack>
          <Button component={Link} to="/" variant="light" leftSection={<IconArrowLeft size={14} />}>
            Dashboard'a Dön
          </Button>
        </Group>
        <Divider my="md" />
        <Group>
          <Stack gap={0} >
             <Text c="dimmed" size="sm">{mainDoc.doc_code}</Text>
             <Title order={3}>{mainDoc.doc_name}</Title>
          </Stack>
          <Divider orientation="vertical" />
          <Stack gap={0}>
            <Text c="dimmed" size="sm">Mevcut Versiyon</Text>
            <Text fw={700}>{docVersion.version_number}</Text>
          </Stack>
        </Group>
         <Text c="dimmed" size="sm" mt="sm">Revizyon Notu: {docVersion.revision_notes}</Text>
      </Paper>
      
      <Paper withBorder shadow="sm" radius="md" p="xs">
        <Box component="iframe" src={docVersion.file_url} w="100%" h="calc(100vh - 450px)" style={{ border: 0 }} title="Doküman Görüntüleyici" />
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Title order={4}>Kararınız</Title>
        <Textarea
          mt="sm"
          placeholder="Eğer dokümanı reddedecekseniz, revizyon için gerekli açıklamaları buraya yazmanız zorunludur."
          value={rejectionNotes}
          onChange={(e) => setRejectionNotes(e.target.value)}
          minRows={3}
        />
        <Group justify="flex-end" mt="md">
          <Button color="red" variant="outline" loading={processing} disabled={!rejectionNotes.trim()} onClick={handleReject}>
            Reddet (Revizyon İste)
          </Button>
          <Button color="teal" loading={processing} onClick={handleApprove}>
            Onayla
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}

export default DocumentApproval;