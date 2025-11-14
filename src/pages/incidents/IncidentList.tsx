// src/pages/incidents/IncidentList.tsx

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

type Incident = {
  id: string;
  type: string;
  title: string;
  description?: string;
  location: string;
  department: string;
  event_date?: Timestamp | Date | null;
  injury_severity?: string;
  status: string;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getTypeColor = (type: string) => {
  if (type === "İş Kazası") return "red";
  if (type === "Ramak Kala") return "yellow";
  return "orange"; // Tehlike Bildirimi vb.
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Açık":
      return "red";
    case "İncelemede":
      return "yellow";
    case "Kapalı":
      return "teal";
    default:
      return "gray";
  }
};

function IncidentList() {
  const { proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("Tümü");
  const [typeFilter, setTypeFilter] = useState<string | null>("Tümü");

  const fetchIncidents = async () => {
    if (!proqiaUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "incidents"),
        where("company_id", "==", proqiaUser.company_id),
        orderBy("event_date", "desc")
      );

      const snap = await getDocs(q);

      const list: Incident[] = snap.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          type: data.type ?? "",
          title: data.title ?? "",
          description: data.description ?? "",
          location: data.location ?? "",
          department: data.department ?? "",
          event_date: data.event_date ?? null,
          injury_severity: data.injury_severity ?? "",
          status: data.status ?? "Açık",
          company_id: data.company_id ?? "",
          created_at: data.created_at ?? null,
        };
      });

      setIncidents(list);
    } catch (err) {
      console.error("İSG listesi alınırken hata:", err);
      setError(
        "İSG kayıtları alınırken bir hata oluştu. Gerekirse Firestore index'lerini kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
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
  if (permissions && !permissions.incident_view_list) {
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
  const filteredIncidents = incidents.filter((i) => {
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      term === "" ||
      i.title.toLowerCase().includes(term) ||
      i.location.toLowerCase().includes(term) ||
      i.department.toLowerCase().includes(term) ||
      (i.description || "").toLowerCase().includes(term);

    const matchesStatus =
      !statusFilter || statusFilter === "Tümü" || i.status === statusFilter;

    const matchesType =
      !typeFilter || typeFilter === "Tümü" || i.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <Box maw={1100} mx="auto">
      {/* Üst kısım */}
      <Group justify="space-between" mb="md" align="flex-start">
        <Box>
          <Title order={2} mb={4}>
            İSG Kayıt Listesi
          </Title>
          <Text c="dimmed">
            İş kazaları, ramak kala ve tehlike bildirimlerini buradan
            görüntüleyebilirsiniz.
          </Text>
        </Box>

        <Box>
          <Group gap="xs" mb={8}>
            <TextInput
              size="sm"
              placeholder="Başlık / lokasyon / departman ara..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <Select
              size="sm"
              value={statusFilter}
              onChange={setStatusFilter}
              data={["Tümü", "Açık", "İncelemede", "Kapalı"]}
            />
            <Select
              size="sm"
              value={typeFilter}
              onChange={setTypeFilter}
              data={["Tümü", "İş Kazası", "Ramak Kala", "Tehlike Bildirimi"]}
            />
          </Group>

          {(!permissions || permissions.incident_create) && (
            <Button
              size="sm"
              radius="md"
              onClick={() => navigate("/incident/new")}
            >
              Yeni İSG Kaydı
            </Button>
          )}
        </Box>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="sm">
        {incidents.length === 0 ? (
          <Text c="dimmed">
            Henüz kayıtlı bir İSG olayı yok.
            {(!permissions || permissions.incident_create) &&
              " Sağ üstten yeni kayıt oluşturabilirsiniz."}
          </Text>
        ) : filteredIncidents.length === 0 ? (
          <Text c="dimmed">
            Filtrelere uyan İSG kaydı bulunamadı. Arama veya filtreleri
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
                <Table.Th>Tür</Table.Th>
                <Table.Th>Başlık</Table.Th>
                <Table.Th>Lokasyon</Table.Th>
                <Table.Th>Departman</Table.Th>
                <Table.Th>Tarih</Table.Th>
                <Table.Th>Yaralanma</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredIncidents.map((i) => {
                const date = toJsDate(i.event_date);
                return (
                  <Table.Tr
                    key={i.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/incident/${i.id}`)}
                  >
                    <Table.Td>
                      <Badge color={getTypeColor(i.type)} variant="light">
                        {i.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{i.title}</Table.Td>
                    <Table.Td>{i.location}</Table.Td>
                    <Table.Td>{i.department}</Table.Td>
                    <Table.Td>
                      {date ? date.toLocaleDateString("tr-TR") : "-"}
                    </Table.Td>
                    <Table.Td>{i.injury_severity || "-"}</Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(i.status)} variant="light">
                        {i.status}
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
                        onClick={() => navigate(`/incident/${i.id}`)}
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

export default IncidentList;
