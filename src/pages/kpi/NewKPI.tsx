// src/pages/kpi/NewKPI.tsx

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
  NumberInput,
  Select,
  Button,
  Group,
  NativeSelect,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

// ---------------- Grup içi component ----------------

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

// ---------------- Ana component ----------------

function NewKPI() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("%");
  const [targetValue, setTargetValue] = useState<number | string>(0);
  const [period, setPeriod] = useState<string | null>("Aylık");
  const [department, setDepartment] = useState("");

  // Departman listesi (Company Settings > Departments)
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);

  // Departmanları çek – Yeni Eğitim / Yeni İSG ile aynı mantık
  useEffect(() => {
    const loadDepartments = async () => {
      if (!proqiaUser) {
        setDeptLoading(false);
        return;
      }

      try {
        const snap = await getDocs(
          query(
            collection(db, "departments"),
            where("company_id", "==", proqiaUser.company_id),
            where("is_active", "==", true)
          )
        );

        const list = snap.docs
          .map((d) => (d.data() as any).name as string)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "tr"));

        setDepartmentOptions(list);
      } catch (err) {
        console.error("Departman listesi alınamadı (KPI):", err);
        notifications.show({
          title: "Uyarı",
          message:
            "Departman listesi alınırken bir sorun oluştu. Departmanı elle yazabilirsiniz.",
          color: "yellow",
          icon: <IconAlertCircle />,
        });
      } finally {
        setDeptLoading(false);
      }
    };

    loadDepartments();
  }, [proqiaUser]);

  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proqiaUser || !currentUser) return;

    if (!name.trim() || !unit || !period || !department.trim()) {
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
        department: department.trim(),
        responsible_user: currentUser.uid,

        // DURUM / GERÇEKLEŞEN İÇİN ALANLAR
        status: "Takipte", // varsayılan KPI durumu
        current_value: null, // henüz gerçekleşen yok
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
    !name.trim() || !unit || !period || !department.trim() || targetValue === "";

  return (
    <Box maw={800} mx="auto">
      <Title order={2} mb="xs">
        Yeni Hedef / KPI
      </Title>
      <Text c="dimmed" mb="lg">
        Süreç performansını takip etmek için yeni bir KPI tanımlayın.
      </Text>

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

            {/* Departman Select – diğer modüllerle aynı mantık */}
            {/* Sorumlu Departman */}
{departmentOptions.length > 0 ? (
  <NativeSelect
    required
    label="Sorumlu Departman"
    data={["Departman seçin", ...departmentOptions]}
    value={department || "Departman seçin"}
    onChange={(e) => {
      const val = e.currentTarget.value;
      setDepartment(val === "Departman seçin" ? "" : val);
    }}
  />
) : (
  <TextInput
    required
    label="Sorumlu Departman"
    placeholder="Örn: Kalite, Üretim, Satış"
    value={department}
    onChange={(e) => setDepartment(e.target.value)}
    description={
      deptLoading
        ? "Departmanlar yükleniyor..."
        : "Şirket ayarlarında departman tanımlı değilse buraya manuel yazabilirsiniz."
    }
  />
)}


            <Button
              type="submit"
              loading={isSubmitting}
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
