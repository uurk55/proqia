// src/pages/DocumentUpload.tsx (YENİ VE CİLALANMIŞ HALİ)

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebaseConfig'; 
import { collection, query, where, getDocs, doc, setDoc, Timestamp, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from 'react-router-dom'; 

// 1. GÜNCELLEME: Bildirim sistemini ve gerekli bileşenleri import ediyoruz
import {
  Title, Text, Paper, Button, Alert, Loader, TextInput, Stack, Select,
  Textarea, FileInput, Grid, Group, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconUpload, IconCheck } from '@tabler/icons-react';

// Tipler aynı
interface WorkflowDoc {
  id: string;
  name: string;
  steps: { role_id: string }[];
}

function DocumentUpload() {
  const { permissions, proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  const [availableWorkflows, setAvailableWorkflows] = useState<WorkflowDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); // Bu artık 'isSubmitting' gibi davranacak
  
  // Form state'leri aynı
  const [docCode, setDocCode] = useState('');
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Talimat'); 
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('İlk yayın (v1.0)');
  const [file, setFile] = useState<File | null>(null);

  // Veri çekme useEffect'i aynı
  useEffect(() => {
    if (!permissions?.doc_create) { setLoading(false); return; }
    const fetchWorkflows = async () => {
      // ... (içerik tamamen aynı) ...
      if (!proqiaUser) return;
      try {
        const workflowsQuery = query(collection(db, "workflows"), where("company_id", "==", proqiaUser.company_id), where("module", "==", "Dokümanlar"));
        const workflowsSnapshot = await getDocs(workflowsQuery);
        const workflowsList: WorkflowDoc[] = workflowsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, steps: doc.data().steps }));
        setAvailableWorkflows(workflowsList);
      } catch (error) { console.error("İş akışı verisi çekilemedi:", error); } 
      finally { setLoading(false); }
    };
    fetchWorkflows();
  }, [permissions, proqiaUser]);

  const handleFileChange = (payload: File | null) => { setFile(payload); };

  // 2. GÜNCELLEME: Form gönderim fonksiyonunu bildirim kullanacak şekilde güncelliyoruz
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCode || !docName || !selectedWorkflowId || !file || !proqiaUser || !currentUser) return; // Buton zaten disabled olacak ama bu bir ek kontrol
    
    setUploading(true);
    try {
      // 1. Storage'a Yükle (aynı)
      const storagePath = `companies/${proqiaUser.company_id}/documents/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // 2. Mimarimizi Kur (aynı)
      const newDocumentRef = doc(collection(db, "documents"));
      const newVersionRef = doc(collection(db, "document_versions"));
      const newDocumentId = newDocumentRef.id;
      const newVersionId = newVersionRef.id;

      // 3. İş Akışını Başlat (aynı)
      const selectedWorkflow = availableWorkflows.find(wf => wf.id === selectedWorkflowId);
      if (!selectedWorkflow || selectedWorkflow.steps.length === 0) throw new Error("Seçilen iş akışı geçersiz.");
      const firstStep = selectedWorkflow.steps[0];
      await addDoc(collection(db, "tasks"), { company_id: proqiaUser.company_id, assigned_to_role_id: firstStep.role_id, title: `Onay Bekleniyor: ${docCode} (v1.0)`, type: "Doküman Onayı", status: "Beklemede", related_document_id: newDocumentId, related_version_id: newVersionId, workflow_step_number: 1, created_at: Timestamp.now() });

      // 4. Veritabanı Kayıtlarını Tamamla (aynı)
      await setDoc(newVersionRef, { company_id: proqiaUser.company_id, document_id: newDocumentId, version_number: "1.0", revision_notes: revisionNotes, status: "Onayda", created_by: currentUser.uid, created_at: Timestamp.now(), file_url: downloadURL, storage_path: storagePath, approval_history: [] });
      await setDoc(newDocumentRef, { company_id: proqiaUser.company_id, doc_code: docCode, doc_name: docName, doc_type: docType, department_id: proqiaUser.department_id || null, workflow_id: selectedWorkflowId, status: "Onayda", current_version_id: newVersionId });

      // alert() yerine modern bildirim
      notifications.show({
        title: 'Başarıyla Gönderildi!',
        message: `"${docName}" dokümanı onaya gönderildi.`,
        color: 'teal',
        icon: <IconCheck />,
      });
      
      navigate('/documents');

    } catch (error) {
      console.error("Doküman oluşturma hatası: ", error);
      // Hata bildirimi
      notifications.show({
        title: 'Hata!',
        message: 'Doküman oluşturulurken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loader size="lg" style={{ display: 'block', margin: '150px auto' }} />;
  if (!permissions?.doc_create) {
    return <Alert icon={<IconAlertCircle />} title="Erişim Reddedildi!" color="red">Yeni doküman oluşturma yetkiniz yok.</Alert>;
  }

  // 3. YENİ: Butonun pasif olup olmayacağını belirleyen değişken
  const isFormInvalid = !docCode.trim() || !docName.trim() || !selectedWorkflowId || !file;

  return (
    <Box maw={800} mx="auto"> 
      <Title order={2} mb="xs">Yeni Doküman Yükle</Title>
      <Text c="dimmed" mb="lg">
        Yeni bir dokümanı (v1.0) onaya göndermek için aşağıdaki formu doldurun.
      </Text>
      
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateDocument}>
          <Stack gap="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput required label="Doküman Kodu" placeholder="Örn: TAL-001" value={docCode} onChange={(e) => setDocCode(e.target.value)} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput required label="Doküman Adı" placeholder="Örn: El Yıkama Talimatı" value={docName} onChange={(e) => setDocName(e.target.value)} />
              </Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select label="Doküman Tipi" value={docType} onChange={(value) => setDocType(value || 'Talimat')} data={['Talimat', 'Prosedür', 'Form', 'Diğer']} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select required label="Onay İş Akışı" placeholder="Lütfen bir onay akışı seçin..." value={selectedWorkflowId} onChange={(value) => setSelectedWorkflowId(value || '')} data={availableWorkflows.map(wf => ({ value: wf.id, label: `${wf.name} (${wf.steps.length} Adım)` }))} />
              </Grid.Col>
            </Grid>
            <FileInput required label="Dosya (v1.0)" placeholder="Yüklenecek dosyayı seçin..." value={file} onChange={handleFileChange} leftSection={<IconUpload size="1rem" />} />
            <Textarea label="Revizyon Notu" description="Bu ilk versiyonun amacını veya içeriğini kısaca açıklayın." value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} />
            
            <Group justify="flex-end" mt="md">
              {/* 4. GÜNCELLEME: Buton artık daha akıllı */}
              <Button type="submit" loading={uploading} disabled={isFormInvalid} size="md">
                Onaya Gönder
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default DocumentUpload;