// src/pages/incidents/IncidentDetail.tsx

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
  shift?: string;
  injured_person?: string;
  immediate_action?: string;
  root_cause?: string;
  severity?: number;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getTypeColor = (type: string) => {
  if (type === "İş Kazası") return "red";
  if (type === "Ramak Kala") return "yellow";
  return "orange";
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

const getSeverityColor = (sev?: number) => {
  if (!sev || sev <= 1) return "teal";
  if (sev <= 3) return "orange";
  return "red";
};

function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { proqiaUser } = useAuth();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusValue, setStatusValue] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!incidentId) {
        setError("Kayıt ID bulunamadı.");
        setLoading(false);
        return;
      }
      if (!proqiaUser) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "incidents", incidentId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("İSG kaydı bulunamadı.");
          setLoading(false);
          return;
        }

        const data = snap.data() as any;

        if (data.company_id !== proqiaUser.company_id) {
          setError("Bu kayda erişim yetkiniz yok.");
          setLoading(false);
          return;
        }

        const loaded: Incident = {
          id: snap.id,
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
          shift: data.shift ?? "",
          injured_person: data.injured_person ?? "",
          immediate_action: data.immediate_action ?? "",
          root_cause: data.root_cause ?? "",
          severity: data.severity ?? undefined,
        };

        setIncident(loaded);
        setStatusValue(loaded.status);
      } catch (err) {
        console.error("İSG detayları yüklenemedi:", err);
        setError("İSG detayları yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [incidentId, proqiaUser]);

  const handleStatusUpdate = async () => {
    if (!incident || !statusValue) return;
    if (statusValue === incident.status) return;

    setStatusUpdating(true);
    try {
      const ref = doc(db, "incidents", incident.id);
      await updateDoc(ref, {
        status: statusValue,
        updated_at: Timestamp.now(),
      });

      setIncident({ ...incident, status: statusValue });

      notifications.show({
        title: "Durum güncellendi",
        message: "İSG kaydı durumu başarıyla güncellendi.",
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
        <Button mt="md" variant="default" onClick={() => navigate("/incidents")}>
          İSG Kayıt Listesine Dön
        </Button>
      </Box>
    );
  }

  if (!incident) {
    return (
      <Box maw={800} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Kayıt bulunamadı"
          color="yellow"
          mt="md"
        >
          Görüntülenecek İSG kaydı bulunamadı.
        </Alert>
        <Button mt="md" variant="default" onClick={() => navigate("/incidents")}>
          İSG Kayıt Listesine Dön
        </Button>
      </Box>
    );
  }

  const eventDate = toJsDate(incident.event_date);
  const createdAt = toJsDate(incident.created_at);

  return (
    <Box maw={900} mx="auto">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Group gap="sm">
            <Badge color={getTypeColor(incident.type)} variant="light">
              {incident.type}
            </Badge>
            <Title order={2}>{incident.title}</Title>
          </Group>
          <Text c="dimmed" fz="sm">
            {incident.location} • {incident.department}
          </Text>
        </Stack>

        <Stack gap={4} align="flex-end">
          <Text fz="xs" c="dimmed">
            Durum
          </Text>
          <Badge color={getStatusColor(incident.status)} variant="light">
            {incident.status}
          </Badge>
          {incident.severity !== undefined && (
            <>
              <Text fz="xs" c="dimmed" mt={4}>
                Olay Şiddeti
              </Text>
              <Badge color={getSeverityColor(incident.severity)} variant="filled">
                {incident.severity} / 5
              </Badge>
            </>
          )}
        </Stack>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Olay Tarihi
              </Text>
              <Text fz="sm">
                {eventDate ? eventDate.toLocaleDateString("tr-TR") : "-"}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Vardiya
              </Text>
              <Text fz="sm">{incident.shift || "-"}</Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Yaralanma Şiddeti
              </Text>
              <Text fz="sm">{incident.injury_severity || "Yok"}</Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Kayıt Oluşturma
              </Text>
              <Text fz="sm">
                {createdAt ? createdAt.toLocaleDateString("tr-TR") : "-"}
              </Text>
            </Stack>
          </Group>

          <Divider />

          {incident.injured_person && (
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Etkilenen Kişi
              </Text>
              <Text fz="sm">{incident.injured_person}</Text>
            </Stack>
          )}

          {incident.description && (
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Olay Açıklaması
              </Text>
              <Text fz="sm">{incident.description}</Text>
            </Stack>
          )}

          {incident.immediate_action && (
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                İlk / Anlık Alınan Aksiyonlar
              </Text>
              <Text fz="sm">{incident.immediate_action}</Text>
            </Stack>
          )}

          {incident.root_cause && (
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Kök Neden
              </Text>
              <Text fz="sm">{incident.root_cause}</Text>
            </Stack>
          )}

          <Divider />

          <Group justify="space-between" mt="sm">
            {/* Durum güncelleme alanı (permissions yokmuş gibi, her zaman göster) */}
            <Group>
              <Select
                label="Durumu Güncelle"
                data={["Açık", "İncelemede", "Kapalı"]}
                value={statusValue}
                onChange={setStatusValue}
                style={{ minWidth: 200 }}
              />
              <Button
                onClick={handleStatusUpdate}
                loading={statusUpdating}
                disabled={!statusValue || statusValue === incident.status}
              >
                Güncelle
              </Button>
            </Group>

            <Button variant="default" onClick={() => navigate("/incidents")}>
              İSG Kayıt Listesine Dön
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}

export default IncidentDetail;
