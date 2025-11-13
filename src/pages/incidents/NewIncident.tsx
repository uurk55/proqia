// src/pages/NewIncident.tsx

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
  Select,
  Button,
  Group,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import "dayjs/locale/tr";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle, IconCalendar } from "@tabler/icons-react";

function NewIncident() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<string | null>("İş Kazası");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(new Date());
  const [injurySeverity, setInjurySeverity] = useState<string | null>("Yok"); // Yok / Hafif / Ciddi

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proqiaUser || !currentUser) return;

    if (
      !type ||
      !title.trim() ||
      !description.trim() ||
      !location.trim() ||
      !department.trim() ||
      !eventDate
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "incidents"), {
        company_id: proqiaUser.company_id,
        type, // İş Kazası / Ramak Kala / Tehlike Bildirimi
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        department: department.trim(),
        event_date: Timestamp.fromDate(eventDate),
        injury_severity: injurySeverity, // Yok / Hafif / Ciddi
        status: "Açık", // Açık / Kapalı
        created_by: currentUser.uid,
        created_at: Timestamp.now(),
      });

      notifications.show({
        title: "Başarılı!",
        message: "Yeni İSG kaydı oluşturuldu.",
        color: "teal",
        icon: <IconCheck />,
      });

      navigate("/incidents");
    } catch (error) {
      console.error("İSG kaydı oluşturma hatası:", error);
      notifications.show({
        title: "Hata!",
        message: "Kayıt oluşturulurken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid =
    !type ||
    !title.trim() ||
    !description.trim() ||
    !location.trim() ||
    !department.trim() ||
    !eventDate;

  return (
    <Box maw={800} mx="auto">
      <Title order={2} mb="xs">
        Yeni İSG Kaydı
      </Title>
      <Text c="dimmed" mb="lg">
        İş kazası, ramak kala veya tehlike bildirimini kaydedin.
      </Text>

      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateIncident}>
          <Stack gap="md">
            <Select
              label="Kayıt Türü"
              required
              data={["İş Kazası", "Ramak Kala", "Tehlike Bildirimi"]}
              value={type}
              onChange={setType}
            />

            <TextInput
              required
              label="Başlık"
              placeholder="Örn: Pres hattında el sıkışması riski"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Textarea
              required
              label="Olayın Açıklaması"
              placeholder="Olayın nasıl gerçekleştiği, nedenleri, alınan ilk aksiyonlar..."
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Group grow align="flex-end">
              <TextInput
                required
                label="Lokasyon"
                placeholder="Örn: Pres 2 hattı, Boyahane, Eloksal hattı"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <TextInput
                required
                label="Departman"
                placeholder="Örn: Üretim, Bakım, Kalite"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Group>

            <Group grow align="flex-end">
              <DateInput
                required
                label="Olay Tarihi"
                placeholder="Bir tarih seçin"
                value={eventDate}
                onChange={(value) => setEventDate(value ? new Date(value) : null)}
                locale="tr"
                valueFormat="DD MMMM YYYY"
                leftSection={<IconCalendar size={16} stroke={1.5} />}
              />
              <Select
                label="Yaralanma Şiddeti"
                data={["Yok", "Hafif", "Ciddi"]}
                value={injurySeverity}
                onChange={setInjurySeverity}
              />
            </Group>

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isFormInvalid || isSubmitting}
              size="md"
              mt="md"
            >
              Kaydı Oluştur
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewIncident;
