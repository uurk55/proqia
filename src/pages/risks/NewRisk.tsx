// src/pages/risks/NewRisk.tsx

import { useState, useEffect } from "react";
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
  Alert,
  Center,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

type Department = {
  id: string;
  name: string;
  is_active: boolean;
};

function NewRisk() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [riskType, setRiskType] = useState<string | null>("Süreç Riski");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [probability, setProbability] = useState<number | string>(3);
  const [impact, setImpact] = useState<number | string>(3);

  // Departmanlar
  const [deptOptions, setDeptOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState("");

  // Şirket / kullanıcı yoksa
  if (!proqiaUser || !currentUser) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Departmanları Firestore'dan çek
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!proqiaUser) return;
      setDeptLoading(true);
      setDeptError("");

      try {
        const snap = await getDocs(
          query(
            collection(db, "departments"),
            where("company_id", "==", proqiaUser.company_id),
            where("is_active", "==", true)
          )
        );

        const list: Department[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name ?? "",
            is_active: data.is_active ?? true,
          };
        });

        list.sort((a, b) => a.name.localeCompare(b.name));

        setDeptOptions(
          list.map((d) => ({
            value: d.name,
            label: d.name,
          }))
        );

        // Eğer hiç departman yoksa, uyarı göstereceğiz (UI'da)
      } catch (err) {
        console.error("Departman listesi alınamadı:", err);
        setDeptError("Departmanlar alınırken bir hata oluştu.");
      } finally {
        setDeptLoading(false);
      }
    };

    fetchDepartments();
  }, [proqiaUser]);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proqiaUser || !currentUser) return;

    if (
      !name.trim() ||
      !riskType ||
      !department ||
      probability === "" ||
      impact === ""
    ) {
      return;
    }

    const prob = Number(probability);
    const imp = Number(impact);
    const riskScore = prob * imp;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "risks"), {
        company_id: proqiaUser.company_id,
        name: name.trim(),
        type: riskType,
        description: description.trim(),
        department: department, // Select'ten gelen ad
        probability: prob,
        impact: imp,
        risk_score: riskScore,
        status: "Açık", // Açık / Kapalı / İzlemede
        created_by: currentUser.uid,
        created_at: Timestamp.now(),
      });

      notifications.show({
        title: "Başarılı!",
        message: "Yeni risk kaydı oluşturuldu.",
        color: "teal",
        icon: <IconCheck />,
      });

      navigate("/risks"); // Risk listesi sayfası
    } catch (error) {
      console.error("Risk oluşturma hatası:", error);
      notifications.show({
        title: "Hata!",
        message: "Risk kaydedilirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormInvalid =
    !name.trim() ||
    !riskType ||
    !department ||
    probability === "" ||
    impact === "";

  return (
    <Box maw={800} mx="auto">
      <Title order={2} mb="xs">
        Yeni Risk Kaydı
      </Title>
      <Text c="dimmed" mb="lg">
        Süreç, çevre, İSG veya enerji ile ilgili yeni bir risk tanımlayın.
      </Text>

      {/* Departmanlar alınırken hata varsa göster */}
      {deptError && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Departmanlar yüklenemedi"
          color="red"
          mb="md"
        >
          {deptError}
        </Alert>
      )}

      <Paper withBorder shadow="sm" p="lg" radius="md">
        <form onSubmit={handleCreateRisk}>
          <Stack gap="md">
            <TextInput
              required
              label="Risk Başlığı"
              placeholder="Örn: Pres hattında iş kazası riski"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Select
              label="Risk Türü"
              required
              data={[
                "Süreç Riski",
                "Çevresel Risk",
                "İSG Riski",
                "Enerji Riski",
                "Diğer",
              ]}
              value={riskType}
              onChange={setRiskType}
            />

            <Textarea
              label="Açıklama"
              placeholder="Riskin tanımı, olası nedenler, etkiler..."
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Select
              label="İlgili Departman / Süreç"
              required
              placeholder={
                deptLoading
                  ? "Departmanlar yükleniyor..."
                  : deptOptions.length === 0
                  ? "Henüz departman tanımlanmamış. Şirket Ayarları'ndan ekleyin."
                  : "Bir departman seçin"
              }
              data={deptOptions}
              value={department}
              onChange={setDepartment}
              searchable
              nothingFoundMessage="Uyan departman bulunamadı"
              disabled={deptLoading || deptOptions.length === 0}
            />

            <Group grow align="flex-end">
              <NumberInput
                required
                label="Olasılık (1-5)"
                min={1}
                max={5}
                value={probability}
                onChange={setProbability}
              />
              <NumberInput
                required
                label="Şiddet (1-5)"
                min={1}
                max={5}
                value={impact}
                onChange={setImpact}
              />
            </Group>

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={
                isFormInvalid || isSubmitting || deptOptions.length === 0
              }
              size="md"
              mt="md"
            >
              Riski Kaydet
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default NewRisk;
