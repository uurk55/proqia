// src/pages/risks/RiskDetail.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Loader,
  Center,
  Alert,
  Button,
  Divider,
  Select,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

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

function RiskDetail() {
  const { riskId } = useParams<{ riskId: string }>();
  const { proqiaUser } = useAuth();
  const navigate = useNavigate();

  const [risk, setRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusValue, setStatusValue] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!riskId) {
        setError("Risk ID bulunamadı.");
        setLoading(false);
        return;
      }
      if (!proqiaUser) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "risks", riskId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Risk kaydı bulunamadı.");
          setLoading(false);
          return;
        }

        const data = snap.data() as any;

        // Kullanıcının şirketine ait mi kontrol et
        if (data.company_id !== proqiaUser.company_id) {
          setError("Bu riske erişim yetkiniz yok.");
          setLoading(false);
          return;
        }

        const loadedRisk: Risk = {
          id: snap.id,
          name: data.name ?? "",
          type: data.type ?? "",
          description: data.description ?? "",
          department: data.department ?? "",
          probability: data.probability ?? 0,
          impact: data.impact ?? 0,
          risk_score:
            data.risk_score ??
            (data.probability ?? 0) * (data.impact ?? 0),
          status: data.status ?? "Açık",
          created_at: data.created_at ?? null,
          company_id: data.company_id ?? "",
        };

        setRisk(loadedRisk);
        setStatusValue(loadedRisk.status);
      } catch (err) {
        console.error("Risk detayları yüklenemedi:", err);
        setError("Risk detayları yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [riskId, proqiaUser]);

  const handleStatusUpdate = async () => {
    if (!risk || !statusValue) return;
    if (statusValue === risk.status) return;

    setStatusUpdating(true);
    try {
      const ref = doc(db, "risks", risk.id);
      await updateDoc(ref, {
        status: statusValue,
        updated_at: Timestamp.now(),
      });

      setRisk({ ...risk, status: statusValue });

      notifications.show({
        title: "Durum güncellendi",
        message: "Risk durumu başarıyla güncellendi.",
        color: "teal",
        icon: <IconCheck />,
      });
    } catch (err) {
      console.error("Durum güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Durum güncellenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Box maw={800} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Hata!"
          color="red"
          mt="md"
        >
          {error}
        </Alert>
        <Button mt="md" variant="default" onClick={() => navigate("/risks")}>
          Risk Listesine Dön
        </Button>
      </Box>
    );
  }

  if (!risk) {
    return (
      <Box maw={800} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Kayıt bulunamadı"
          color="yellow"
          mt="md"
        >
          Görüntülenecek risk kaydı bulunamadı.
        </Alert>
        <Button mt="md" variant="default" onClick={() => navigate("/risks")}>
          Risk Listesine Dön
        </Button>
      </Box>
    );
  }

  const createdAt = toJsDate(risk.created_at);

  return (
    <Box maw={900} mx="auto">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Title order={2}>{risk.name}</Title>
          <Text c="dimmed" fz="sm">
            {risk.department} • {risk.type}
          </Text>
        </Stack>

        <Group align="flex-end">
          <Stack gap={2} align="flex-end">
            <Text fz="xs" c="dimmed">
              Risk Skoru
            </Text>
            <Badge color={getRiskColor(risk.risk_score)} size="lg" radius="md">
              {risk.risk_score} ({getRiskLabel(risk.risk_score)})
            </Badge>
          </Stack>
        </Group>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Tür
              </Text>
              <Badge variant="light">{risk.type}</Badge>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Departman / Süreç
              </Text>
              <Text fz="sm">{risk.department}</Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Durum
              </Text>
              <Badge color={getStatusColor(risk.status)} variant="light">
                {risk.status}
              </Badge>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Oluşturulma
              </Text>
              <Text fz="sm">
                {createdAt ? createdAt.toLocaleDateString("tr-TR") : "-"}
              </Text>
            </Stack>
          </Group>

          <Divider />

          {risk.description && (
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Açıklama
              </Text>
              <Text fz="sm">{risk.description}</Text>
            </Stack>
          )}

          <Group gap="xl">
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Olasılık
              </Text>
              <Text fz="sm">{risk.probability}</Text>
            </Stack>
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Şiddet
              </Text>
              <Text fz="sm">{risk.impact}</Text>
            </Stack>
          </Group>

          <Divider />

          {/* Durum Güncelleme Alanı */}
          <Group justify="space-between" mt="sm">
            <Group>
              <Select
                label="Durumu Güncelle"
                data={["Açık", "İzlemede", "Kapalı"]}
                value={statusValue}
                onChange={setStatusValue}
                style={{ minWidth: 200 }}
              />
              <Button
                onClick={handleStatusUpdate}
                loading={statusUpdating}
                disabled={!statusValue || statusValue === risk.status}
              >
                Güncelle
              </Button>
            </Group>

            <Button variant="default" onClick={() => navigate("/risks")}>
              Risk Listesine Dön
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}

export default RiskDetail;
