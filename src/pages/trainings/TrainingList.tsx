// src/pages/TrainingList.tsx

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

type Training = {
  id: string;
  title: string;
  type: string;
  description?: string;
  target_audience: string;
  planned_date?: any;
  duration_hours: number;
  status: string;
  company_id: string;
  created_at?: any;
};

function TrainingList() {
  const { proqiaUser } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrainings = async () => {
    if (!proqiaUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "trainings"),
        orderBy("planned_date", "asc")
      );
      const snap = await getDocs(q);

      const list: Training[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Training, "id">),
      }));

      setTrainings(list);
    } catch (err) {
      console.error("Eğitim listesi alınırken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proqiaUser]);

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
        Eğitim Listesi
      </Title>
      <Text c="dimmed" mb="lg">
        Planlanan ve gerçekleşen eğitimlerinizi buradan takip edebilirsiniz.
      </Text>

      {trainings.length === 0 ? (
        <Text c="dimmed">Henüz planlanmış bir eğitim yok.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Başlık</Table.Th>
              <Table.Th>Tür</Table.Th>
              <Table.Th>Hedef Grup</Table.Th>
              <Table.Th>Tarih</Table.Th>
              <Table.Th>Süre</Table.Th>
              <Table.Th>Durum</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {trainings.map((t) => (
              <Table.Tr key={t.id}>
                <Table.Td>{t.title}</Table.Td>
                <Table.Td>{t.type}</Table.Td>
                <Table.Td>{t.target_audience}</Table.Td>
                <Table.Td>
                  {t.planned_date?.toDate
                    ? t.planned_date.toDate().toLocaleDateString("tr-TR")
                    : "-"}
                </Table.Td>
                <Table.Td>{t.duration_hours} saat</Table.Td>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={
                      t.status === "Planlandı"
                        ? "blue"
                        : t.status === "Tamamlandı"
                        ? "green"
                        : "gray"
                    }
                  >
                    {t.status}
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

export default TrainingList;
