// src/pages/dashboard/Dashboard.tsx

import { useEffect, useState, type ReactNode } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  SimpleGrid,
  Paper,
  Group,
  Stack,
  Title,
  Text,
  Loader,
  Center,
  Badge,
  Table,
  Button,
  Alert,
  Switch,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  IconFileAlert,
  IconMessageCircle,
  IconAlertTriangle,
  IconCalendarTime,
  IconListCheck,
  IconAlertCircle,
  IconFileDescription,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

// ------- Tipler -------

type SummaryCounts = {
  openDof: number;
  openComplaints: number;
  openRisks: number;
  upcomingTrainings: number;
  pendingDocs: number; // Onay bekleyen doküman sayısı
};

type TaskItem = {
  id: string;
  title: string;
  module?: string;
  status?: string;
  ref_id?: string;
  due_date?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  
  return typeof (value as any).toDate === "function"
    ? (value as any).toDate()
    : (value as Date);
};

// Due-date yardımcıları
const isTaskOverdue = (due?: Timestamp | Date | null): boolean => {
  const d = toJsDate(due);
  if (!d) return false;
  const now = new Date();
  const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dMid.getTime() < nowMid.getTime();
};

const getDueInfo = (due?: Timestamp | Date | null): string | null => {
  const d = toJsDate(due);
  if (!d) return null;
  const now = new Date();
  const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = dMid.getTime() - nowMid.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} gün gecikti`;
  if (diffDays === 0) return "Termin bugün";
  if (diffDays === 1) return "1 gün kaldı";
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} gün kaldı`;
  return null;
};

// Modül ikon / label helper
const getModuleInfo = (module?: string) => {
  const m = (module || "").toLowerCase();

  if (m === "dof" || m === "corrective_action") {
    return { label: "DÖF", icon: <IconFileAlert size={16} /> };
  }
  if (m === "complaint") {
    return { label: "Şikayet", icon: <IconMessageCircle size={16} /> };
  }
  if (m === "risk") {
    return { label: "Risk", icon: <IconAlertTriangle size={16} /> };
  }
  if (m === "training") {
    return { label: "Eğitim", icon: <IconCalendarTime size={16} /> };
  }
  if (m === "incident" || m === "isg") {
    return { label: "İSG / Olay", icon: <IconAlertTriangle size={16} /> };
  }

  return { label: module || "Genel", icon: <IconListCheck size={16} /> };
};

// ------- Küçük özet kart bileşeni -------

type SummaryCardProps = {
  label: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
  onClick?: () => void;
};

