// src/pages/KPIList.tsx

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

type KPI = {
  id: string;
  name: string;
  description?: string;
  unit: string;
  target_value: number;
  period: string; // "Aylık" | "Yıllık"
  department: string;
  responsible_user: string;
  created_at?: any;
  company_id: string;
};

function KPIList() {
  const { proqiaUser } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKpis = async () => {
    if (!proqiaUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "kpis"),
        orderBy("created_at", "desc")
        // İstersen company filtresi de ekleriz:
        // where("company_id", "==", proqiaUser.company_id)
      );
      const snap = await getDocs(q);

      const list: KPI[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<KPI, "id">),
      }));

      setKpis(list);
    } catch (err) {
      console.error("KPI listesi alınırken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
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
    <Box maw={900} mx="auto">
      <Title order={2} mb="xs">
        Hedefler / KPI Listesi
      </Title>
      <Text c="dimmed" mb="lg">
        Tanımlı hedeflerinizi ve hedef değerlerini buradan takip edebilirsiniz.
      </Text>

      {kpis.length === 0 ? (
        <Text c="dimmed">Henüz tanımlanmış bir KPI yok.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Hedef</Table.Th>
              <Table.Th>Departman</Table.Th>
              <Table.Th>Periyot</Table.Th>
              <Table.Th>Hedef Değer</Table.Th>
              <Table.Th>Oluşturulma</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {kpis.map((kpi) => (
              <Table.Tr key={kpi.id}>
                <Table.Td>{kpi.name}</Table.Td>
                <Table.Td>{kpi.department}</Table.Td>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={kpi.period === "Aylık" ? "blue" : "grape"}
                  >
                    {kpi.period}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {kpi.target_value} {kpi.unit}
                </Table.Td>
                <Table.Td>
                  {kpi.created_at?.toDate
                    ? kpi.created_at.toDate().toLocaleDateString("tr-TR")
                    : "-"}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  );
}

export default KPIList;
