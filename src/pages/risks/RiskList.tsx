// src/pages/risks/RiskList.tsx

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

type Risk = {
  id: string;
  name: string;
  type: string;
  description?: string;
  department: string;
  probability: number;
  impact: number;
  risk_score: number;
  status: string;
  created_at?: Timestamp | Date | null;
  company_id: string;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getRiskColor = (score: number) => {
  if (score <= 5) return "teal";
  if (score <= 10) return "orange";
  return "red";
};

const getRiskLabel = (score: number) => {
  if (score <= 5) return "Düşük";
  if (score <= 10) return "Orta";
  return "Yüksek";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Açık":
      return "red";
    case "İzlemede":
      return "orange";
    case "Kapalı":
      return "teal";
    default:
      return "gray";
  }
};

function RiskList() {
  const { proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("Tümü");
  const [typeFilter, setTypeFilter] = useState<string | null>("Tümü");

  const fetchRisks = async () => {
    if (!proqiaUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "risks"),
        where("company_id", "==", proqiaUser.company_id),
        orderBy("created_at", "desc")
      );

      const snap = await getDocs(q);

      const list: Risk[] = snap.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data.name ?? "",
          type: data.type ?? "",
          description: data.description ?? "",
          department: data.department ?? "",
          probability: data.probability ?? 0,
          impact: data.impact ?? 0,
          risk_score: data.risk_score ?? 0,
          status: data.status ?? "Açık",
          created_at: data.created_at ?? null,
          company_id: data.company_id ?? "",
        };
      });

      setRisks(list);
    } catch (err) {
      console.error("Risk listesi alınırken hata:", err);
      setError("Risk listesi alınırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
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

  // Yetki kontrolü (permissions tanımlıysa)
  if (permissions && !permissions.risk_view_list) {
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
  const filteredRisks = risks.filter((risk) => {
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      term === "" ||
      risk.name.toLowerCase().includes(term) ||
      risk.department.toLowerCase().includes(term) ||
      risk.type.toLowerCase().includes(term);

    const matchesStatus =
      !statusFilter ||
      statusFilter === "Tümü" ||
      risk.status === statusFilter;

    const matchesType =
      !typeFilter || typeFilter === "Tümü" || risk.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <Box maw={1100} mx="auto">
      {/* Üst kısım */}
      <Group justify="space-between" mb="md" align="flex-start">
        <Box>
          <Title order={2} mb={4}>
            Risk Listesi
          </Title>
          <Text c="dimmed">
            Tanımlı riskleri, türlerini ve risk seviyelerini buradan takip
            edebilirsiniz.
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={8}>
            <TextInput
              size="sm"
              placeholder="Başlık / departman / tür ara..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <Select
              size="sm"
              value={statusFilter}
              onChange={setStatusFilter}
              data={["Tümü", "Açık", "İzlemede", "Kapalı"]}
            />
            <Select
              size="sm"
              value={typeFilter}
              onChange={setTypeFilter}
              data={[
                "Tümü",
                "Süreç Riski",
                "Çevresel Risk",
                "İSG Riski",
                "Enerji Riski",
                "Diğer",
              ]}
            />
          </Group>

          {(!permissions || permissions.risk_create) && (
            <Button
              size="sm"
              radius="md"
              onClick={() => navigate("/risk/new")}
            >
              Yeni Risk Kaydı
            </Button>
          )}
        </Box>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="sm">
        {risks.length === 0 ? (
          <Text c="dimmed">
            Henüz tanımlanmış bir risk yok.
            {(!permissions || permissions.risk_create) &&
              " Sağ üstten yeni risk oluşturabilirsiniz."}
          </Text>
        ) : filteredRisks.length === 0 ? (
          <Text c="dimmed">
            Filtrelere uyan risk kaydı bulunamadı. Arama veya filtreleri
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
                <Table.Th>Departman</Table.Th>
                <Table.Th>Olasılık</Table.Th>
                <Table.Th>Şiddet</Table.Th>
                <Table.Th>Risk Skoru</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th>Oluşturulma</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredRisks.map((risk) => {
                const createdAt = toJsDate(risk.created_at);
                return (
                  <Table.Tr
                    key={risk.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/risk/${risk.id}`)}
                  >
                    <Table.Td>{risk.name}</Table.Td>
                    <Table.Td>{risk.type}</Table.Td>
                    <Table.Td>{risk.department}</Table.Td>
                    <Table.Td>{risk.probability}</Table.Td>
                    <Table.Td>{risk.impact}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={getRiskColor(risk.risk_score)}
                        variant="filled"
                      >
                        {risk.risk_score} ({getRiskLabel(risk.risk_score)})
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(risk.status)}
                        variant="light"
                      >
                        {risk.status}
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
                        onClick={() => navigate(`/risk/${risk.id}`)}
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

export default RiskList;
