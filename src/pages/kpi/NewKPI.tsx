// src/pages/kpi/NewKPI.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  getDoc,
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
  NumberInput,
  Select,
  Button,
  Group,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

type GroupInputsProps = {
  unit: string;
  setUnit: (v: string) => void;
  targetValue: number | string;
  setTargetValue: (v: number | string) => void;
};

function GroupInputs({
  unit,
  setUnit,
  targetValue,
  setTargetValue,
}: GroupInputsProps) {
  return (
    <Group grow align="flex-end">
      <NumberInput
        required
        label="Hedef Değer"
        placeholder="Örn: 95"
        value={targetValue}
        onChange={setTargetValue}
        min={0}
      />
      <Select
        label="Birim"
        data={["%", "adet", "kWh", "saat", "ppm"]}
        value={unit}
        onChange={(v) => v && setUnit(v)}
      />
    </Group>
  );
}

function NewKPI() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("%");
  const [targetValue, setTargetValue] = useState<number | string>(0);
  const [period, setPeriod] = useState<string | null>("Aylık");
  const [department, setDepartment] = useState<string | null>(null);

  // Departmanlar şirket ayarlarından
  const [departments, setDepartments] = useState<string[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      if (!proqiaUser) {
        setSettingsLoading(false);
        return;
      }

      setSettingsLoading(true);
      setSettingsError("");
      try {
        const ref = doc(db, "company_settings", proqiaUser.company_id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data() as any;
          setDepartments(Array.isArray(data.departments) ? data.departments : []);
        } else {
          setDepartments([]);
        }
      } catch (err) {
        console.error("Şirket ayarları (departman) alınamadı:", err);
        setSettingsError(
          "Departman listesi yüklenirken bir hata oluştu. Yine de metin girişi yapabilirsiniz."
        );
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, [proqiaUser]);

  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proqiaUser || !currentUser) return;

    if (!name.trim() || !unit || !period || !(department || "").trim()) {
      notifications.show({
        title: "Eksik bilgi",
        message: "Hedef adı, birim, periyot ve departman zorunludur.",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "kpis"), {
        company_id: proqiaUser.company_id,
        name: name.trim(),
        description: description.trim(),
        unit,
        target_value: Number(targetValue),
        period, // "Aylık" | "Yıllık"
        department: (department || "").trim(),
        responsible_user: currentUser.uid,

        // DURUM / GERÇEKLEŞEN İÇİN ALANLAR
        status: "Takipte", // varsayılan KPI durumu
        current_value: null,
        last_update_at: null,

        created_at: Timestamp.now(),
      });

      notifications.show({
        title: "Başarılı!",
        message: "Yeni hedef (KPI) başarıyla kaydedildi.",
        color: "teal",
        icon: <IconCheck />,
      });

      navigate("/kpis");
    } catch (error) {
      console.error("KPI oluşturma hatası:", error);
      notifications.show({
        title: "Hata!",
        message: "Hedef kaydedilirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid =
    !name.trim() || !unit || !period || !(department || "").trim() || targetValue === "";

  return (
    <Box maw={800} mx="auto">
      <Title order={2} mb="xs">
        Yeni Hedef / KPI
      </Title>
      <Text c="dimmed" mb="lg">
        Süreç performansını takip etmek için yeni bir KPI tanımlayın.
      </Text>

      {settingsError && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Departman bilgisi"
          color="yellow"
          mb="sm"
        >
          {settingsError}
        </Alert>
      )}

      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateKPI}>
          <Stack gap="md">
            <TextInput
              required
              label="Hedef Adı"
              placeholder="Örn: Ürün iade oranı"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Textarea
              label="Açıklama"
              placeholder="Bu hedef neyi ifade ediyor?"
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <GroupInputs
              unit={unit}
              setUnit={setUnit}
              targetValue={targetValue}
              setTargetValue={setTargetValue}
            />

            <Select
              label="Periyot"
              required
              placeholder="Seçiniz"
              data={["Aylık", "Yıllık"]}
              value={period}
              onChange={setPeriod}
            />

            {departments.length > 0 ? (
              <Select
                required
                label="Sorumlu Departman"
                placeholder={
                  settingsLoading
                    ? "Departmanlar yükleniyor..."
                    : "Departman seçin"
                }
                data={departments}
                searchable
                nothingFoundMessage={
                  settingsLoading ? "Yükleniyor..." : "Departman tanımlı değil"
                }
                value={department}
                onChange={(val) => setDepartment(val ?? "")}
              />
            ) : (
              <TextInput
                required
                label="Sorumlu Departman"
                placeholder="Örn: Kalite, Üretim, Satış"
                value={department || ""}
                onChange={(e) => setDepartment(e.target.value)}
              />
            )}

            <Button
              type="submit"
              loading={isFormInvalid || isSubmitting}
              disabled={isFormInvalid || isSubmitting}
              size="md"
              mt="md"
            >
              Hedefi Kaydet
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewKPI;
