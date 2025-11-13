// src/pages/RiskList.tsx

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
  created_at?: any;
  company_id: string;
};

function RiskList() {
  const { proqiaUser } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRisks = async () => {
    if (!proqiaUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "risks"),
        orderBy("created_at", "desc")
        // İstersen ileride company filtre ekleyebiliriz:
        // where("company_id", "==", proqiaUser.company_id)
      );
      const snap = await getDocs(q);

      const list: Risk[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Risk, "id">),
      }));

      setRisks(list);
    } catch (err) {
      console.error("Risk listesi alınırken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proqiaUser]);

  const getRiskColor = (score: number) => {
    if (score <= 5) return "green";
    if (score <= 10) return "yellow";
    return "red";
  };

  const getRiskLabel = (score: number) => {
    if (score <= 5) return "Düşük";
    if (score <= 10) return "Orta";
    return "Yüksek";
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
        Risk Listesi
      </Title>
      <Text c="dimmed" mb="lg">
        Tanımlı riskleri, türlerini ve risk seviyelerini buradan takip
        edebilirsiniz.
      </Text>

      {risks.length === 0 ? (
        <Text c="dimmed">Henüz tanımlanmış bir risk yok.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
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
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {risks.map((risk) => (
              <Table.Tr key={risk.id}>
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
                    color={risk.status === "Açık" ? "red" : "gray"}
                    variant="light"
                  >
                    {risk.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {risk.created_at?.toDate
                    ? risk.created_at.toDate().toLocaleDateString("tr-TR")
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

export default RiskList;
