// src/pages/trainings/TrainingDetail.tsx

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

type Training = {
  id: string;
  title: string;
  training_type: string;
  date?: Timestamp | Date | null;
  duration_hours?: number | null;
  trainer: string;
  location?: string;
  target_group: string;
  notes?: string;
  status: string;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Planlandı":
      return "blue";
    case "Gerçekleşti":
      return "teal";
    case "İptal":
      return "red";
    default:
      return "gray";
  }
};

function TrainingDetail() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const { proqiaUser } = useAuth();
  const navigate = useNavigate();

  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusValue, setStatusValue] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!trainingId) {
        setError("Eğitim ID bulunamadı.");
        setLoading(false);
        return;
      }
      if (!proqiaUser) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "trainings", trainingId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Eğitim kaydı bulunamadı.");
          setLoading(false);
          return;
        }

        const data = snap.data() as any;

        if (data.company_id !== proqiaUser.company_id) {
          setError("Bu eğitime erişim yetkiniz yok.");
          setLoading(false);
          return;
        }

        const loaded: Training = {
          id: snap.id,
          title: data.title ?? "",
          training_type: data.training_type ?? "",
          date: data.date ?? null,
          duration_hours: data.duration_hours ?? null,
          trainer: data.trainer ?? "",
          location: data.location ?? "",
          target_group: data.target_group ?? "",
          notes: data.notes ?? "",
          status: data.status ?? "Planlandı",
          company_id: data.company_id ?? "",
          created_at: data.created_at ?? null,
        };

        setTraining(loaded);
        setStatusValue(loaded.status);
      } catch (err) {
        console.error("Eğitim detayları yüklenemedi:", err);
        setError("Eğitim detayları yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [trainingId, proqiaUser]);

  const handleStatusUpdate = async () => {
    if (!training || !statusValue) return;
    if (statusValue === training.status) return;

    setStatusUpdating(true);
    try {
      const ref = doc(db, "trainings", training.id);
      await updateDoc(ref, {
        status: statusValue,
        updated_at: Timestamp.now(),
      });

      setTraining({ ...training, status: statusValue });

      notifications.show({
        title: "Durum güncellendi",
        message: "Eğitim durumu başarıyla güncellendi.",
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
        <Button
          mt="md"
          variant="default"
          onClick={() => navigate("/trainings")}
        >
          Eğitim Listesine Dön
        </Button>
      </Box>
    );
  }

  if (!training) {
    return (
      <Box maw={800} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Kayıt bulunamadı"
          color="yellow"
          mt="md"
        >
          Görüntülenecek eğitim kaydı bulunamadı.
        </Alert>
        <Button
          mt="md"
          variant="default"
          onClick={() => navigate("/trainings")}
        >
          Eğitim Listesine Dön
        </Button>
      </Box>
    );
  }

  const date = toJsDate(training.date);
  const createdAt = toJsDate(training.created_at);

  return (
    <Box maw={900} mx="auto">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Title order={2}>{training.title}</Title>
          <Text c="dimmed" fz="sm">
            {training.training_type} • {training.target_group}
          </Text>
        </Stack>

        <Stack gap={4} align="flex-end">
          <Text fz="xs" c="dimmed">
            Durum
          </Text>
          <Badge color={getStatusColor(training.status)} variant="light">
            {training.status}
          </Badge>
        </Stack>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Tarih
              </Text>
              <Text fz="sm">
                {date ? date.toLocaleDateString("tr-TR") : "-"}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Süre (saat)
              </Text>
              <Text fz="sm">
                {training.duration_hours != null
                  ? training.duration_hours
                  : "-"}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Eğitmen
              </Text>
              <Text fz="sm">{training.trainer}</Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Yer
              </Text>
              <Text fz="sm">{training.location || "-"}</Text>
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

          {training.notes && (
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Notlar / İçerik
              </Text>
              <Text fz="sm">{training.notes}</Text>
            </Stack>
          )}

          <Divider />

          <Group justify="space-between" mt="sm">
            <Group>
              <Select
                label="Durumu Güncelle"
                data={["Planlandı", "Gerçekleşti", "İptal"]}
                value={statusValue}
                onChange={setStatusValue}
                style={{ minWidth: 200 }}
              />
              <Button
                onClick={handleStatusUpdate}
                loading={statusUpdating}
                disabled={!statusValue || statusValue === training.status}
              >
                Güncelle
              </Button>
            </Group>

            <Button variant="default" onClick={() => navigate("/trainings")}>
              Eğitim Listesine Dön
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}

export default TrainingDetail;
