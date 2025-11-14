// src/pages/kpi/KPIDetail.tsx

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
  NumberInput,
  Select,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

type KPI = {
  id: string;
  name: string;
  description?: string;
  unit: string;
  target_value: number;
  period: string;
  department: string;
  responsible_user: string;
  current_value?: number | null;
  status?: string;
  company_id: string;
  created_at?: Timestamp | Date | null;
  last_update_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "Hedefte":
      return "teal";
    case "Riskte":
      return "orange";
    case "Geride":
      return "red";
    case "Takipte":
      return "blue";
    default:
      return "gray";
  }
};

function KPIDetail() {
  const { kpiId } = useParams<{ kpiId: string }>();
  const { proqiaUser } = useAuth();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Düzenlenecek alanlar
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editCurrentValue, setEditCurrentValue] = useState<number | string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!kpiId) {
        setError("KPI ID bulunamadı.");
        setLoading(false);
        return;
      }
      if (!proqiaUser) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "kpis", kpiId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("KPI kaydı bulunamadı.");
          setLoading(false);
          return;
        }

        const data = snap.data() as any;

        if (data.company_id !== proqiaUser.company_id) {
          setError("Bu KPI'ya erişim yetkiniz yok.");
          setLoading(false);
          return;
        }

        const loaded: KPI = {
          id: snap.id,
          name: data.name ?? "",
          description: data.description ?? "",
          unit: data.unit ?? "",
          target_value: data.target_value ?? 0,
          period: data.period ?? "",
          department: data.department ?? "",
          responsible_user: data.responsible_user ?? "",
          current_value: data.current_value ?? null,
          status: data.status ?? "Takipte",
          company_id: data.company_id ?? "",
          created_at: data.created_at ?? null,
          last_update_at: data.last_update_at ?? null,
        };

        setKpi(loaded);
        setEditStatus(loaded.status ?? "Takipte");
        setEditCurrentValue(
          loaded.current_value != null ? loaded.current_value : ""
        );
      } catch (err) {
        console.error("KPI detayları yüklenemedi:", err);
        setError("KPI detayları yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [kpiId, proqiaUser]);

  const handleSave = async () => {
    if (!kpi) return;

    setSaving(true);
    try {
      const ref = doc(db, "kpis", kpi.id);

      const currentValNumber =
        editCurrentValue === "" || editCurrentValue === null
          ? null
          : Number(editCurrentValue);

      await updateDoc(ref, {
        status: editStatus ?? kpi.status ?? "Takipte",
        current_value: currentValNumber,
        last_update_at: Timestamp.now(),
      });

      setKpi({
        ...kpi,
        status: editStatus ?? kpi.status,
        current_value: currentValNumber,
        last_update_at: Timestamp.now(),
      });

      notifications.show({
        title: "KPI güncellendi",
        message: "Durum ve gerçekleşen değer başarıyla kaydedildi.",
        color: "teal",
        icon: <IconCheck />,
      });
    } catch (err) {
      console.error("KPI güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "KPI güncellenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setSaving(false);
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
        <Button mt="md" variant="default" onClick={() => navigate("/kpis")}>
          KPI Listesine Dön
        </Button>
      </Box>
    );
  }

  if (!kpi) {
    return (
      <Box maw={800} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Kayıt bulunamadı"
          color="yellow"
          mt="md"
        >
          Görüntülenecek KPI kaydı bulunamadı.
        </Alert>
        <Button mt="md" variant="default" onClick={() => navigate("/kpis")}>
          KPI Listesine Dön
        </Button>
      </Box>
    );
  }

  const createdAt = toJsDate(kpi.created_at);
  const lastUpdateAt = toJsDate(kpi.last_update_at);

  return (
    <Box maw={900} mx="auto">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Title order={2}>{kpi.name}</Title>
          <Text c="dimmed" fz="sm">
            {kpi.department || "Departman belirtilmemiş"} •{" "}
            {kpi.responsible_user || "Sorumlu belirtilmemiş"}
          </Text>
        </Stack>

        <Stack gap={4} align="flex-end">
          <Text fz="xs" c="dimmed">
            Durum
          </Text>
          <Badge color={getStatusColor(kpi.status)} variant="light">
            {kpi.status || "Takipte"}
          </Badge>
          {createdAt && (
            <>
              <Text fz="xs" c="dimmed" mt={4}>
                Kayıt Tarihi
              </Text>
              <Text fz="sm">{createdAt.toLocaleDateString("tr-TR")}</Text>
            </>
          )}
          {lastUpdateAt && (
            <>
              <Text fz="xs" c="dimmed" mt={4}>
                Son Güncelleme
              </Text>
              <Text fz="sm">{lastUpdateAt.toLocaleDateString("tr-TR")}</Text>
            </>
          )}
        </Stack>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          {/* Hedef vs Gerçekleşen blokları */}
          <Group gap="xl">
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Hedef Değer
              </Text>
              <Text fz="sm">
                {kpi.target_value} {kpi.unit}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Gerçekleşen Değer
              </Text>
              <Text fz="sm">
                {kpi.current_value != null
                  ? `${kpi.current_value} ${kpi.unit}`
                  : "-"}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Periyot
              </Text>
              <Text fz="sm">{kpi.period || "-"}</Text>
            </Stack>
          </Group>

          {kpi.description && (
            <>
              <Divider />
              <Stack gap={4}>
                <Text fz="xs" c="dimmed">
                  Açıklama
                </Text>
                <Text fz="sm">{kpi.description}</Text>
              </Stack>
            </>
          )}

          <Divider />

          {/* DURUM YÖNETİMİ BLOĞU */}
          <Stack gap="xs">
            <Text fz="xs" c="dimmed">
              KPI Durum Yönetimi
            </Text>
            <Group align="flex-end">
              <NumberInput
                label="Gerçekleşen Değer"
                placeholder="Örn: 92"
                value={editCurrentValue ?? undefined}
                onChange={setEditCurrentValue}
                allowNegative={false}
                min={0}
                style={{ maxWidth: 180 }}
              />
              <Select
                label="Durum"
                data={["Takipte", "Hedefte", "Riskte", "Geride"]}
                value={editStatus}
                onChange={setEditStatus}
                style={{ minWidth: 180 }}
              />
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!editStatus}
              >
                Güncelle
              </Button>
            </Group>
            <Text fz="xs" c="dimmed">
              Örn: Aylık KPI toplantısında gerçekleşen değeri girip durumu
              "Hedefte / Riskte / Geride" olarak güncelleyebilirsiniz.
            </Text>
          </Stack>

          <Divider />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => navigate("/kpis")}>
              KPI Listesine Dön
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}

export default KPIDetail;
