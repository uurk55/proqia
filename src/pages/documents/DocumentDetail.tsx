// src/pages/documents/DocumentDetail.tsx

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseConfig";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
  Timestamp,
} from "firebase/firestore";

import {
  Title,
  Text,
  Paper,
  Loader,
  Alert,
  Stack,
  Group,
  Button,
  Box,
  Badge,
} from "@mantine/core";
import { IconAlertCircle, IconArrowLeft } from "@tabler/icons-react";

type EnStatus = "draft" | "pending" | "published" | "canceled" | string;

type DocumentRecord = {
  id: string;
  company_id: string;

  code: string;
  title: string;
  type: string;

  owner_department?: string | null;
  description?: string | null;

  version?: string | null; // "1.0"
  revision_no?: number | string | null;
  revision_note?: string | null;

  status: EnStatus;

  file_url?: string | null;
  file_name?: string | null;

  created_by?: string;
  created_by_name?: string;

  created_at?: Timestamp | Date | null;
  updated_at?: Timestamp | Date | null;
  published_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return typeof (value as any)?.toDate === "function"
    ? (value as any).toDate()
    : (value as Date);
};

const statusLabelTR = (status: EnStatus): string => {
  const s = (status || "").toLowerCase();
  if (s === "published") return "Yayınlandı";
  if (s === "pending") return "Onay Bekliyor";
  if (s === "draft") return "Taslak";
  if (s === "canceled") return "İptal";
  return status || "-";
};

const statusColor = (status: EnStatus) => {
  const s = (status || "").toLowerCase();
  if (s === "published") return "teal";
  if (s === "pending") return "blue";
  if (s === "draft") return "gray";
  if (s === "canceled") return "red";
  return "gray";
};

