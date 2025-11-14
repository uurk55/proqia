// src/pages/kpi/KPIList.tsx

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  Box,
  Title,
  Text,
  Table,
  Loader,
  Center,
  Badge,
  Group,
  Paper,
  TextInput,
  Select,
  Button,
  Alert,
} from "@mantine/core";
import { IconSearch, IconAlertCircle } from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

type KPI = {
  id: string;
  name: string;
  description?: string;
  unit: string;
  target_value: number;
  period: string; // "Aylık" | "Yıllık" | ...
  department: string;
  responsible_user: string;
  created_at?: Timestamp | Date | null;
  company_id: string;
  current_value?: number | null;  // YENİ
  status?: string | null;         // YENİ  ("Takipte" | "Hedefte" | "Riskte" | "Geride" ...)
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getStatusColor = (status?: string | null) => {
  switch (status) {
    case "Hedefte":
      return "teal";
    case "Takipte":
      return "blue";
    case "Riskte":
      return "orange";
    case "Geride":
      return "red";
    default:
      return "gray";
  }
};

function KPIList() {
  const { proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string | null>("Tümü");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>("Tümü");
  const [statusFilter, setStatusFilter] = useState<string | null>("Tümü"); // YENİ

  const fetchKpis = async () => {
    if (!proqiaUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "kpis"),
        where("company_id", "==", proqiaUser.company_id),
        orderBy("created_at", "desc")
      );

      const snap = await getDocs(q);

      const list: KPI[] = snap.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data.name ?? "",
          description: data.description ?? "",
          unit: data.unit ?? "",
          target_value: data.target_value ?? 0,
          period: data.period ?? "",
          department: data.department ?? "",
          responsible_user: data.responsible_user ?? "",
          created_at: data.created_at ?? null,
          company_id: data.company_id ?? "",
          current_value: data.current_value ?? null, // YENİ
          status: data.status ?? null,               // YENİ
        };
      });

      setKpis(list);
    } catch (err) {
      console.error("KPI listesi alınırken hata:", err);
      setError(
        "KPI listesi alınırken bir hata oluştu. Gerekirse Firestore index'lerini kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proqiaUser]);

  // Yükleniyor
  if (loading) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Genel hata
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

  // Yetki kontrolü
  if (permissions && !permissions.kpi_view_list) {
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

  // Filtreleme
  const filteredKpis = kpis.filter((kpi) => {
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      term === "" ||
      kpi.name.toLowerCase().includes(term) ||
      kpi.department.toLowerCase().includes(term) ||
      kpi.responsible_user.toLowerCase().includes(term) ||
      (kpi.description || "").toLowerCase().includes(term);

    const matchesPeriod =
      !periodFilter || periodFilter === "Tümü" || kpi.period === periodFilter;

    const matchesDepartment =
      !departmentFilter ||
      departmentFilter === "Tümü" ||
      kpi.department === departmentFilter;

    const status = kpi.status ?? "Takipte";
    const matchesStatus =
      !statusFilter || statusFilter === "Tümü" || status === statusFilter;

    return matchesSearch && matchesPeriod && matchesDepartment && matchesStatus;
  });

  // Departman listesini dinamik yapmak için
  const departmentOptions = Array.from(
    new Set(kpis.map((k) => k.department).filter(Boolean))
  );

  return (
    <Box maw={1100} mx="auto">
      {/* Üst kısım */}
      <Group justify="space-between" mb="md" align="flex-start">
        <Box>
          <Title order={2} mb={4}>
            Hedefler / KPI Listesi
          </Title>
          <Text c="dimmed">
            Tanımlı hedeflerinizi ve hedef değerlerini buradan takip
            edebilirsiniz.
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={8}>
            <TextInput
              size="sm"
              placeholder="Hedef / departman / sorumlu ara..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <Select
              size="sm"
              value={periodFilter}
              onChange={setPeriodFilter}
              data={["Tümü", "Aylık", "3 Aylık", "6 Aylık", "Yıllık"]}
            />
            <Select
              size="sm"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              data={[
                "Tümü",
                ...departmentOptions, // var olan departmanlardan
              ]}
            />
            <Select
              size="sm"
              value={statusFilter}
              onChange={setStatusFilter}
              data={["Tümü", "Takipte", "Hedefte", "Riskte", "Geride"]}
            />
          </Group>

          {(!permissions || permissions.kpi_create) && (
            <Button
              size="sm"
              radius="md"
              onClick={() => navigate("/kpi/new")}
            >
              Yeni Hedef / KPI
            </Button>
          )}
        </Box>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="sm">
        {kpis.length === 0 ? (
          <Text c="dimmed">
            Henüz tanımlanmış bir KPI yok.
            {(!permissions || permissions.kpi_create) &&
              " Sağ üstten yeni hedef oluşturabilirsiniz."}
          </Text>
        ) : filteredKpis.length === 0 ? (
          <Text c="dimmed">
            Filtrelere uyan KPI kaydı bulunamadı. Arama veya filtreleri
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
                <Table.Th>Hedef</Table.Th>
                <Table.Th>Departman</Table.Th>
                <Table.Th>Sorumlu</Table.Th>
                <Table.Th>Periyot</Table.Th>
                <Table.Th>Hedef Değer</Table.Th>
                <Table.Th>Gerçekleşen</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th>Oluşturulma</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredKpis.map((kpi) => {
                const createdAt = toJsDate(kpi.created_at);
                const status = kpi.status ?? "Takipte";

                return (
                  <Table.Tr
                    key={kpi.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/kpi/${kpi.id}`)}
                  >
                    <Table.Td>{kpi.name}</Table.Td>
                    <Table.Td>{kpi.department}</Table.Td>
                    <Table.Td>{kpi.responsible_user}</Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={
                          kpi.period === "Aylık"
                            ? "blue"
                            : kpi.period === "Yıllık"
                            ? "grape"
                            : "gray"
                        }
                      >
                        {kpi.period || "-"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {kpi.target_value} {kpi.unit}
                    </Table.Td>
                    <Table.Td>
                      {kpi.current_value != null
                        ? `${kpi.current_value} ${kpi.unit}`
                        : "-"}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={getStatusColor(status)}
                      >
                        {status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {createdAt
                        ? createdAt.toLocaleDateString("tr-TR")
                        : "-"}
                    </Table.Td>
                    <Table.Td
                      style={{ textAlign: "right" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="xs"
                        variant="light"
                        radius="md"
                        onClick={() => navigate(`/kpi/${kpi.id}`)}
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

export default KPIList;
