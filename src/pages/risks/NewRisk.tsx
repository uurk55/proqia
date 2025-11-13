// src/pages/NewRisk.tsx

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
import { notifications } from "@mantine/notifications";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

function NewRisk() {
  const { proqiaUser, currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [riskType, setRiskType] = useState<string | null>("Süreç Riski");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [probability, setProbability] = useState<number | string>(3);
  const [impact, setImpact] = useState<number | string>(3);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proqiaUser || !currentUser) return;

    if (
      !name.trim() ||
      !riskType ||
      !department.trim() ||
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
        department: department.trim(),
        probability: prob,
        impact: imp,
        risk_score: riskScore,
        status: "Açık", // Açık / Kapalı / İzlemede gibi
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
    !department.trim() ||
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

            <TextInput
              required
              label="İlgili Departman / Süreç"
              placeholder="Örn: Pres, Boyahane, Eloksal, Satış"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
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
              disabled={isFormInvalid || isSubmitting}
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