function SummaryCard({
  label,
  value,
  icon,
  description,
  onClick,
}: SummaryCardProps) {
  const clickable = Boolean(onClick);

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      shadow="xs"
      onClick={onClick}
      style={{
        cursor: clickable ? "pointer" : "default",
        transition: clickable
          ? "transform 120ms ease, box-shadow 120ms ease"
          : undefined,
      }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 12px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLDivElement).style.transform = "none";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text fz="xs" c="dimmed">
            {label}
          </Text>
          <Title order={3}>{value}</Title>
          {description && (
            <Text fz="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
        <Paper
          radius="xl"
          p={8}
          withBorder
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          {icon}
        </Paper>
      </Group>
    </Paper>
  );
}

// ------- Ana Dashboard bileşeni -------

function Dashboard() {
  const { proqiaUser, currentUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<SummaryCounts>({
    openDof: 0,
    openComplaints: 0,
    openRisks: 0,
    upcomingTrainings: 0,
    pendingDocs: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");

  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  // -------- Özet kartlar için verileri çek --------

  useEffect(() => {
    const fetchSummary = async () => {
      if (!proqiaUser) {
        setSummaryLoading(false);
        return;
      }

      setSummaryLoading(true);
      setSummaryError("");

      try {
        // Açık DÖF sayısı
        const dofSnap = await getDocs(
          query(
            collection(db, "corrective_actions"),
            where("company_id", "==", proqiaUser.company_id),
            where("status", "==", "Açık")
          )
        );

        // Açık şikayet sayısı
        const complaintSnap = await getDocs(
          query(
            collection(db, "complaints"),
            where("company_id", "==", proqiaUser.company_id),
            where("status", "==", "Açık")
          )
        );

        // Açık / izlemede risk sayısı
        const riskSnap = await getDocs(
          query(
            collection(db, "risks"),
            where("company_id", "==", proqiaUser.company_id)
          )
        );
        const openRisks = riskSnap.docs.filter((doc) => {
          const d = doc.data() as { status?: string };
          const s = d.status;
          return s === "Açık" || s === "İzlemede";
        }).length;

        // Yaklaşan eğitimler (önümüzdeki 7 gün, status = Planlandı)
        const trainingsSnap = await getDocs(
          query(
            collection(db, "trainings"),
            where("company_id", "==", proqiaUser.company_id)
          )
        );
        const now = new Date();
        const in7 = new Date();
        in7.setDate(in7.getDate() + 7);

        const upcomingTrainings = trainingsSnap.docs.filter((doc) => {
          const data = doc.data() as { status?: string; date?: Timestamp };
          if (data.status !== "Planlandı") return false;
          const dateVal = toJsDate(data.date);
          if (!dateVal) return false;
          return dateVal >= now && dateVal <= in7;
        }).length;

        // Onay bekleyen doküman sayısı (status = "pending")
        const docsSnap = await getDocs(
          query(
            collection(db, "documents"),
            where("company_id", "==", proqiaUser.company_id),
            where("status", "==", "pending")
          )
        );

        setSummary({
          openDof: dofSnap.size,
          openComplaints: complaintSnap.size,
          openRisks,
          upcomingTrainings,
          pendingDocs: docsSnap.size,
        });
      } catch (err) {
        console.error("Dashboard özet verileri alınamadı:", err);
        setSummaryError(
          "Özet veriler alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin."
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [proqiaUser]);

  // -------- Bekleyen görevler için verileri çek --------

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser || !proqiaUser) {
        setTasksLoading(false);
        return;
      }

      setTasksLoading(true);
      setTasksError("");

      try {
        const snap = await getDocs(
          query(
            collection(db, "tasks"),
            where("company_id", "==", proqiaUser.company_id),
            where("assignee_id", "==", currentUser.uid)
          )
        );

        const rawTasks: TaskItem[] = snap.docs.map((doc) => {
          const data = doc.data() as {
            title?: string;
            module?: string;
            type?: string;
            status?: string;
            ref_id?: string;
            target_id?: string;
            due_date?: Timestamp | Date | null;
          };

          return {
            id: doc.id,
            title: data.title ?? "Görev",
            module: data.module ?? data.type ?? "",
            status: data.status ?? "",
            ref_id: data.ref_id ?? data.target_id ?? "",
            due_date: data.due_date ?? null,
          };
        });

        // Sadece açık / bekleyen görevleri göster
        const openStatuses = [
          "open",
          "Open",
          "Açık",
          "Beklemede",
          "Devam ediyor",
        ];
        const filtered = rawTasks.filter((t) =>
          t.status ? openStatuses.includes(t.status) : true
        );

        // Tarihe göre sırala (yakın termin en üstte)
        filtered.sort((a, b) => {
          const da = toJsDate(a.due_date)?.getTime() ?? Infinity;
          const dbt = toJsDate(b.due_date)?.getTime() ?? Infinity;
          return da - dbt;
        });

        setTasks(filtered);
      } catch (err) {
        console.error("Bekleyen görevler alınamadı:", err);
        setTasksError(
          "Bekleyen görevler alınırken bir hata oluştu. Gerekirse 'tasks' koleksiyonunu kontrol edin."
        );
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser, proqiaUser]);

  const getTaskLink = (task: TaskItem): string | null => {
    if (task.module === "dof" && task.ref_id) return `/dof/${task.ref_id}`;
    if (task.module === "complaint" && task.ref_id)
      return `/complaint/${task.ref_id}`;
    if (task.module === "risk" && task.ref_id) return `/risk/${task.ref_id}`;
    if (task.module === "training" && task.ref_id)
      return `/training/${task.ref_id}`;
    if (task.module === "incident" && task.ref_id)
      return `/incident/${task.ref_id}`;

    return null;
  };

  // Filtrelenmiş görevler (sadece gecikenleri göster opsiyonu)
  const visibleTasks = showOnlyOverdue
    ? tasks.filter((t) => isTaskOverdue(t.due_date))
    : tasks;

  // Küçük görev özet hesapları
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t.due_date)).length;
  const dueIn7 = tasks.filter((t) => {
    const info = getDueInfo(t.due_date);
    return info !== null && info.includes("kaldı");
  }).length;

  // -------- Rol bazlı hoş geldin bloğu için textler --------

  let roleTitle = "Kullanıcı";
  const tips: string[] = [];

  if (proqiaUser?.role_id === "admin") {
    roleTitle = "Şirket Admini";
    tips.push(
      "Şirketiniz için departman ve lokasyonları tanımlayın (Admin → Şirket Ayarları).",
      "Rolleri ve iş akışlarını gözden geçirip, doğru kişilere doğru yetkileri verin.",
      "İlk DÖF / şikayet / risk kayıtlarını oluşturup sistemi canlıda test edin.",
      "Kullanıcılar menüsünden yeni kullanıcılar ekleyip rollerini atayın."
    );
  } else {
    roleTitle = "ProQIA Kullanıcısı";
    tips.push(
      "Dashboard'daki 'Bekleyen Görevlerim' listesini kontrol edin ve geciken işlerden başlayın.",
      "Karşılaştığınız uygunsuzluklar için hızlıca DÖF veya şikayet kaydı açın.",
      "İSG olaylarını ve ramak kalaları anında sisteme girerek izlenebilir hale getirin.",
      "Sorumlu olduğunuz KPI ve eğitim kayıtlarını düzenli aralıklarla güncelleyin."
    );
  }

  // 🔹 Sadece onaylayıcı kullanıcılar için doküman kartı
  const canApproveDocs =
    permissions?.doc_approve_list ||
    permissions?.doc_approve ||
    permissions?.doc_approval;

  // -------- Ekranlar --------

  if (!proqiaUser) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box>
      {/* ROL BAZLI HOŞ GELDİN BLOĞU */}
      <Paper withBorder radius="md" p="md" mb="md" shadow="xs">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2}>
              Hoş geldin, {proqiaUser.full_name || "Kullanıcı"} 👋
            </Title>
            <Text fz="sm" c="dimmed">
              Rolün: <Text span fw={500}>{roleTitle}</Text>.{" "}
              Bugün ProQIA'da odaklanabileceğin birkaç öneri:
            </Text>
          </Stack>
          <Badge variant="light" color="blue">
            {roleTitle}
          </Badge>
        </Group>

        {tips.length > 0 && (
          <List
            mt="sm"
            spacing="xs"
            size="sm"
            icon={
              <ThemeIcon size={18} radius="xl" variant="light">
                <IconListCheck size={14} />
              </ThemeIcon>
            }
          >
            {tips.map((tip) => (
              <List.Item key={tip}>{tip}</List.Item>
            ))}
          </List>
        )}
      </Paper>

      {/* ÜST ÖZET KARTLAR (TIKLANABİLİR) */}
      {summaryLoading ? (
        <Center style={{ padding: 24 }}>
          <Loader size="md" />
        </Center>
      ) : summaryError ? (
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Özet veriler yüklenemedi"
          color="red"
          mb="md"
        >
          {summaryError}
        </Alert>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <SummaryCard
            label="Açık DÖF"
            value={summary.openDof}
            description="Çözümlenmesi gereken düzeltici faaliyetler"
            icon={<IconFileAlert size={22} />}
            onClick={() => navigate("/dofs")}
          />
          <SummaryCard
            label="Açık Şikayet"
            value={summary.openComplaints}
            description="Müşteri şikayetleri"
            icon={<IconMessageCircle size={22} />}
            onClick={() => navigate("/complaints")}
          />
          <SummaryCard
            label="Açık / İzlemede Risk"
            value={summary.openRisks}
            description="Kapatılmamış risk kayıtları"
            icon={<IconAlertTriangle size={22} />}
            onClick={() => navigate("/risks")}
          />
          <SummaryCard
            label="Önümüzdeki 7 Gündeki Eğitimler"
            value={summary.upcomingTrainings}
            description="Planlanmış eğitim sayısı"
            icon={<IconCalendarTime size={22} />}
            onClick={() => navigate("/trainings")}
          />

          {canApproveDocs && (
            <SummaryCard
              label="Onay Bekleyen Doküman"
              value={summary.pendingDocs}
              description="Onay bekleyen doküman sayısı"
              icon={<IconFileDescription size={22} />}
              onClick={() => navigate("/documents/approval")}
            />
          )}
        </SimpleGrid>
      )}

      {/* BEKLEYEN GÖREVLERİM */}
      <Paper withBorder shadow="sm" radius="md" p="md" mt="md">
        <Group justify="space-between" mb="xs" align="center">
          <Group gap={8}>
            <IconListCheck size={20} />
            <Title order={3}>Bekleyen Görevlerim</Title>
          </Group>
          <Group gap="md">
            <Switch
              size="sm"
              checked={showOnlyOverdue}
              onChange={(e) => setShowOnlyOverdue(e.currentTarget.checked)}
              label="Sadece gecikenleri göster"
            />
          </Group>
        </Group>

        {/* Küçük görev özeti */}
        <Text fz="xs" c="dimmed" mb="sm">
          Toplam{" "}
          <Text span fw={500}>
            {totalTasks}
          </Text>{" "}
          görev •{" "}
          <Text span fw={500} c={overdueTasks > 0 ? "red" : "dimmed"}>
            {overdueTasks} gecikmiş
          </Text>{" "}
          •{" "}
          <Text span fw={500}>{dueIn7} </Text>
          önümüzdeki 7 gün içinde terminli
        </Text>

        {tasksLoading ? (
          <Center style={{ padding: 24 }}>
            <Loader size="md" />
          </Center>
        ) : tasksError ? (
          <Alert
            icon={<IconAlertCircle size={18} />}
            title="Görevler yüklenemedi"
            color="red"
          >
            {tasksError}
          </Alert>
        ) : visibleTasks.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            {showOnlyOverdue
              ? "Geciken bekleyen göreviniz bulunmuyor. Güzel haber!"
              : "Size atanmış bekleyen bir göreviniz bulunmuyor. Harika!"}
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Görev</Table.Th>
                <Table.Th>Modül</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th>Termin</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleTasks.map((task) => {
                const dueDate = toJsDate(task.due_date);
                const link = getTaskLink(task);
                const overdue = isTaskOverdue(task.due_date);
                const dueInfo = getDueInfo(task.due_date);
                const moduleInfo = getModuleInfo(task.module);

                return (
                  <Table.Tr
                    key={task.id}
                    style={{
                      cursor: link ? "pointer" : "default",
                      backgroundColor: overdue
                        ? "rgba(255, 0, 0, 0.03)"
                        : undefined,
                    }}
                    onClick={() => link && navigate(link)}
                  >
                    <Table.Td>{task.title}</Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        {moduleInfo.icon}
                        <Text fz="xs">{moduleInfo.label}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {task.status ? (
                        <Badge
                          variant="light"
                          color={
                            task.status === "Açık" || task.status === "open"
                              ? "red"
                              : "yellow"
                          }
                        >
                          {task.status}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">
                        {dueDate
                          ? dueDate.toLocaleDateString("tr-TR")
                          : "-"}
                      </Text>
                      {dueInfo && (
                        <Text fz="xs" c={overdue ? "red" : "dimmed"}>
                          {dueInfo}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td
                      style={{ textAlign: "right" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="xs"
                        variant="light"
                        radius="md"
                        disabled={!link}
                        onClick={() => link && navigate(link)}
                      >
                        Git
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}

export default Dashboard;
