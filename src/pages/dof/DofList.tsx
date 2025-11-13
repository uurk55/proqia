import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

import {
  Title,
  Text,
  Paper,
  Table,
  Button,
  Group,
  Loader,
  TextInput,
  Alert,
  Stack,
  Badge,
  Select,
} from "@mantine/core";
import { IconSearch, IconAlertCircle } from "@tabler/icons-react";

// ---- DÖF tipi ----
interface DofItem {
  id: string;
  dof_code: string;
  subject: string;
  status: string;
  created_at?: Timestamp | Date;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Açık":
      return "blue";
    case "Değerlendirmede":
      return "orange";
    case "Kapalı":
      return "teal";
    case "Reddedildi":
      return "red";
    default:
      return "gray";
  }
};

// Timestamp → Date dönüşümü
const toJsDate = (value?: Timestamp | Date): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

function DofList() {
  const { proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();

  const [allDofs, setAllDofs] = useState<DofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("Tümü");

  // ---- Firestore'dan veri çekme ----
  useEffect(() => {
    if (!proqiaUser) {
      setLoading(false);
      return;
    }

    const fetchDofs = async () => {
      setLoading(true);
      setError("");

      try {
        const dofsQuery = query(
          collection(db, "corrective_actions"),
          where("company_id", "==", proqiaUser.company_id),
          orderBy("created_at", "desc")
        );

        const snap = await getDocs(dofsQuery);

        const list: DofItem[] = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            dof_code: data.dof_code || "-",
            subject: data.subject || "-",
            status: data.status || "Açık",
            created_at: data.created_at,
          };
        });

        setAllDofs(list);
      } catch (err) {
        console.error("DÖF'ler çekilemedi:", err);
        setError(
          "DÖF'ler çekilemedi. Firestore Rules veya Index ayarlarını kontrol edin."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDofs();
  }, [proqiaUser, permissions]);

  // ---- Yükleme/Hata ekranı ----
  if (loading)
    return (
      <Loader size="lg" style={{ display: "block", margin: "150px auto" }} />
    );

  if (error)
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

  if (!permissions?.dof_view_list) {
    return (
      <Alert
        icon={<IconAlertCircle size={18} />}
        title="Erişim yok"
        color="yellow"
        mt="md"
      >
        Bu sayfayı görüntüleme izniniz bulunmuyor.
      </Alert>
    );
  }

  // ---- Filtreleme ----
  const filteredDofs = allDofs.filter((dof) => {
    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      term === "" ||
      dof.dof_code.toLowerCase().includes(term) ||
      dof.subject.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "Tümü" || dof.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Stack gap="lg">
      {/* Üst başlık + filtreler */}
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>Düzeltici Faaliyetler (DÖF)</Title>
          <Text c="dimmed" fz="sm">
            Şirketinizde açılmış tüm DÖF kayıtlarını görüntüleyin, filtreleyin
            ve detaylara hızlıca ulaşın.
          </Text>
        </Stack>

        <Stack gap="xs" align="flex-end">
          <Group gap="xs">
            <TextInput
              placeholder="Kodu veya konuyu ara..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              size="sm"
            />

            <Select
              size="sm"
              data={["Tümü", "Açık", "Değerlendirmede", "Kapalı", "Reddedildi"]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </Group>

          {permissions.dof_create && (
            <Button size="sm" onClick={() => navigate("/dof/new")} radius="md">
              Yeni DÖF Aç
            </Button>
          )}
        </Stack>
      </Group>

      {/* Liste */}
      <Paper withBorder shadow="sm" radius="md">
        {filteredDofs.length === 0 ? (
          <Text ta="center" p="xl" c="dimmed">
            Filtrelere uygun DÖF kaydı bulunamadı.
          </Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 140 }}>DÖF Kodu</Table.Th>
                <Table.Th>Konu</Table.Th>
                <Table.Th style={{ width: 150 }}>Oluşturma Tarihi</Table.Th>
                <Table.Th style={{ width: 130 }}>Durum</Table.Th>
                <Table.Th style={{ textAlign: "right", width: 120 }}>
                  Aksiyon
                </Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {filteredDofs.map((dof) => {
                const createdAt = toJsDate(dof.created_at);

                return (
                  <Table.Tr
                    key={dof.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/dof/${dof.id}`)}
                  >
                    <Table.Td>{dof.dof_code}</Table.Td>
                    <Table.Td>{dof.subject}</Table.Td>
                    <Table.Td>
                      {createdAt
                        ? createdAt.toLocaleDateString("tr-TR")
                        : "-"}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(dof.status)}
                        variant="light"
                      >
                        {dof.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td
                      style={{ textAlign: "right" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        component={Link}
                        to={`/dof/${dof.id}`}
                        variant="light"
                        size="xs"
                        radius="md"
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
    </Stack>
  );
}

export default DofList;
