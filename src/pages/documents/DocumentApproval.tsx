// src/pages/documents/DocumentApproval.tsx

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  Paper,
  Group,
  Stack,
  Title,
  Text,
  Loader,
  Center,
  Alert,
  Table,
  Button,
  SimpleGrid,
  Badge,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconFileDescription,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

type PendingDoc = {
  id: string;
  code: string;
  title: string;
  type: string;
  owner_department?: string | null;
  description?: string | null;
  revision_note?: string | null;
  status: string;
  created_at?: Timestamp | Date | null;
  file_url?: string | null;
  created_by_name?: string | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  // @ts-expect-error
  return typeof value.toDate === "function" ? value.toDate() : value;
};

function DocumentApproval() {
  const { proqiaUser, currentUser, permissions } = useAuth();

  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [selected, setSelected] = useState<PendingDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canApprove =
    permissions?.doc_approve_list ||
    permissions?.doc_approve ||
    permissions?.doc_approval;

  useEffect(() => {
    const load = async () => {
      if (!proqiaUser) {
        setLoading(false);
        return;
      }
      if (!canApprove) {
        setError("Doküman onaylama yetkiniz bulunmuyor.");
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "documents"),
          where("company_id", "==", proqiaUser.company_id),
          where("status", "==", "pending")
        );

        const snap = await getDocs(q);

        const list: PendingDoc[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData & {
            code?: string;
            title?: string;
            type?: string;
            owner_department?: string;
            description?: string;
            revision_note?: string;
            file_url?: string;
            created_at?: Timestamp;
            created_by_name?: string;
          };

          return {
            id: d.id,
            code: data.code ?? "",
            title: data.title ?? "",
            type: data.type ?? "",
            owner_department: data.owner_department ?? null,
            description: data.description ?? null,
            revision_note: data.revision_note ?? null,
            status: "pending",
            created_at: data.created_at ?? null,
            file_url: data.file_url ?? null,
            created_by_name: data.created_by_name ?? null,
          };
        });

        setDocs(list);
        setSelected(list[0] ?? null);
      } catch (err) {
        console.error(err);
        setError("Bekleyen dokümanlar alınamadı.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [proqiaUser, canApprove]);

  const handleApprove = async () => {
    if (!selected || !currentUser || !proqiaUser) return;

    setSaving(true);
    const now = Timestamp.now();

    try {
      await updateDoc(doc(db, "documents", selected.id), {
        status: "published",
        approver_id: currentUser.uid,
        approver_name:
          currentUser.displayName || currentUser.email || "",
        updated_at: now,
        published_at: now,
      });

      await addDoc(collection(db, "document_workflows"), {
        company_id: proqiaUser.company_id,
        doc_id: selected.id,
        step_no: 2,
        action: "approve",
        user_id: currentUser.uid,
        user_name:
          currentUser.displayName || currentUser.email || "Onaycı",
        created_at: now,
      });

      notifications.show({
        title: "Onaylandı",
        message: "Doküman yayınlandı.",
        color: "teal",
        icon: <IconCheck />,
      });

      setDocs((prev) => prev.filter((d) => d.id !== selected.id));
      setSelected(null);
    } catch (err) {
      notifications.show({
        title: "Hata",
        message: "Doküman onaylanamadı.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !currentUser || !proqiaUser) return;

    setSaving(true);
    const now = Timestamp.now();

    try {
      await updateDoc(doc(db, "documents", selected.id), {
        status: "draft",
        updated_at: now,
      });

      notifications.show({
        title: "Reddedildi",
        message: "Doküman taslağa alındı.",
        color: "orange",
        icon: <IconX />,
      });

      setDocs((prev) => prev.filter((d) => d.id !== selected.id));
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  if (!canApprove) {
    return (
      <Alert icon={<IconAlertCircle />} color="yellow">
        Doküman onay yetkiniz yok.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Center p={40}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle />} color="red">
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Group mb="md">
        <IconFileDescription size={22} />
        <Title order={2}>Doküman Onay</Title>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* SOL LİSTE */}
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            Bekleyen Dokümanlar
          </Title>

          {docs.length === 0 ? (
            <Text c="dimmed">Bekleyen doküman yok.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Tbody>
                {docs.map((d) => (
                  <Table.Tr
                    key={d.id}
                    onClick={() => setSelected(d)}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selected?.id === d.id
                          ? "rgba(0,0,0,0.04)"
                          : undefined,
                    }}
                  >
                    <Table.Td>{d.code}</Table.Td>
                    <Table.Td>{d.title}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* SAĞ DETAY */}
        <Paper withBorder p="md">
          {!selected ? (
            <Center>
              <Text c="dimmed">Doküman seçin</Text>
            </Center>
          ) : (
            <Stack>
              <Title order={3}>{selected.title}</Title>
              <Text size="sm" c="dimmed">
                {selected.type} • {selected.owner_department}
              </Text>

              {selected.revision_note && (
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Revizyon Notu
                  </Text>
                  <Text size="sm">{selected.revision_note}</Text>
                </Stack>
              )}

              <Alert
                icon={<IconAlertCircle />}
                color={selected.file_url ? "teal" : "yellow"}
              >
                {selected.file_url
                  ? "Dosya mevcut."
                  : "Dosya yok. Yayınlanamaz."}
              </Alert>

              <Group justify="flex-end">
                <Button
                  variant="outline"
                  color="red"
                  onClick={handleReject}
                  loading={saving}
                >
                  Reddet
                </Button>
                <Button
                  color="teal"
                  onClick={handleApprove}
                  disabled={!selected.file_url}
                  loading={saving}
                >
                  Onayla
                </Button>
              </Group>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>
    </Box>
  );
}

export default DocumentApproval;
