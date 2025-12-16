// src/pages/trainings/NewTraining.tsx

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
  Alert,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconCalendar, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import "dayjs/locale/tr";
import { useCompanyOptions } from "../../hooks/useCompanyOptions";

function NewTraining() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [trainingType, setTrainingType] = useState<string | null>("İç Eğitim");
  const [date, setDate] = useState<Date | null>(null);
  const [durationHours, setDurationHours] = useState<number | string>(2);
  const [trainer, setTrainer] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>("Planlandı");

  // Şirket ayarlarından departman & lokasyon listeleri
  const {
    departments,
    locations,
    loading: optionsLoading,
    error: optionsError,
  } = useCompanyOptions();

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proqiaUser || !currentUser) return;

    if (
      !title.trim() ||
      !trainingType ||
      !date ||
      !trainer.trim() ||
      !targetGroup.trim() ||
      !department.trim()
    ) {
      notifications.show({
        title: "Eksik bilgi",
        message: "Lütfen zorunlu alanları doldurun.",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    const duration = durationHours === "" ? 0 : Number(durationHours);

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "trainings"), {
        company_id: proqiaUser.company_id,
        title: title.trim(),
        training_type: trainingType,
        date: Timestamp.fromDate(date),
        duration_hours: duration,
        trainer: trainer.trim(),
        location: location.trim(),
        department: department.trim(), // YENİ
        target_group: targetGroup.trim(),
        notes: notes.trim(),
        status: status || "Planlandı", // Planlandı / Gerçekleşti / İptal
        created_by: currentUser.uid,
        created_at: Timestamp.now(),
      });

      notifications.show({
        title: "Başarılı!",
        message: "Yeni eğitim kaydı oluşturuldu.",
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
    !date ||
    !trainer.trim() ||
    !targetGroup.trim() ||
    !department.trim();

  return (
    <Box maw={800} mx="auto">
      <Title order={2} mb="xs">
        Yeni Eğitim Kaydı
      </Title>
      <Text c="dimmed" mb="lg">
        Planlanan veya gerçekleştirilen eğitimleri sisteme kaydedin.
      </Text>

      <Paper withBorder shadow="sm" p="lg" radius="md">
        {optionsError && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            title="Uyarı"
            color="yellow"
            mb="md"
          >
            {optionsError} Departman ve lokasyon alanlarını manuel girebilirsiniz.
          </Alert>
        )}

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
                "İç Eğitim",
                "Dış Eğitim",
                "Oryantasyon",
                "İSG Eğitimi",
                "Çevre Eğitimi",
                "Teknik Eğitim",
                "Diğer",
              ]}
              value={trainingType}
              onChange={setTrainingType}
            />

            <Group grow align="flex-end">
              <DateInput
                required
                label="Eğitim Tarihi"
                placeholder="Tarih seçin"
                locale="tr"
                valueFormat="DD MMMM YYYY"
                value={date}
                onChange={(value) => setDate(value ? new Date(value) : null)}
                leftSection={<IconCalendar size={16} />}
                clearable
              />
              <NumberInput
                label="Süre (saat)"
                min={0.5}
                step={0.5}
                value={durationHours}
                onChange={setDurationHours}
              />
            </Group>

            <TextInput
              required
              label="Eğitmen"
              placeholder="Örn: Uğur Kapancı / Dış Danışman"
              value={trainer}
              onChange={(e) => setTrainer(e.target.value)}
            />

            {/* Departman & Lokasyon aynı satırda */}
            <Group grow align="flex-end">
              {departments.length > 0 ? (
                <Select
                  required
                  label="Departman"
                  placeholder={
                    optionsLoading
                      ? "Departmanlar yükleniyor..."
                      : "Departman seçin"
                  }
                  data={departments}
                  searchable
                  nothingFoundMessage={
                    optionsLoading ? "Yükleniyor..." : "Departman tanımlı değil"
                  }
                  value={department || null}
                  onChange={(val) => setDepartment(val ?? "")}
                />
              ) : (
                <TextInput
                  required
                  label="Departman"
                  placeholder="Örn: Üretim, Bakım, Kalite"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              )}

              {locations.length > 0 ? (
                <Select
                  label="Yer"
                  placeholder={
                    optionsLoading ? "Lokasyonlar yükleniyor..." : "Yer seçin"
                  }
                  data={locations}
                  searchable
                  nothingFoundMessage={
                    optionsLoading ? "Yükleniyor..." : "Lokasyon tanımlı değil"
                  }
                  value={location || null}
                  onChange={(val) => setLocation(val ?? "")}
                />
              ) : (
                <TextInput
                  label="Yer"
                  placeholder="Örn: Toplantı Salonu, Online, Eğitim Sınıfı"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              )}
            </Group>

            <TextInput
              required
              label="Hedef Grup"
              placeholder="Örn: Tüm Mavi Yaka, Tüm Beyaz Yaka, Yeni Başlayanlar"
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
            />

            <Textarea
              label="Notlar"
              placeholder="İçerik başlıkları, kullanılan materyaller, değerlendirme notları..."
              minRows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Select
              label="Durum"
              data={["Planlandı", "Gerçekleşti", "İptal"]}
              value={status}
              onChange={setStatus}
            />

            <Group justify="space-between" mt="md">
              <Button
                variant="default"
                type="button"
                onClick={() => navigate("/trainings")}
              >
                Eğitim Listesine Dön
              </Button>
              <Button
  type="submit"
  loading={isSubmitting}                    // ✅
  disabled={isFormInvalid || isSubmitting}  // ✅
>
  Eğitimi Kaydet
</Button>

            </Group>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewTraining;
