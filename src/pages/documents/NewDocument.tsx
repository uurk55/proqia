// src/pages/documents/NewDocument.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Group,
  Stack,
  Title,
  Text,
  TextInput,
  Select,
  Textarea,
  Button,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle, IconUpload } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { db, storage } from "../../firebaseConfig";

import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// ---- Tipler ----
type DocType = "instruction" | "procedure" | "form" | "record" | "other";

type WorkflowOption = { value: string; label: string };

export default function NewDocument() {
  const navigate = useNavigate();
  const { proqiaUser, currentUser, permissions } = useAuth();

  const canCreate = permissions?.doc_create;

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocType | "">("");
  const [ownerDepartment, setOwnerDepartment] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [revisionNote, setRevisionNote] = useState("İlk yayın (v1.0)");

  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Örnek tip seçenekleri
  const typeOptions = useMemo(
    () => [
      { value: "instruction", label: "Talimat" },
      { value: "procedure", label: "Prosedür" },
      { value: "form", label: "Form" },
      { value: "record", label: "Kayıt" },
      { value: "other", label: "Diğer" },
    ],
    []
  );

  // Şimdilik sabit departman listesi (istersen sonra DB’den çekersin)
  const departmentOptions = useMemo(
    () => [
      { value: "Kalite", label: "Kalite" },
      { value: "Üretim", label: "Üretim" },
      { value: "Boyahane", label: "Boyahane" },
      { value: "Eloksal", label: "Eloksal" },
      { value: "Pres", label: "Pres" },
      { value: "Paketleme", label: "Paketleme" },
      { value: "Sevkiyat", label: "Sevkiyat" },
      { value: "Satın Alma", label: "Satın Alma" },
      { value: "İK", label: "İnsan Kaynakları" },
      { value: "Diğer", label: "Diğer" },
    ],
    []
  );

  // İş akışlarını şimdilik boş bırakıyorum (senin Workflows koleksiyonuna göre bağlanır)
  const workflowOptions: WorkflowOption[] = useMemo(
    () => [
      { value: "default", label: "Varsayılan Doküman Onayı" },
      // ileride firestore’dan çekilecek
    ],
    []
  );

  useEffect(() => {
    if (!proqiaUser || !currentUser) return;
    if (!canCreate) {
      notifications.show({
        title: "Yetki yok",
        message: "Doküman oluşturma yetkiniz bulunmuyor.",
        color: "yellow",
        icon: <IconAlertCircle size={18} />,
      });
      navigate("/");
    }
  }, [proqiaUser, currentUser, canCreate, navigate]);

  const isValid = useMemo(() => {
    return (
      code.trim().length >= 2 &&
      title.trim().length >= 2 &&
      Boolean(type) &&
      Boolean(workflowId) &&
      Boolean(file) &&
      Boolean(proqiaUser?.company_id) &&
      Boolean(currentUser?.uid)
    );
  }, [code, title, type, workflowId, file, proqiaUser, currentUser]);

  const handleSubmit = async () => {
    if (!proqiaUser || !currentUser) return;

    if (!code.trim() || !title.trim() || !type || !workflowId) {
      notifications.show({
        title: "Eksik alan",
        message: "Kod, ad, tip ve onay iş akışı zorunlu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    if (!file) {
      notifications.show({
        title: "Dosya gerekli",
        message: "Onaya göndermek için dosya seçmelisiniz.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    setSaving(true);

    try {
      // 1) Önce Firestore dokümanını oluşturmak yerine,
      //    Storage’a yükle -> URL al -> sonra Firestore’a kaydet.
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `companies/${proqiaUser.company_id}/documents/${code.trim()}_v1/${safeName}`;

      const fileRef = storageRef(storage, path);

      // Upload
      await uploadBytes(fileRef, file, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=3600",
      });

      // URL
      const downloadUrl = await getDownloadURL(fileRef);

      // 2) Firestore’a kaydet
      const docPayload = {
        company_id: proqiaUser.company_id,
        code: code.trim(),
        title: title.trim(),
        type,
        owner_department: ownerDepartment ?? null,
        description: description.trim() || null,
        revision_note: revisionNote.trim() || "İlk yayın (v1.0)",

        status: "pending", // onay bekliyor
        version: "1.0",

        file_url: downloadUrl,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || null,

        workflow_id: workflowId,

        created_by: currentUser.uid,
        created_by_name: currentUser.displayName || currentUser.email || "Kullanıcı",

        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "documents"), docPayload);

      // 3) İstersen workflow log (senin yapına göre)
      await addDoc(collection(db, "document_workflows"), {
        company_id: proqiaUser.company_id,
        doc_id: docRef.id,
        step_no: 1,
        user_id: currentUser.uid,
        user_name: currentUser.displayName || currentUser.email || "Hazırlayan",
        action: "submit",
        comment: revisionNote.trim() || "İlk yayın (v1.0)",
        created_at: Timestamp.now(),
      });

      notifications.show({
        title: "Onaya gönderildi",
        message: "Dosya yüklendi ve doküman onaya gönderildi.",
        color: "teal",
        icon: <IconCheck size={18} />,
      });

      navigate("/documents/approval");
    } catch (err: any) {
      console.error("Yeni doküman oluşturma hatası:", err);

      notifications.show({
        title: "Hata",
        message:
          err?.message ||
          "Doküman kaydedilirken/yüklenirken bir hata oluştu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Title order={2}>Yeni Doküman Yükle</Title>
          <Text c="dimmed" fz="sm">
            Dokümanı (v1.0) onaya göndermek için formu doldurun.
          </Text>
        </Stack>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label="Doküman Kodu"
              placeholder="Örn: TAL-001"
              required
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
            />
            <TextInput
              label="Doküman Adı"
              placeholder="Örn: El Yıkama Talimatı"
              required
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
            />
          </Group>

          <Group grow align="flex-start">
            <Select
              label="Doküman Tipi"
              placeholder="Seçin"
              required
              data={typeOptions}
              value={type}
              onChange={(v) => setType((v as DocType) || "")}
            />
            <Select
              label="Onay İş Akışı"
              placeholder="Lütfen bir onay akışı seçin..."
              required
              data={workflowOptions}
              value={workflowId}
              onChange={setWorkflowId}
            />
          </Group>

          <Group grow align="flex-start">
            <Select
              label="Departman"
              placeholder="(Opsiyonel)"
              data={departmentOptions}
              value={ownerDepartment}
              onChange={setOwnerDepartment}
              clearable
            />
            <Box>
              <Text fz="sm" fw={500} mb={6}>
                Dosya (v1.0) <Text span c="red">*</Text>
              </Text>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              <Text fz="xs" c="dimmed" mt={6}>
                {file ? `Seçilen: ${file.name}` : "Dosya seçilmedi."}
              </Text>
            </Box>
          </Group>

          <Textarea
            label="Açıklama"
            placeholder="Dokümanın amacı / kapsamı (opsiyonel)"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />

          <Textarea
            label="Revizyon Notu"
            placeholder="Bu ilk versiyonun amacını veya içeriğini kısaca açıklayın."
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.currentTarget.value)}
            autosize
            minRows={2}
          />

          <Divider />

          <Group justify="flex-end">
            <Button
              leftSection={<IconUpload size={16} />}
              loading={saving}
              disabled={!isValid}
              onClick={handleSubmit}
            >
              Onaya Gönder
            </Button>
          </Group>

          {!file && (
            <Text fz="xs" c="dimmed">
              Not: Dosya seçmeden “Onaya Gönder” aktif olmaz.
            </Text>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
