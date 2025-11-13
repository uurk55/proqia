// src/pages/IncidentList.tsx

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  Box,
  Title,
  Text,
  Table,
  Loader,
  Center,
  Badge,
} from "@mantine/core";
import { useAuth } from "../../context/AuthContext";

type Incident = {
  id: string;
  type: string;
  title: string;
  description?: string;
  location: string;
  department: string;
  event_date?: any;
  injury_severity?: string;
  status: string;
  company_id: string;
  created_at?: any;
};

function IncidentList() {
  const { proqiaUser } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    if (!proqiaUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "incidents"),
        orderBy("event_date", "desc")
      );
      const snap = await getDocs(q);

      const list: Incident[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Incident, "id">),
      }));

      setIncidents(list);
    } catch (err) {
      console.error("İSG listesi alınırken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proqiaUser]);

  const getTypeColor = (type: string) => {
    if (type === "İş Kazası") return "red";
    if (type === "Ramak Kala") return "yellow";
    return "orange"; // Tehlike Bildirimi
  };

  const getStatusColor = (status: string) => {
    if (status === "Açık") return "red";
    if (status === "İzlemede") return "yellow";
    return "green";
  };

  if (loading) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box maw={1000} mx="auto">
      <Title order={2} mb="xs">
        İSG Kayıt Listesi
      </Title>
      <Text c="dimmed" mb="lg">
        İş kazaları, ramak kala ve tehlike bildirimlerini buradan
        görüntüleyebilirsiniz.
      </Text>

      {incidents.length === 0 ? (
        <Text c="dimmed">Henüz kayıtlı bir İSG olayı yok.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tür</Table.Th>
              <Table.Th>Başlık</Table.Th>
              <Table.Th>Lokasyon</Table.Th>
              <Table.Th>Departman</Table.Th>
              <Table.Th>Tarih</Table.Th>
              <Table.Th>Yaralanma</Table.Th>
              <Table.Th>Durum</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {incidents.map((i) => (
              <Table.Tr key={i.id}>
                <Table.Td>
                  <Badge color={getTypeColor(i.type)} variant="light">
                    {i.type}
                  </Badge>
                </Table.Td>
                <Table.Td>{i.title}</Table.Td>
                <Table.Td>{i.location}</Table.Td>
                <Table.Td>{i.department}</Table.Td>
                <Table.Td>
                  {i.event_date?.toDate
                    ? i.event_date.toDate().toLocaleDateString("tr-TR")
                    : "-"}
                </Table.Td>
                <Table.Td>{i.injury_severity || "-"}</Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(i.status)} variant="light">
                    {i.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  );
}

export default IncidentList;
