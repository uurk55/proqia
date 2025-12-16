// src/pages/kpi/KPIDetail.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
  Table,
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
  status: string; // Takipte / Hedefte / Geride
  current_value?: number | null;
  last_update_at?: Timestamp | Date | null;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

type KPIHistoryItem = {
  id: string;
  kpi_id: string;
  value: number;
  date?: Timestamp | Date | null;
  status?: string | null;
  recorded_by?: string | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Timestamp ? value.toDate() : value;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Hedefte":
      return "teal";
    case "Takipte":
      return "blue";
    case "Geride":
      return "red";
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

  const [editCurrentValue, setEditCurrentValue] = useState<number | string>("");
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<KPIHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // KPI + tarihçe çek
  useEffect(() => {
    const loadData = async () => {
      if (!kpiId) {
        setError("KPI ID bulunamadı.");
        setLoading(false);
        setHistoryLoading(false);
        return;
      }
      if (!proqiaUser) {
        setLoading(false);
        setHistoryLoading(false);
        return;
      }

      try {
        const ref = doc(db, "kpis", kpiId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("KPI kaydı bulunamadı.");
          setLoading(false);
          setHistoryLoading(false);
          return;
        }

        const data = snap.data() as any;

        if (data.company_id !== proqiaUser.company_id) {
          setError("Bu KPI kaydına erişim yetkiniz yok.");
          setLoading(false);
          setHistoryLoading(false);
          return;
        }

        const loaded: KPI = {
          id: snap.id,
          name: data.name ?? "",
          description: data.description ?? "",
          unit: data.unit ?? "",
          target_value: Number(data.target_value ?? 0),
          period: data.period ?? "",
          department: data.department ?? "",
          responsible_user: data.responsible_user ?? "",
          status: data.status ?? "Takipte",
          current_value:
            typeof data.current_value === "number"
              ? data.current_value
              : data.current_value != null
              ? Number(data.current_value)
              : null,
          last_update_at: data.last_update_at ?? null,
          company_id: data.company_id ?? "",
          created_at: data.created_at ?? null,
        };

        setKpi(loaded);
        setEditCurrentValue(
          loaded.current_value != null ? loaded.current_value : ""
        );
        setEditStatus(loaded.status);

        // KPI tarihçesini çek
        const valuesSnap = await getDocs(
          query(
            collection(db, "kpi_values"),
            where("kpi_id", "==", snap.id)
          )
        );

        const histList: KPIHistoryItem[] = valuesSnap.docs.map((d) => {
          const hData = d.data() as any;
          return {
            id: d.id,
            kpi_id: hData.kpi_id ?? snap.id,
            value: Number(hData.value ?? 0),
            date: hData.date ?? null,
            status: hData.status ?? null,
            recorded_by: hData.recorded_by ?? null,
          };
        });

        // Tarihe göre sırala (eski → yeni)
        histList.sort((a, b) => {
          const da = toJsDate(a.date)?.getTime() ?? 0;
          const dbt = toJsDate(b.date)?.getTime() ?? 0;
          return da - dbt;
        });

        setHistory(histList);
      } catch (err) {
        console.error("KPI detayları / tarihçe yüklenemedi:", err);
        setError("KPI detayları yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
        setHistoryLoading(false);
      }
    };

    loadData();
  }, [kpiId, proqiaUser]);

  const handleSave = async () => {
    if (!kpi) return;

    const numericCurrent =
      editCurrentValue === "" ? null : Number(editCurrentValue);

    let newStatus = editStatus || kpi.status;

    // Eğer kullanıcı status seçmediyse ve değer girildiyse otomatik hesapla
    if (!editStatus && numericCurrent != null && kpi.target_value > 0) {
      const ratio = numericCurrent / kpi.target_value;
      if (ratio >= 1) newStatus = "Hedefte";
      else if (ratio >= 0.9) newStatus = "Takipte";
      else newStatus = "Geride";
    }

    setSaving(true);
    try {
      const ref = doc(db, "kpis", kpi.id);
      const now = Timestamp.now();

      await updateDoc(ref, {
        current_value: numericCurrent,
        status: newStatus,
        last_update_at: now,
      });

      // Ana KPI state'i güncelle
      setKpi({
        ...kpi,
        current_value: numericCurrent,
        status: newStatus,
        last_update_at: now,
      });

      // Gerçekleşen değer girildiyse tarihçeye ekle
      if (numericCurrent != null) {
        const historyRef = await addDoc(collection(db, "kpi_values"), {
          kpi_id: kpi.id,
          value: numericCurrent,
          date: now,
          status: newStatus,
          recorded_by: proqiaUser?.full_name || proqiaUser?.email || null,
          company_id: kpi.company_id,
        });

        const newHistoryItem: KPIHistoryItem = {
          id: historyRef.id,
          kpi_id: kpi.id,
          value: numericCurrent,
          date: now,
          status: newStatus,
          recorded_by: proqiaUser?.full_name || proqiaUser?.email || null,
        };

        setHistory((prev) => {
          const updated = [...prev, newHistoryItem];
          updated.sort((a, b) => {
            const da = toJsDate(a.date)?.getTime() ?? 0;
            const dbt = toJsDate(b.date)?.getTime() ?? 0;
            return da - dbt;
          });
          return updated;
        });
      }

      notifications.show({
        title: "KPI güncellendi",
        message: "Gerçekleşen değer ve durum başarıyla kaydedildi.",
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
  const diff =
    kpi.current_value != null ? kpi.current_value - kpi.target_value : null;

  // Trend özeti için son değerler
  const lastValues = history.slice(-6); // son 6 kayıt
  let trendArrow = "→";
  let trendLabel = "Sabit";

  if (lastValues.length >= 2) {
    const prev = lastValues[lastValues.length - 2].value;
    const last = lastValues[lastValues.length - 1].value;
    if (last > prev) {
      trendArrow = "↑";
      trendLabel = "Artış var";
    } else if (last < prev) {
      trendArrow = "↓";
      trendLabel = "Düşüş var";
    }
  } else if (lastValues.length === 1) {
    trendArrow = "●";
    trendLabel = "Tek kayıt";
  }

  return (
    <Box maw={900} mx="auto">
      {/* Başlık satırı */}
      <Group justify="space-between" mb="md" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>{kpi.name}</Title>
          <Text c="dimmed" fz="sm">
            {kpi.department} • {kpi.period}
          </Text>
          {kpi.description && (
            <Text fz="sm" c="dimmed">
              {kpi.description}
            </Text>
          )}
        </Stack>

        <Stack gap={4} align="flex-end">
          <Text fz="xs" c="dimmed">
            Durum
          </Text>
          <Badge color={getStatusColor(kpi.status)} size="lg" radius="md">
            {kpi.status}
          </Badge>
          {lastUpdateAt && (
            <Text fz="xs" c="dimmed">
              Son güncelleme:{" "}
              {lastUpdateAt.toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
          )}
        </Stack>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          {/* Hedef / Gerçekleşen Özet */}
          <Group gap="xl">
            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Hedef Değer
              </Text>
              <Text fz="lg" fw={600}>
                {kpi.target_value} {kpi.unit}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Gerçekleşen Değer
              </Text>
              <Text fz="lg" fw={600}>
                {kpi.current_value != null
                  ? `${kpi.current_value} ${kpi.unit}`
                  : "-"}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Fark (Gerçekleşen - Hedef)
              </Text>
              <Text
                fz="lg"
                fw={600}
                c={
                  diff == null
                    ? "dimmed"
                    : diff >= 0
                    ? "teal"
                    : "red"
                }
              >
                {diff == null ? "-" : `${diff} ${kpi.unit}`}
              </Text>
            </Stack>

            <Stack gap={4}>
              <Text fz="xs" c="dimmed">
                Oluşturulma
              </Text>
              <Text fz="sm">
                {createdAt
                  ? createdAt.toLocaleDateString("tr-TR")
                  : "-"}
              </Text>
            </Stack>
          </Group>

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
                value={editCurrentValue}
                onChange={setEditCurrentValue}
                allowNegative={false}
                min={0}
                style={{ maxWidth: 180 }}
              />

              <Select
                label="Durum"
                data={["Takipte", "Hedefte", "Geride"]}
                value={editStatus}
                onChange={setEditStatus}
                placeholder="Seçiniz (boş bırakırsan otomatik)"
                style={{ minWidth: 180 }}
              />

              <Button
                onClick={handleSave}
                loading={saving}
                disabled={saving}
              >
                Kaydet
              </Button>
            </Group>

            <Text fz="xs" c="dimmed">
              Not: Durum seçmezsen, sistem gerçekleşen değer / hedef oranına
              göre otomatik olarak{" "}
              <Text span fw={500}>
                Hedefte / Takipte / Geride
              </Text>{" "}
              hesaplar. Gerçekleşen değer girildiğinde ayrıca tarihçe kaydı
              oluşur.
            </Text>
          </Stack>

          <Divider />

          {/* TREND ÖZETİ + GEÇMİŞ TABLOSU */}
          <Stack gap="sm">
            <Text fz="xs" c="dimmed">
              KPI Trend Özeti
            </Text>

            {historyLoading ? (
              <Text fz="xs" c="dimmed">
                Geçmiş veriler yükleniyor...
              </Text>
            ) : history.length === 0 ? (
              <Text fz="sm" c="dimmed">
                Henüz kayıtlı bir geçmiş ölçüm yok. İlk gerçekleşen değeri
                kaydettiğinizde burada görünecek.
              </Text>
            ) : (
              <>
                <Paper withBorder radius="md" p="sm">
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text fz="xs" c="dimmed">
                        Son Ölçümler (maks. 6 kayıt)
                      </Text>
                      <Text fz="sm">
                        {lastValues
                          .map((h) => h.value)
                          .join(" → ")}{" "}
                        {kpi.unit}
                      </Text>
                    </Stack>
                    <Stack gap={2} align="flex-end">
                      <Text fz="xs" c="dimmed">
                        Trend
                      </Text>
                      <Text fz="lg">
                        {trendArrow}{" "}
                        <Text span fz="sm" c="dimmed">
                          {trendLabel}
                        </Text>
                      </Text>
                    </Stack>
                  </Group>
                </Paper>

                <Text fz="xs" c="dimmed" mt="sm">
                  Geçmiş Ölçümler
                </Text>

                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  verticalSpacing="xs"
                  fz="xs"
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Tarih</Table.Th>
                      <Table.Th>Değer</Table.Th>
                      <Table.Th>Durum</Table.Th>
                      <Table.Th>Kayıt Yapan</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {history
                      .slice()
                      .reverse() // en yeniyi üste al
                      .map((h) => {
                        const d = toJsDate(h.date);
                        return (
                          <Table.Tr key={h.id}>
                            <Table.Td>
                              {d
                                ? d.toLocaleDateString("tr-TR")
                                : "-"}
                            </Table.Td>
                            <Table.Td>
                              {h.value} {kpi.unit}
                            </Table.Td>
                            <Table.Td>
                              {h.status ? (
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={getStatusColor(h.status)}
                                >
                                  {h.status}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </Table.Td>
                            <Table.Td>
                              {h.recorded_by || "-"}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                  </Table.Tbody>
                </Table>
              </>
            )}
          </Stack>

          <Divider />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => navigate("/kpis")}
            >
              KPI Listesine Dön
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}

export default KPIDetail;
