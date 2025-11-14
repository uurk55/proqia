// src/pages/trainings/TrainingList.tsx

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  Title,
  Text,
  Table,
  Loader,
  Center,
  Group,
  Paper,
  TextInput,
  Select,
  Button,
  Alert,
  Badge,
} from "@mantine/core";
import { IconSearch, IconAlertCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

type Training = {
  id: string;
  title: string;
  training_type: string;
  date?: Timestamp | Date | null;
  duration_hours?: number;
  trainer: string;
  location?: string;
  target_group: string;
  status: string;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Planlandı":
      return "blue";
    case "Gerçekleşti":
      return "teal";
    case "İptal":
      return "red";
    default:
      return "gray";
  }
};

function TrainingList() {
  const { proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("Tümü");
  const [typeFilter, setTypeFilter] = useState<string | null>("Tümü");

  useEffect(() => {
    const fetchTrainings = async () => {
      if (!proqiaUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const q = query(
          collection(db, "trainings"),
          where("company_id", "==", proqiaUser.company_id),
          orderBy("date", "desc")
        );

        const snap = await getDocs(q);

        const list: Training[] = snap.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            title: data.title ?? "",
            training_type: data.training_type ?? "",
            date: data.date ?? null,
            duration_hours: data.duration_hours ?? null,
            trainer: data.trainer ?? "",
            location: data.location ?? "",
            target_group: data.target_group ?? "",
            status: data.status ?? "Planlandı",
            company_id: data.company_id ?? "",
            created_at: data.created_at ?? null,
          };
        });

        setTrainings(list);
      } catch (err) {
        console.error("Eğitim listesi alınırken hata:", err);
        setError("Eğitim listesi alınırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, [proqiaUser]);

  if (loading) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

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

  if (permissions && !permissions.training_view_list) {
    return (
      <Alert
        icon={<IconAlertCircle size={18} />}
        title="Erişim yok"
        color="yellow"
        mt="md"
      >
        Bu sayfayı görüntüleme yetkiniz bulunmuyor.
      </Alert>
    );
  }

  const filteredTrainings = trainings.filter((t) => {
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      term === "" ||
      t.title.toLowerCase().includes(term) ||
      t.trainer.toLowerCase().includes(term) ||
      t.target_group.toLowerCase().includes(term) ||
      (t.location || "").toLowerCase().includes(term);

    const matchesStatus =
      !statusFilter || statusFilter === "Tümü" || t.status === statusFilter;

    const matchesType =
      !typeFilter || typeFilter === "Tümü" || t.training_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <Box maw={1100} mx="auto">
      <Group justify="space-between" mb="md" align="flex-start">
        <Box>
          <Title order={2} mb={4}>
            Eğitim Listesi
          </Title>
          <Text c="dimmed">
            Planlanan ve gerçekleştirilen eğitimlerinizi buradan izleyin.
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={8}>
            <TextInput
              size="sm"
              placeholder="Başlık / eğitmen / hedef grup ara..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <Select
              size="sm"
              value={statusFilter}
              onChange={setStatusFilter}
              data={["Tümü", "Planlandı", "Gerçekleşti", "İptal"]}
            />
            <Select
              size="sm"
              value={typeFilter}
              onChange={setTypeFilter}
              data={[
                "Tümü",
                "İç Eğitim",
                "Dış Eğitim",
                "Oryantasyon",
                "İSG Eğitimi",
                "Çevre Eğitimi",
                "Teknik Eğitim",
                "Diğer",
              ]}
            />
          </Group>

          {(!permissions || permissions.training_create) && (
            <Button
              size="sm"
              radius="md"
              onClick={() => navigate("/training/new")}
            >
              Yeni Eğitim Kaydı
            </Button>
          )}
        </Box>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="sm">
        {trainings.length === 0 ? (
          <Text c="dimmed">
            Henüz tanımlanmış bir eğitim yok.
            {(!permissions || permissions.training_create) &&
              " Sağ üstten yeni eğitim oluşturabilirsiniz."}
          </Text>
        ) : filteredTrainings.length === 0 ? (
          <Text c="dimmed">
            Filtrelere uyan eğitim kaydı bulunamadı. Arama veya filtreleri
            değiştirin.
          </Text>
        ) : (
          <Table
            striped
            highlightOnHover
            withTableBorder
            verticalSpacing="sm"
            fz="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Başlık</Table.Th>
                <Table.Th>Tür</Table.Th>
                <Table.Th>Tarih</Table.Th>
                <Table.Th>Eğitmen</Table.Th>
                <Table.Th>Hedef Grup</Table.Th>
                <Table.Th>Süre (saat)</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTrainings.map((t) => {
                const date = toJsDate(t.date);
                return (
                  <Table.Tr
                    key={t.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/training/${t.id}`)}
                  >
                    <Table.Td>{t.title}</Table.Td>
                    <Table.Td>{t.training_type}</Table.Td>
                    <Table.Td>
                      {date ? date.toLocaleDateString("tr-TR") : "-"}
                    </Table.Td>
                    <Table.Td>{t.trainer}</Table.Td>
                    <Table.Td>{t.target_group}</Table.Td>
                    <Table.Td>
                      {t.duration_hours != null ? t.duration_hours : "-"}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(t.status)}
                        variant="light"
                      >
                        {t.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td
                      style={{ textAlign: "right" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="xs"
                        variant="light"
                        radius="md"
                        onClick={() => navigate(`/training/${t.id}`)}
                      >
                        Görüntüle
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

export default TrainingList;