function DocumentDetail() {
  const { docId } = useParams<{ docId: string }>();
  const { proqiaUser, currentUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [docData, setDocData] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!docId) {
      setError("Doküman ID bulunamadı.");
      setLoading(false);
      return;
    }
    if (!proqiaUser) {
      setLoading(false);
      return;
    }
    if (!permissions?.doc_view_list) {
      setError("Bu dokümanı görüntüleme yetkiniz yok.");
      setLoading(false);
      return;
    }

    const fetchDocumentDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const ref = doc(db, "documents", docId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          throw new Error("Doküman bulunamadı.");
        }

        const data = snap.data() as any;

        if (data.company_id !== proqiaUser.company_id) {
          throw new Error("Bu dokümana erişim yetkiniz yok.");
        }

        const loaded: DocumentRecord = {
          id: snap.id,
          company_id: data.company_id,

          code: data.code ?? "",
          title: data.title ?? "",
          type: data.type ?? "",

          owner_department: data.owner_department ?? null,
          description: data.description ?? null,

          version: data.version ?? null,
          revision_no: data.revision_no ?? null,
          revision_note: data.revision_note ?? null,

          status: data.status ?? "draft",

          file_url: data.file_url ?? null,
          file_name: data.file_name ?? null,

          created_by: data.created_by ?? "",
          created_by_name: data.created_by_name ?? "",

          created_at: data.created_at ?? null,
          updated_at: data.updated_at ?? null,
          published_at: data.published_at ?? null,
        };

        setDocData(loaded);
      } catch (err: any) {
        console.error("Doküman detayları yüklenemedi:", err);
        setError(err?.message || "Doküman detayları yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentDetails();
  }, [docId, proqiaUser, permissions]);

  const submitForApproval = async () => {
    if (!docId || !proqiaUser || !docData) return;

    // Dosya yoksa onaya gönderme (mantıklı kontrol)
    if (!docData.file_url) {
      setError("Dosya yokken onaya gönderemezsiniz. Önce dosya yükleyin.");
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      // 1) documents status -> pending
      await updateDoc(doc(db, "documents", docId), {
        status: "pending",
        updated_at: serverTimestamp(),
      });

      // Kullanıcı kimliği: önce Auth'dan currentUser, yoksa proqiaUser'dan
      const actorId =
        (currentUser as any)?.uid ||
        (currentUser as any)?.id ||
        (proqiaUser as any)?.uid ||
        (proqiaUser as any)?.id ||
        "";

      const actorName =
        (currentUser as any)?.displayName ||
        (currentUser as any)?.email ||
        (proqiaUser as any)?.full_name ||
        (proqiaUser as any)?.email ||
        "Kullanıcı";

      // 2) workflow log
      await addDoc(collection(db, "document_workflows"), {
        company_id: proqiaUser.company_id,
        doc_id: docId,
        step_no: 1,
        user_id: actorId,
        user_name: actorName,
        action: "submit",
        comment: "Onaya gönderildi.",
        created_at: serverTimestamp(),
      });

      // UI güncelle
      setDocData((prev) => (prev ? { ...prev, status: "pending" } : prev));

      // İstersen onay ekranına at
      navigate("/documents/approval");
    } catch (e: any) {
      console.error("Onaya gönderme hatası:", e);
      setError(e?.message || "Onaya gönderme başarısız.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Loader size="lg" style={{ display: "block", margin: "150px auto" }} />
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Alert icon={<IconAlertCircle />} title="Hata!" color="red">
          {error}
        </Alert>
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => navigate("/documents")}
        >
          Kütüphaneye Dön
        </Button>
      </Stack>
    );
  }

  if (!docData) {
    return (
      <Stack gap="md">
        <Alert icon={<IconAlertCircle />} title="Hata!" color="red">
          Doküman verileri yüklenemedi.
        </Alert>
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => navigate("/documents")}
        >
          Kütüphaneye Dön
        </Button>
      </Stack>
    );
  }

  const createdAt = toJsDate(docData.created_at);
  const updatedAt = toJsDate(docData.updated_at);
  const publishedAt = toJsDate(docData.published_at);

  const statusTR = statusLabelTR(docData.status);

  const revisionText =
    docData.version ??
    (docData.revision_no !== null && docData.revision_no !== undefined
      ? String(docData.revision_no)
      : null);

  const isDraft = (docData.status || "").toLowerCase() === "draft";

  return (
    <Stack gap="lg">
      {/* BAŞLIK BLOĞU */}
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text c="dimmed" fz="sm">
              {docData.code}
            </Text>
            <Title order={2}>{docData.title}</Title>

            <Group gap="xs" mt="xs">
              <Badge variant="light">{docData.type || "-"}</Badge>
              {docData.owner_department && (
                <Badge variant="light" color="gray">
                  {docData.owner_department}
                </Badge>
              )}
            </Group>

            {docData.description && (
              <Text mt="sm" fz="sm">
                {docData.description}
              </Text>
            )}

            {docData.revision_note && (
              <Text fz="xs" c="dimmed">
                Revizyon notu: {docData.revision_note}
              </Text>
            )}
          </Stack>

          <Stack gap={8} align="flex-end">
            <Text fz="xs" c="dimmed">
              Durum
            </Text>
            <Badge
              size="lg"
              radius="md"
              color={statusColor(docData.status)}
              variant="light"
            >
              {statusTR}
            </Badge>

            {revisionText && (
              <Text fz="xs" c="dimmed">
                Versiyon/Revizyon: {revisionText}
              </Text>
            )}

            {publishedAt && (
              <Text fz="xs" c="dimmed">
                Yayın tarihi: {publishedAt.toLocaleDateString("tr-TR")}
              </Text>
            )}

            {/* SADECE TASLAKTA GÖSTER */}
            {isDraft && (
              <Button
                loading={actionLoading}
                onClick={submitForApproval}
                variant="filled"
              >
                Onaya Gönder
              </Button>
            )}

            <Button
              component={Link}
              to="/documents"
              variant="light"
              leftSection={<IconArrowLeft size={14} />}
            >
              Kütüphaneye Dön
            </Button>
          </Stack>
        </Group>
      </Paper>

      {/* DETAY BLOĞU */}
      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Oluşturan
              </Text>
              <Text fz="sm">
                {docData.created_by_name || docData.created_by || "-"}
              </Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Oluşturulma
              </Text>
              <Text fz="sm">
                {createdAt ? createdAt.toLocaleDateString("tr-TR") : "-"}
              </Text>
            </Stack>

            <Stack gap={2}>
              <Text fz="xs" c="dimmed">
                Son Güncelleme
              </Text>
              <Text fz="sm">
                {updatedAt ? updatedAt.toLocaleDateString("tr-TR") : "-"}
              </Text>
            </Stack>
          </Group>

          {/* Dosya önizleme alanı */}
          {docData.file_url ? (
            <Box
              component="iframe"
              src={docData.file_url}
              w="100%"
              h="calc(100vh - 320px)"
              style={{ border: 0 }}
              title="Doküman Önizleme"
            />
          ) : (
            <Alert
              icon={<IconAlertCircle />}
              title="Dosya bulunamadı"
              color="yellow"
            >
              Bu dokümana ait dosya yok.
            </Alert>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

export default DocumentDetail;
