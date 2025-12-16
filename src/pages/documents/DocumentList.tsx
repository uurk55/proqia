// src/pages/DocumentList.tsx

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
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
} from "@mantine/core";
import { IconSearch, IconAlertCircle } from "@tabler/icons-react";
import { Link } from "react-router-dom";

/* 🔹 Firestore’daki GERÇEK status değerleri */
type EnStatus = "draft" | "pending" | "published" | "canceled" | string;

type DocumentItem = {
  id: string;
  code: string;
  title: string;
  type: string;
  status: EnStatus;
  owner_department?: string;
  created_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

/* 🔹 EN → TR */
const statusTR = (status: EnStatus) => {
  switch (status) {
    case "published":
      return "Yayınlandı";
    case "pending":
      return "Onay Bekliyor";
    case "draft":
      return "Taslak";
    case "canceled":
      return "İptal";
    default:
      return status;
  }
};

const statusColor = (status: EnStatus) => {
  switch (status) {
    case "published":
      return "teal";
    case "pending":
      return "blue";
    case "draft":
      return "gray";
    case "canceled":
      return "red";
    default:
      return "gray";
  }
};

function DocumentList() {
  const { proqiaUser, permissions } = useAuth();

  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!permissions?.doc_view_list) {
      setLoading(false);
      setError("Yayınlanmış dokümanları görme yetkiniz yok.");
      return;
    }
    if (!proqiaUser) return;

    const fetchDocuments = async () => {
      setLoading(true);
      setError("");

      try {
        const q = query(
          collection(db, "documents"),
          where("company_id", "==", proqiaUser.company_id),
          where("status", "==", "published") // ✅ DOĞRU
        );

        const snap = await getDocs(q);

        const list: DocumentItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            code: data.code ?? "",
            title: data.title ?? "",
            type: data.type ?? "",
            status: data.status ?? "draft",
            owner_department: data.owner_department ?? "",
            created_at: data.created_at ?? null,
          };
        });

        setAllDocuments(list);
        setFilteredDocuments(list);
      } catch (err) {
        console.error("Doküman listesi alınamadı:", err);
        setError("Dokümanlar çekilemedi.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [proqiaUser, permissions]);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    setFilteredDocuments(
      allDocuments.filter((d) =>
        !term
          ? true
          : d.code.toLowerCase().includes(term) ||
            d.title.toLowerCase().includes(term) ||
            d.type.toLowerCase().includes(term) ||
            (d.owner_department || "").toLowerCase().includes(term)
      )
    );
  }, [searchTerm, allDocuments]);

  if (loading) {
    return <Loader size="lg" style={{ margin: "150px auto" }} />;
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle />} title="Hata" color="red">
        {error}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>Doküman Kütüphanesi</Title>
          <Text c="dimmed">
            Yayınlanmış ve güncel dokümanlar
          </Text>
        </Stack>

        <TextInput
          placeholder="Ara..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          w={320}
        />
      </Group>

      <Paper withBorder shadow="sm" radius="md">
        {filteredDocuments.length === 0 ? (
          <Text ta="center" p="xl" c="dimmed">
            Yayınlanmış doküman yok.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Kod</Table.Th>
                <Table.Th>Ad</Table.Th>
                <Table.Th>Tür</Table.Th>
                <Table.Th>Departman</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th>Tarih</Table.Th>
                <Table.Th align="right">Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDocuments.map((d) => {
                const createdAt = toJsDate(d.created_at);
                return (
                  <Table.Tr key={d.id}>
                    <Table.Td>{d.code}</Table.Td>
                    <Table.Td>{d.title}</Table.Td>
                    <Table.Td>{d.type}</Table.Td>
                    <Table.Td>{d.owner_department || "-"}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={statusColor(d.status)}
                      >
                        {statusTR(d.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {createdAt
                        ? createdAt.toLocaleDateString("tr-TR")
                        : "-"}
                    </Table.Td>
                    <Table.Td align="right">
                      <Button
                        component={Link}
                        to={`/doc/${d.id}`}
                        size="xs"
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

export default DocumentList;
