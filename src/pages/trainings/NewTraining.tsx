// src/pages/NewTraining.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Button,
  Group,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import "dayjs/locale/tr";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle, IconCalendar } from "@tabler/icons-react";

function NewTraining() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [trainingType, setTrainingType] = useState<string | null>("Kalite Eğitimi");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [plannedDate, setPlannedDate] = useState<Date | null>(null);
  const [durationHours, setDurationHours] = useState<number | string>(2);

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proqiaUser || !currentUser) return;

    if (
      !title.trim() ||
      !trainingType ||
      !targetAudience.trim() ||
      !plannedDate ||
      durationHours === ""
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "trainings"), {
        company_id: proqiaUser.company_id,
        title: title.trim(),
        type: trainingType,
        description: description.trim(),
        target_audience: targetAudience.trim(),
        planned_date: Timestamp.fromDate(plannedDate),
        duration_hours: Number(durationHours),
        status: "Planlandı", // Planlandı / Tamamlandı / İptal gibi
        created_by: currentUser.uid,
        created_at: Timestamp.now(),
      });

      notifications.show({
        title: "Başarılı!",
        message: "Yeni eğitim planı kaydedildi.",
        color: "teal",
        icon: <IconCheck />,
      });

      navigate("/trainings");
    } catch (error) {
      console.error("Eğitim oluşturma hatası:", error);
      notifications.show({
        title: "Hata!",
        message: "Eğitim kaydedilirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid =
    !title.trim() ||
    !trainingType ||
    !targetAudience.trim() ||
    !plannedDate ||
    durationHours === "";

  return (
    <Box maw={800} mx="auto">
      <Title order={2} mb="xs">
        Yeni Eğitim Planı
      </Title>
      <Text c="dimmed" mb="lg">
        Personel için yeni bir eğitim planı oluşturun.
      </Text>

      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateTraining}>
          <Stack gap="md">
            <TextInput
              required
              label="Eğitim Başlığı"
              placeholder="Örn: ISO 9001 Farkındalık Eğitimi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Select
              label="Eğitim Türü"
              required
              data={[
                "Kalite Eğitimi",
                "Çevre Eğitimi",
                "İSG Eğitimi",
                "Enerji Yönetimi Eğitimi",
                "Oryantasyon",
                "Diğer",
              ]}
              value={trainingType}
              onChange={setTrainingType}
            />

            <Textarea
              label="Açıklama"
              placeholder="Eğitim içeriği, amacı, kapsamı..."
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <TextInput
              required
              label="Hedef Katılımcı Grubu"
              placeholder="Örn: Yeni başlayanlar, tüm personel, bakım ekibi"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />

            <Group grow align="flex-end">
              <DateInput
                required
                label="Planlanan Tarih"
                placeholder="Bir tarih seçin"
                value={plannedDate}
                onChange={(value) => setPlannedDate(value ? new Date(value) : null)}
                locale="tr"
                valueFormat="DD MMMM YYYY"
                leftSection={<IconCalendar size={16} stroke={1.5} />}
                clearable
              />
              <NumberInput
                required
                label="Süre (saat)"
                min={1}
                value={durationHours}
                onChange={setDurationHours}
              />
            </Group>

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isFormInvalid || isSubmitting}
              size="md"
              mt="md"
            >
              Eğitimi Kaydet
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewTraining;
