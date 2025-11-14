// src/pages/dashboard/Dashboard.tsx

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

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
} from "@mantine/core";
import {
  IconFileAlert,
  IconMessageCircle,
  IconAlertTriangle,
  IconCalendarTime,
  IconListCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

// ------- Tipler -------

type SummaryCounts = {
  openDof: number;
  openComplaints: number;
  openRisks: number;
  upcomingTrainings: number;
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
  // @ts-expect-error: runtime'da Timestamp olabilir
  return typeof value.toDate === "function" ? value.toDate() : value;
};

// ------- Küçük özet kart bileşeni -------

type SummaryCardProps = {
  label: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
  onClick?: () => void;
};

function SummaryCard({ label, value, icon, description, onClick }: SummaryCardProps) {
  const clickable = !!onClick;

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      shadow={clickable ? "sm" : "xs"}
      onClick={onClick}
      style={{
        cursor: clickable ? "pointer" : "default",
        transition: "transform 120ms ease, box-shadow 120ms ease",
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
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<SummaryCounts>({
    openDof: 0,
    openComplaints: 0,
    openRisks: 0,
    upcomingTrainings: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");

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
        const dofSnap = await getDocs(
          query(
            collection(db, "corrective_actions"),
            where("company_id", "==", proqiaUser.company_id),
            where("status", "==", "Açık")
          )
        );

        const complaintSnap = await getDocs(
          query(
            collection(db, "complaints"),
            where("company_id", "==", proqiaUser.company_id),
            where("status", "==", "Açık")
          )
        );

        const riskSnap = await getDocs(
          query(
            collection(db, "risks"),
            where("company_id", "==", proqiaUser.company_id)
          )
        );
        const openRisks = riskSnap.docs.filter((doc) => {
          const s = (doc.data() as any).status;
          return s === "Açık" || s === "İzlemede";
        }).length;

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
          const data = doc.data() as any;
          if (data.status !== "Planlandı") return false;
          const dateVal = toJsDate(data.date);
          if (!dateVal) return false;
          return dateVal >= now && dateVal <= in7;
        }).length;

        setSummary({
          openDof: dofSnap.size,
          openComplaints: complaintSnap.size,
          openRisks,
          upcomingTrainings,
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
          const data = doc.data() as any;
          return {
            id: doc.id,
            title: data.title ?? "Görev",
            module: data.module ?? data.type ?? "",
            status: data.status ?? "",
            ref_id: data.ref_id ?? data.target_id ?? "",
            due_date: data.due_date ?? null,
          };
        });

        const openStatuses = ["open", "Open", "Açık", "Beklemede", "Devam ediyor"];
        const filtered = rawTasks.filter((t) =>
          t.status ? openStatuses.includes(t.status) : true
        );

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
    if (task.module === "complaint" && task.ref_id) return `/complaint/${task.ref_id}`;
    if (task.module === "risk" && task.ref_id) return `/risk/${task.ref_id}`;
    if (task.module === "training" && task.ref_id) return `/training/${task.ref_id}`;
    if (task.module === "incident" && task.ref_id) return `/incident/${task.ref_id}`;
    return null;
  };

  // -------- Ekran --------

  if (!proqiaUser) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box>
      {/* ÜST ÖZET KARTLAR */}
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
        </SimpleGrid>
      )}

      {/* BEKLEYEN GÖREVLERİM */}
      <Paper withBorder shadow="sm" radius="md" p="md" mt="md">
        <Group justify="space-between" mb="sm">
          <Group gap={8}>
            <IconListCheck size={20} />
            <Title order={3}>Bekleyen Görevlerim</Title>
          </Group>
          <Text fz="sm" c="dimmed">
            {tasks.length} adet bekleyen göreviniz var.
          </Text>
        </Group>

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
        ) : tasks.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            Size atanmış bekleyen bir göreviniz bulunmuyor. Harika!
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
              {tasks.map((task) => {
                const dueDate = toJsDate(task.due_date);
                const link = getTaskLink(task);

                return (
                  <Table.Tr
                    key={task.id}
                    style={{ cursor: link ? "pointer" : "default" }}
                    onClick={() => link && navigate(link)}
                  >
                    <Table.Td>{task.title}</Table.Td>
                    <Table.Td>{task.module || "-"}</Table.Td>
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
                      {dueDate ? dueDate.toLocaleDateString("tr-TR") : "-"}
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
