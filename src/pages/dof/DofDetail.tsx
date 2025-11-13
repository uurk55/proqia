import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";

import {
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Badge,
  Loader,
  Alert,
  Table,
  Button,
  Select,
  Modal,
  Divider,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  IconAlertCircle,
  IconCalendar,
  IconEdit,
  IconCheck,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import "dayjs/locale/tr";

// ---------- Tipler ve yardımcı fonksiyonlar ----------

interface DofItem extends DocumentData {
  id: string;
  dof_code?: string;
  subject?: string;
  description?: string;
  status?: string;
  created_at?: Date | { toDate: () => Date };
  created_by_name?: string;
  company_id?: string;
}

interface DofAction extends DocumentData {
  id: string;
  title: string;
  responsible?: string;
  responsible_id?: string;
  responsible_name?: string;
  status: string;
  due_date?: Date | { toDate: () => Date };
  created_at?: Date | { toDate: () => Date };
}

interface DofLog extends DocumentData {
  id: string;
  message: string;
  created_at?: Date | { toDate: () => Date };
  user_name?: string;
}

const toJsDate = (
  value?: Date | { toDate: () => Date }
): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value : value.toDate();
};

const getDofStatusColor = (status?: string) => {
  switch (status) {
    case "Açık":
      return "blue";
    case "Değerlendirmede":
      return "orange";
    case "Kapalı":
      return "teal";
    default:
      return "gray";
  }
};

const getActionStatusColor = (status: string) => {
  switch (status) {
    case "Planlandı":
      return "gray";
    case "Devam ediyor":
      return "blue";
    case "Tamamlandı":
      return "teal";
    default:
      return "gray";
  }
};

const isOverdue = (action: DofAction) => {
  const d = toJsDate(action.due_date);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today && action.status !== "Tamamlandı";
};

// ---------- Sayfa bileşeni ----------

function DofDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, proqiaUser } = useAuth();

  const [dof, setDof] = useState<DofItem | null>(null);
  const [actions, setActions] = useState<DofAction[]>([]);
  const [logs, setLogs] = useState<DofLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // sadece SAYFA yüklenme hataları için

  // Yeni aksiyon formu
  const [actionTitle, setActionTitle] = useState("");
  const [actionResponsibleId, setActionResponsibleId] = useState<string | null>(
    null
  );
  const [actionResponsibleName, setActionResponsibleName] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>("Planlandı");
  const [actionDueDate, setActionDueDate] = useState<Date | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  // Kullanıcı seçenekleri (sorumlu dropdown)
  const [responsibleOptions, setResponsibleOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Düzenleme modali
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<DofAction | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editResponsibleId, setEditResponsibleId] = useState<string | null>(
    null
  );
  const [editResponsibleName, setEditResponsibleName] = useState("");
  const [editStatus, setEditStatus] = useState<string | null>("Planlandı");
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // DÖF durum güncelleme
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // --------- Log ekleme helper'ı ---------
  const addLog = async (message: string) => {
    if (!id) return;
    try {
      const logsRef = collection(db, "corrective_actions", id, "logs");
      const logDoc = {
        message,
        created_at: new Date(),
        user_id: currentUser?.uid || null,
        user_name:
          currentUser?.displayName || proqiaUser?.full_name || "Kullanıcı",
      };
      const ref = await addDoc(logsRef, logDoc);
      setLogs((prev) => [{ id: ref.id, ...logDoc } as DofLog, ...prev]);
    } catch (err) {
      console.error("Log kaydedilemedi:", err);
    }
  };

  // --------- İlk yükleme: DÖF + actions + logs + users ---------
  useEffect(() => {
    if (!id) {
      setError("DÖF ID bulunamadı.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        // 1) DÖF kaydı
        const dofRef = doc(db, "corrective_actions", id);
        const dofSnap = await getDoc(dofRef);

        if (!dofSnap.exists()) {
          setError("Bu ID ile bir DÖF kaydı bulunamadı.");
          setLoading(false);
          return;
        }

        const dofData = {
          id: dofSnap.id,
          ...(dofSnap.data() as DocumentData),
        } as DofItem;

        setDof(dofData);

        // 2) Aksiyonlar
        const actionsRef = collection(db, "corrective_actions", id, "actions");
        const actionsQuery = query(actionsRef, orderBy("due_date", "asc"));
        const actionsSnap = await getDocs(actionsQuery);
        const actionList: DofAction[] = actionsSnap.docs.map((a) => ({
          id: a.id,
          ...(a.data() as DocumentData),
        })) as DofAction[];
        setActions(actionList);

        // 3) Loglar
        const logsRef = collection(db, "corrective_actions", id, "logs");
        const logsQuery = query(logsRef, orderBy("created_at", "desc"));
        const logsSnap = await getDocs(logsQuery);
        const logList: DofLog[] = logsSnap.docs.map((l) => ({
          id: l.id,
          ...(l.data() as DocumentData),
        })) as DofLog[];
        setLogs(logList);

        // 4) Sorumlu dropdown'u için kullanıcılar
        if (proqiaUser) {
          const usersRef = collection(db, "users");
          const usersQuery = query(
            usersRef,
            where("company_id", "==", proqiaUser.company_id)
          );
          const usersSnap = await getDocs(usersQuery);
          const usersOptions = usersSnap.docs.map((u) => {
            const data = u.data() as DocumentData;
            const label =
              (data.full_name as string | undefined) ||
              (data.email as string | undefined) ||
              "Kullanıcı";
            return { value: u.id, label };
          });
          setResponsibleOptions(usersOptions);
        }
      } catch (err) {
        console.error("DÖF detayları yüklenemedi:", err);
        setError("DÖF detayları yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, proqiaUser]);

  // --------- Yeni aksiyon ekle ---------
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (
      !actionTitle.trim() ||
      !actionDueDate ||
      !actionResponsibleId ||
      !actionResponsibleName
    ) {
      notifications.show({
        title: "Eksik bilgi",
        message: "Aksiyon eklemek için tüm zorunlu alanları doldurun.",
        color: "red",
      });
      return;
    }

    setSavingAction(true);

    try {
      const actionsRef = collection(db, "corrective_actions", id, "actions");

      const newAction = {
        title: actionTitle.trim(),
        responsible: actionResponsibleName,
        responsible_id: actionResponsibleId,
        responsible_name: actionResponsibleName,
        status: actionStatus || "Planlandı",
        due_date: actionDueDate,
        created_at: new Date(),
        created_by: currentUser?.uid || null,
      };

      const docRef = await addDoc(actionsRef, newAction);

      setActions((prev) => [...prev, { id: docRef.id, ...newAction } as DofAction]);

      await addLog(
        `Yeni aksiyon eklendi: "${actionTitle.trim()}" (${actionResponsibleName})`
      );

      notifications.show({
        title: "Aksiyon eklendi",
        message: "Yeni aksiyon başarıyla kaydedildi.",
        color: "teal",
      });

      // Form temizle
      setActionTitle("");
      setActionDueDate(null);
      setActionStatus("Planlandı");
      setActionResponsibleId(null);
      setActionResponsibleName("");
    } catch (err) {
      console.error("Aksiyon eklenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Aksiyon eklenemedi. Lütfen tekrar deneyin.",
        color: "red",
      });
    } finally {
      setSavingAction(false);
    }
  };

  // --------- Aksiyon düzenleme ---------
  const openEditModal = (action: DofAction) => {
    setEditingAction(action);
    setEditTitle(action.title);
    setEditResponsibleId(action.responsible_id || null);
    setEditResponsibleName(
      action.responsible_name || action.responsible || "Sorumlu"
    );
    setEditStatus(action.status || "Planlandı");
    setEditDueDate(toJsDate(action.due_date) || null);
    setEditModalOpen(true);
  };

  const handleUpdateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingAction) return;

    if (
      !editTitle.trim() ||
      !editDueDate ||
      !editResponsibleName ||
      !editResponsibleId
    ) {
      notifications.show({
        title: "Eksik bilgi",
        message: "Aksiyon düzenlemek için tüm zorunlu alanları doldurun.",
        color: "red",
      });
      return;
    }

    setSavingEdit(true);

    try {
      const actionRef = doc(
        db,
        "corrective_actions",
        id,
        "actions",
        editingAction.id
      );

      const updated = {
        title: editTitle.trim(),
        responsible: editResponsibleName,
        responsible_id: editResponsibleId,
        responsible_name: editResponsibleName,
        status: editStatus || "Planlandı",
        due_date: editDueDate,
      };

      await updateDoc(actionRef, updated);

      setActions((prev) =>
        prev.map((a) =>
          a.id === editingAction.id ? ({ ...a, ...updated } as DofAction) : a
        )
      );

      await addLog(
        `Aksiyon güncellendi: "${editTitle.trim()}" (${editResponsibleName})`
      );

      notifications.show({
        title: "Güncellendi",
        message: "Aksiyon başarıyla güncellendi.",
        color: "teal",
      });

      setEditModalOpen(false);
      setEditingAction(null);
    } catch (err) {
      console.error("Aksiyon güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Aksiyon güncellenemedi. Lütfen tekrar deneyin.",
        color: "red",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // --------- Hızlı "Tamamlandı" ---------
  const handleCompleteAction = async (action: DofAction) => {
    if (!id) return;
    try {
      const actionRef = doc(
        db,
        "corrective_actions",
        id,
        "actions",
        action.id
      );
      await updateDoc(actionRef, { status: "Tamamlandı" });

      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id ? ({ ...a, status: "Tamamlandı" } as DofAction) : a
        )
      );

      await addLog(`Aksiyon tamamlandı: "${action.title}"`);

      notifications.show({
        title: "Tamamlandı",
        message: "Aksiyon tamamlandı olarak işaretlendi.",
        color: "teal",
      });
    } catch (err) {
      console.error("Aksiyon tamamlanamadı:", err);
      notifications.show({
        title: "Hata",
        message: "Aksiyon tamamlanamadı. Lütfen tekrar deneyin.",
        color: "red",
      });
    }
  };

  // --------- DÖF durum güncelleme ---------
  const handleUpdateDofStatus = async (newStatus: string) => {
    if (!id || !dof) return;

    if (newStatus === "Kapalı") {
      const hasOpen = actions.some((a) => a.status !== "Tamamlandı");
      if (hasOpen) {
        // Artık sayfayı kilitlemiyoruz, sadece uyarı gösteriyoruz
        notifications.show({
          title: "DÖF kapatılamaz",
          message: "Tüm aksiyonlar tamamlanmadan DÖF kapatılamaz.",
          color: "red",
        });
        return;
      }
    }

    setUpdatingStatus(true);

    try {
      const dofRef = doc(db, "corrective_actions", id);
      await updateDoc(dofRef, { status: newStatus });

      setDof((prev) =>
        prev ? ({ ...prev, status: newStatus } as DofItem) : prev
      );

      await addLog(`DÖF durumu "${newStatus}" olarak güncellendi.`);

      notifications.show({
        title: "Durum güncellendi",
        message: `DÖF durumu "${newStatus}" olarak güncellendi.`,
        color: "teal",
      });
    } catch (err) {
      console.error("DÖF durumu güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "DÖF durumu güncellenemedi. Lütfen tekrar deneyin.",
        color: "red",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <Loader size="lg" style={{ display: "block", margin: "150px auto" }} />
    );
  }

  // Bu error sadece SAYFAYI hiç yükleyemezsek kullanılıyor
  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={18} />}
        title="Hata!"
        color="red"
        mt="md"
      >
        {error}
      </Alert>
    );
  }

  if (!dof) {
    return (
      <Alert
        icon={<IconAlertCircle size={18} />}
        title="Kayıt bulunamadı"
        color="yellow"
        mt="md"
      >
        Görüntülemek istediğiniz DÖF kaydı bulunamadı.
      </Alert>
    );
  }

  const createdAt = toJsDate(dof.created_at);

  return (
    <>
      {/* ÜST DÖF KARTI */}
      <Paper withBorder shadow="sm" radius="md" p="md" mb="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group align="center" gap="xs">
              <Title order={2}>
                {dof.dof_code || "DÖF"} – {dof.subject || "Konu belirtilmemiş"}
              </Title>
              <Badge color={getDofStatusColor(dof.status)} variant="filled">
                {dof.status || "Durum yok"}
              </Badge>
            </Group>
            <Text c="dimmed" fz="sm">
              {createdAt
                ? `Oluşturma: ${createdAt.toLocaleString("tr-TR")}`
                : "Oluşturma tarihi bilgisi yok."}
            </Text>
            {dof.created_by_name && (
              <Text c="dimmed" fz="sm">
                Açan kişi: {dof.created_by_name}
              </Text>
            )}
          </Stack>

          <Stack gap="xs" align="flex-end">
            {/* Listeye geri dön butonu */}
            <Button
              variant="light"
              size="xs"
              onClick={() => navigate("/dofs")}
            >
              DÖF Listesine Dön
            </Button>

            <Stack gap={4} align="flex-end">
              <Text c="dimmed" fz="xs">
                DÖF Durumu
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant={dof.status === "Açık" ? "filled" : "light"}
                  onClick={() => handleUpdateDofStatus("Açık")}
                  loading={updatingStatus}
                >
                  Açık
                </Button>
                <Button
                  size="xs"
                  variant={
                    dof.status === "Değerlendirmede" ? "filled" : "light"
                  }
                  onClick={() => handleUpdateDofStatus("Değerlendirmede")}
                  loading={updatingStatus}
                >
                  Değerlendirmede
                </Button>
                <Button
                  size="xs"
                  color="teal"
                  variant={dof.status === "Kapalı" ? "filled" : "light"}
                  onClick={() => handleUpdateDofStatus("Kapalı")}
                  loading={updatingStatus}
                >
                  Kapalı
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Group>

        {dof.description && (
          <Paper mt="md" p="sm" radius="md" withBorder>
            <Text fw={500} mb={4}>
              Açıklama
            </Text>
            <Text fz="sm">{dof.description}</Text>
          </Paper>
        )}
      </Paper>

      {/* DÖF AKSİYONLARI */}
      <Paper withBorder shadow="sm" radius="md" p="md" mb="md">
        <Group justify="space-between" mb="sm">
          <Title order={3} fz="lg">
            DÖF Aksiyonları
          </Title>
          <Text c="dimmed" fz="sm">
            Bu DÖF kapsamında planlanan ve tamamlanan aksiyonlar.
          </Text>
        </Group>

        {actions.length === 0 ? (
          <Text ta="center" c="dimmed" py="md">
            Bu DÖF için henüz aksiyon eklenmemiş.
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="xs" fz="sm" mt="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Aksiyon</Table.Th>
                <Table.Th>Sorumlu</Table.Th>
                <Table.Th>Termin</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>İşlem</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {actions.map((a) => {
                const due = toJsDate(a.due_date);
                const overdue = isOverdue(a);
                const responsibleText =
                  a.responsible_name || a.responsible || "-";

                return (
                  <Table.Tr key={a.id}>
                    <Table.Td>{a.title}</Table.Td>
                    <Table.Td>{responsibleText}</Table.Td>
                    <Table.Td>
                      <Text
                        fz="sm"
                        c={overdue ? "red" : undefined}
                        fw={overdue ? 600 : 400}
                      >
                        {due ? due.toLocaleDateString("tr-TR") : "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          overdue && a.status !== "Tamamlandı"
                            ? "red"
                            : getActionStatusColor(a.status)
                        }
                        variant="light"
                      >
                        {overdue && a.status !== "Tamamlandı"
                          ? `${a.status} (Gecikmiş)`
                          : a.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Group gap="xs" justify="flex-end">
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<IconEdit size={14} />}
                          onClick={() => openEditModal(a)}
                        >
                          Düzenle
                        </Button>
                        {a.status !== "Tamamlandı" && (
                          <Button
                            size="xs"
                            variant="outline"
                            color="teal"
                            leftSection={<IconCheck size={14} />}
                            onClick={() => handleCompleteAction(a)}
                          >
                            Tamamlandı
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* YENİ AKSİYON EKLE */}
      <Paper withBorder shadow="sm" radius="md" p="md" mb="md">
        <Title order={4} mb="sm">
          Yeni Aksiyon Ekle
        </Title>
        <form onSubmit={handleAddAction}>
          <Stack gap="sm">
            <Group grow>
              <TextInput
                label={
                  <>
                    Aksiyon Başlığı <Text span c="red">*</Text>
                  </>
                }
                placeholder="Örn: Proses FMEA güncellenecek"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.currentTarget.value)}
                required
              />

              <Select
                label={
                  <>
                    Sorumlu Kişi <Text span c="red">*</Text>
                  </>
                }
                placeholder="Bir sorumlu seçin"
                data={responsibleOptions}
                searchable
                value={actionResponsibleId}
                onChange={(value) => {
                  setActionResponsibleId(value);
                  const opt = responsibleOptions.find((o) => o.value === value);
                  setActionResponsibleName(opt?.label || "");
                }}
                required
              />
            </Group>

            <Group grow>
              <DateInput
                label="Termin Tarihi"
                placeholder="Bir tarih seçin"
                value={actionDueDate}
                onChange={(value) =>
                  setActionDueDate(value ? new Date(value) : null)
                }
                locale="tr"
                valueFormat="DD MMMM YYYY"
                leftSection={<IconCalendar size={16} stroke={1.5} />}
                required
              />
              <Select
                label="Durum"
                data={["Planlandı", "Devam ediyor", "Tamamlandı"]}
                value={actionStatus}
                onChange={setActionStatus}
                required
              />
            </Group>

            <Button
              type="submit"
              loading={savingAction}
              mt="sm"
              maw={220}
              radius="md"
            >
              Aksiyon Ekle
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* AKTİVİTE GEÇMİŞİ */}
      <Paper withBorder shadow="sm" radius="md" p="md">
        <Title order={4} mb="sm">
          Aktivite Geçmişi
        </Title>
        {logs.length === 0 ? (
          <Text c="dimmed" fz="sm">
            Henüz kayıt yok.
          </Text>
        ) : (
          <Stack gap={6}>
            {logs.map((log) => {
              const d = toJsDate(log.created_at);
              return (
                <div key={log.id}>
                  <Group gap="xs" align="flex-start">
                    <Text fz="xs" c="dimmed" miw={140}>
                      {d ? d.toLocaleString("tr-TR") : ""}
                    </Text>
                    <Divider orientation="vertical" />
                    <Text fz="sm">
                      <Text span fw={500}>
                        {log.user_name || "Kullanıcı"}
                      </Text>
                      : {log.message}
                    </Text>
                  </Group>
                </div>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* DÜZENLEME MODALI */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Aksiyon Düzenle"
        centered
      >
        <form onSubmit={handleUpdateAction}>
          <Stack gap="sm">
            <TextInput
              label={
                <>
                  Aksiyon Başlığı <Text span c="red">*</Text>
                </>
              }
              value={editTitle}
              onChange={(e) => setEditTitle(e.currentTarget.value)}
              required
            />

            <Select
              label="Sorumlu Kişi"
              data={responsibleOptions}
              searchable
              value={editResponsibleId}
              onChange={(value) => {
                setEditResponsibleId(value);
                const opt = responsibleOptions.find((o) => o.value === value);
                setEditResponsibleName(opt?.label || "");
              }}
              required
            />

            <Group grow>
              <DateInput
                label="Termin Tarihi"
                placeholder="Bir tarih seçin"
                value={editDueDate}
                onChange={(value) =>
                  setEditDueDate(value ? new Date(value) : null)
                }
                locale="tr"
                valueFormat="DD MMMM YYYY"
                leftSection={<IconCalendar size={16} stroke={1.5} />}
                required
              />
              <Select
                label="Durum"
                data={["Planlandı", "Devam ediyor", "Tamamlandı"]}
                value={editStatus}
                onChange={setEditStatus}
                required
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setEditModalOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" loading={savingEdit}>
                Kaydet
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

export default DofDetail;
