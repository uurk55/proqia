// src/pages/incidents/NewIncident.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
  NumberInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import "dayjs/locale/tr";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle, IconCalendar } from "@tabler/icons-react";

function NewIncident() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Temel alanlar
  const [type, setType] = useState<string | null>("İş Kazası");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(new Date());
  const [injurySeverity, setInjurySeverity] = useState<string | null>("Yok"); // Yok / Hafif / Ciddi

  // Yeni ek alanlar
  const [shift, setShift] = useState<string | null>("Vardiya Belirtilmedi");
  const [injuredPerson, setInjuredPerson] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [severity, setSeverity] = useState<number | string>(3); // 1–5 İSG şiddeti
  const [status, setStatus] = useState<string | null>("Açık"); // Açık / İncelemede / Kapalı

  // Şirket ayarlarından gelen listeler
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Departman / Lokasyonları Firestore'dan çek (departments & locations koleksiyonları)
  useEffect(() => {
    const loadSettings = async () => {
      if (!proqiaUser) {
        setSettingsLoading(false);
        return;
      }

      setSettingsLoading(true);

      try {
        // Departmanlar (sadece aktif)
        const deptSnap = await getDocs(
          query(
            collection(db, "departments"),
            where("company_id", "==", proqiaUser.company_id),
            where("is_active", "==", true)
          )
        );

        const deptNames = deptSnap.docs
          .map((d) => {
            const data = d.data() as any;
            return data.name as string | undefined;
          })
          .filter((name): name is string => !!name)
          .sort((a, b) => a.localeCompare(b, "tr"));

        setDepartmentOptions(deptNames);

        // Lokasyonlar (sadece aktif)
        const locSnap = await getDocs(
          query(
            collection(db, "locations"),
            where("company_id", "==", proqiaUser.company_id),
            where("is_active", "==", true)
          )
        );

        const locNames = locSnap.docs
          .map((d) => {
            const data = d.data() as any;
            return data.name as string | undefined;
          })
          .filter((name): name is string => !!name)
          .sort((a, b) => a.localeCompare(b, "tr"));

        setLocationOptions(locNames);
      } catch (err) {
        console.error("Departman / lokasyon listesi yüklenemedi:", err);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, [proqiaUser]);

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
      notifications.show({
        title: "Eksik bilgi",
        message:
          "Tür, başlık, açıklama, lokasyon, departman ve tarih zorunludur.",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    const severityValue = severity === "" ? 0 : Number(severity);

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
        injury_severity: injurySeverity,

        // Yeni alanlar
        shift: shift || "Vardiya Belirtilmedi",
        injured_person: injuredPerson.trim(),
        immediate_action: immediateAction.trim(),
        root_cause: rootCause.trim(),
        severity: severityValue,

        status: status || "Açık",
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
    <Box maw={900} mx="auto">
      <Title order={2} mb="xs">
        Yeni İSG Olayı / Kaza Kaydı
      </Title>
      <Text c="dimmed" mb="lg">
        İş kazası, ramak kala veya tehlike bildirimini detaylı şekilde kaydedin.
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
              {locationOptions.length > 0 ? (
                <Select
                  required
                  label="Lokasyon"
                  placeholder={
                    settingsLoading
                      ? "Lokasyonlar yükleniyor..."
                      : "Lokasyon seçin"
                  }
                  data={locationOptions}
                  searchable
                  nothingFoundMessage={
                    settingsLoading ? "Yükleniyor..." : "Lokasyon tanımlı değil"
                  }
                  value={location || null}
                  onChange={(val) => setLocation(val ?? "")}
                />
              ) : (
                <TextInput
                  required
                  label="Lokasyon"
                  placeholder="Örn: Pres 2 hattı, Boyahane, Eloksal hattı"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              )}

              {departmentOptions.length > 0 ? (
                <Select
                  required
                  label="Departman"
                  placeholder={
                    settingsLoading
                      ? "Departmanlar yükleniyor..."
                      : "Departman seçin"
                  }
                  data={departmentOptions}
                  searchable
                  nothingFoundMessage={
                    settingsLoading
                      ? "Yükleniyor..."
                      : "Departman tanımlı değil"
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
            </Group>

            <Group grow align="flex-end">
              <DateInput
                required
                label="Olay Tarihi"
                placeholder="Bir tarih seçin"
                value={eventDate}
                onChange={(value) =>
                  setEventDate(value ? new Date(value) : null)
                }
                locale="tr"
                valueFormat="DD MMMM YYYY"
                leftSection={<IconCalendar size={16} stroke={1.5} />}
              />
              <Select
                label="Vardiya"
                data={[
                  "Vardiya Belirtilmedi",
                  "1. Vardiya",
                  "2. Vardiya",
                  "3. Vardiya",
                  "Gündüz",
                ]}
                value={shift}
                onChange={setShift}
              />
            </Group>

            <Group grow align="flex-end">
              <Select
                label="Yaralanma Şiddeti"
                data={["Yok", "Hafif", "Ciddi"]}
                value={injurySeverity}
                onChange={setInjurySeverity}
              />
              <NumberInput
                label="Olay Şiddeti (1-5)"
                min={1}
                max={5}
                value={severity}
                onChange={(val) => setSeverity(val ?? "")}
              />
            </Group>

            <TextInput
              label="Etkilenen Kişi (varsa)"
              placeholder="Örn: Ali Yılmaz, Operatör"
              value={injuredPerson}
              onChange={(e) => setInjuredPerson(e.target.value)}
            />

            <Textarea
              label="İlk / Anlık Alınan Aksiyonlar"
              placeholder="Olay sonrası yapılan müdahaleler, durdurulan hatlar, alınan önlemler..."
              minRows={3}
              value={immediateAction}
              onChange={(e) => setImmediateAction(e.target.value)}
            />

            <Textarea
              label="Kök Neden (Varsa)"
              placeholder="Kök neden analizi sonuçları, 5N1K, balık kılçığı vb."
              minRows={2}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
            />

            <Select
              label="Durum"
              data={["Açık", "İncelemede", "Kapalı"]}
              value={status}
              onChange={setStatus}
            />

            <Group justify="space-between" mt="md">
              <Button
                variant="default"
                type="button"
                onClick={() => navigate("/incidents")}
              >
                İSG Kayıt Listesine Dön
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isFormInvalid || isSubmitting}
                size="md"
              >
                Kaydı Oluştur
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewIncident;
