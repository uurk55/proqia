// src/pages/admin/CompanySettings.tsx

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  Title,
  Text,
  Tabs,
  Paper,
  Group,
  Table,
  TextInput,
  Switch,
  Button,
  Loader,
  Center,
  Alert,
  Badge,
  Stack,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBuildingFactory,
  IconMapPin,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

type Department = {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

type Location = {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  // @ts-expect-error: Firestore Timestamp olabilir
  return typeof value.toDate === "function" ? value.toDate() : value;
};

function CompanySettings() {
  const { proqiaUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [savingDept, setSavingDept] = useState(false);

  const [newLocName, setNewLocName] = useState("");
  const [newLocCode, setNewLocCode] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  // -------- Yetki kontrolü --------
  if (proqiaUser && proqiaUser.role_id !== "admin") {
    return (
      <Box maw={900} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Erişim yok"
          color="yellow"
          mt="md"
        >
          Bu sayfayı yalnızca şirket admini görüntüleyebilir.
        </Alert>
      </Box>
    );
  }

  // -------- Verileri yükle --------
  const fetchData = async () => {
    if (!proqiaUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Departmanlar
      const deptSnap = await getDocs(
        query(
          collection(db, "departments"),
          where("company_id", "==", proqiaUser.company_id)
        )
      );

      const deptList: Department[] = deptSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? "",
          code: data.code ?? "",
          is_active: data.is_active ?? true,
          company_id: data.company_id ?? "",
          created_at: data.created_at ?? null,
        };
      });

      deptList.sort((a, b) => a.name.localeCompare(b.name));

      // Lokasyonlar
      const locSnap = await getDocs(
        query(
          collection(db, "locations"),
          where("company_id", "==", proqiaUser.company_id)
        )
      );

      const locList: Location[] = locSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name ?? "",
          code: data.code ?? "",
          is_active: data.is_active ?? true,
          company_id: data.company_id ?? "",
          created_at: data.created_at ?? null,
        };
      });

      locList.sort((a, b) => a.name.localeCompare(b.name));

      setDepartments(deptList);
      setLocations(locList);
    } catch (err) {
      console.error("Şirket ayarları alınamadı:", err);
      setError(
        "Şirket ayarları alınırken bir hata oluştu. Gerekirse Firestore yetkilerini kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proqiaUser]);

  // -------- Yeni departman ekle --------
  const handleAddDepartment = async () => {
    if (!proqiaUser) return;
    if (!newDeptName.trim()) return;

    setSavingDept(true);
    try {
      const ref = await addDoc(collection(db, "departments"), {
        company_id: proqiaUser.company_id,
        name: newDeptName.trim(),
        code: newDeptCode.trim() || null,
        is_active: true,
        created_at: Timestamp.now(),
      });

      setDepartments((prev) => [
        ...prev,
        {
          id: ref.id,
          name: newDeptName.trim(),
          code: newDeptCode.trim() || "",
          is_active: true,
          company_id: proqiaUser.company_id,
          created_at: Timestamp.now(),
        },
      ]);
      setNewDeptName("");
      setNewDeptCode("");

      notifications.show({
        title: "Departman eklendi",
        message: "Yeni departman başarıyla kaydedildi.",
        color: "teal",
      });
    } catch (err) {
      console.error("Departman eklenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Departman eklenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setSavingDept(false);
    }
  };

  // -------- Departman aktif/pasif --------
  const toggleDepartmentActive = async (dept: Department) => {
    try {
      await updateDoc(doc(db, "departments", dept.id), {
        is_active: !dept.is_active,
      });

      setDepartments((prev) =>
        prev.map((d) =>
          d.id === dept.id ? { ...d, is_active: !dept.is_active } : d
        )
      );
    } catch (err) {
      console.error("Departman güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Departman durumu güncellenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  // -------- Yeni lokasyon ekle --------
  const handleAddLocation = async () => {
    if (!proqiaUser) return;
    if (!newLocName.trim()) return;

    setSavingLoc(true);
    try {
      const ref = await addDoc(collection(db, "locations"), {
        company_id: proqiaUser.company_id,
        name: newLocName.trim(),
        code: newLocCode.trim() || null,
        is_active: true,
        created_at: Timestamp.now(),
      });

      setLocations((prev) => [
        ...prev,
        {
          id: ref.id,
          name: newLocName.trim(),
          code: newLocCode.trim() || "",
          is_active: true,
          company_id: proqiaUser.company_id,
          created_at: Timestamp.now(),
        },
      ]);
      setNewLocName("");
      setNewLocCode("");

      notifications.show({
        title: "Lokasyon eklendi",
        message: "Yeni lokasyon başarıyla kaydedildi.",
        color: "teal",
      });
    } catch (err) {
      console.error("Lokasyon eklenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Lokasyon eklenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setSavingLoc(false);
    }
  };

  // -------- Lokasyon aktif/pasif --------
  const toggleLocationActive = async (loc: Location) => {
    try {
      await updateDoc(doc(db, "locations", loc.id), {
        is_active: !loc.is_active,
      });

      setLocations((prev) =>
        prev.map((l) =>
          l.id === loc.id ? { ...l, is_active: !loc.is_active } : l
        )
      );
    } catch (err) {
      console.error("Lokasyon güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Lokasyon durumu güncellenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  // -------- Ekran durumları --------
  if (!proqiaUser) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (loading) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Box maw={900} mx="auto">
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Hata"
          color="red"
          mt="md"
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box maw={1100} mx="auto">
      <Title order={2} mb="sm">
        Şirket Ayarları
      </Title>
      <Text c="dimmed" fz="sm" mb="md">
        Departman ve lokasyon tanımlarınızı yönetin. Bu bilgiler diğer
        modüllerde seçim listesi olarak kullanılabilir.
      </Text>

      <Tabs defaultValue="departments">
        <Tabs.List>
          <Tabs.Tab
            value="departments"
            leftSection={<IconBuildingFactory size={16} />}
          >
            Departmanlar
          </Tabs.Tab>
          <Tabs.Tab value="locations" leftSection={<IconMapPin size={16} />}>
            Lokasyonlar
          </Tabs.Tab>
        </Tabs.List>

        {/* Departmanlar */}
        <Tabs.Panel value="departments" pt="md">
          <Paper withBorder shadow="sm" radius="md" p="md">
            <Stack gap="sm">
              <Group align="flex-end">
                <TextInput
                  label="Departman Adı"
                  placeholder="Örn: Kalite, Üretim, Bakım"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.currentTarget.value)}
                  style={{ flex: 2 }}
                />
                <TextInput
                  label="Kod (opsiyonel)"
                  placeholder="Örn: KAL, URET"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  mt={22}
                  onClick={handleAddDepartment}
                  loading={savingDept}
                  disabled={!newDeptName.trim()}
                >
                  Ekle
                </Button>
              </Group>

              <Table
                striped
                highlightOnHover
                withTableBorder
                verticalSpacing="sm"
                fz="sm"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Departman</Table.Th>
                    <Table.Th>Kod</Table.Th>
                    <Table.Th>Durum</Table.Th>
                    <Table.Th>Oluşturulma</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Aktif/Pasif</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {departments.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text c="dimmed">
                          Henüz tanımlanmış bir departman yok. Yukarıdan
                          ekleyebilirsiniz.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    departments.map((d) => {
                      const createdAt = toJsDate(d.created_at);
                      return (
                        <Table.Tr key={d.id}>
                          <Table.Td>{d.name}</Table.Td>
                          <Table.Td>{d.code || "-"}</Table.Td>
                          <Table.Td>
                            <Badge
                              color={d.is_active ? "teal" : "red"}
                              variant="light"
                            >
                              {d.is_active ? "Aktif" : "Pasif"}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {createdAt
                              ? createdAt.toLocaleDateString("tr-TR")
                              : "-"}
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Switch
                              checked={d.is_active}
                              onChange={() => toggleDepartmentActive(d)}
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Lokasyonlar */}
        <Tabs.Panel value="locations" pt="md">
          <Paper withBorder shadow="sm" radius="md" p="md">
            <Stack gap="sm">
              <Group align="flex-end">
                <TextInput
                  label="Lokasyon Adı"
                  placeholder="Örn: Esenyurt Fabrika, Depo, Merkez Ofis"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.currentTarget.value)}
                  style={{ flex: 2 }}
                />
                <TextInput
                  label="Kod (opsiyonel)"
                  placeholder="Örn: ESNYRT, DEPO1"
                  value={newLocCode}
                  onChange={(e) => setNewLocCode(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  mt={22}
                  onClick={handleAddLocation}
                  loading={savingLoc}
                  disabled={!newLocName.trim()}
                >
                  Ekle
                </Button>
              </Group>

              <Table
                striped
                highlightOnHover
                withTableBorder
                verticalSpacing="sm"
                fz="sm"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Lokasyon</Table.Th>
                    <Table.Th>Kod</Table.Th>
                    <Table.Th>Durum</Table.Th>
                    <Table.Th>Oluşturulma</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Aktif/Pasif</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {locations.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text c="dimmed">
                          Henüz tanımlanmış bir lokasyon yok. Yukarıdan
                          ekleyebilirsiniz.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    locations.map((l) => {
                      const createdAt = toJsDate(l.created_at);
                      return (
                        <Table.Tr key={l.id}>
                          <Table.Td>{l.name}</Table.Td>
                          <Table.Td>{l.code || "-"}</Table.Td>
                          <Table.Td>
                            <Badge
                              color={l.is_active ? "teal" : "red"}
                              variant="light"
                            >
                              {l.is_active ? "Aktif" : "Pasif"}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {createdAt
                              ? createdAt.toLocaleDateString("tr-TR")
                              : "-"}
                          </Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Switch
                              checked={l.is_active}
                              onChange={() => toggleLocationActive(l)}
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}

export default CompanySettings;
