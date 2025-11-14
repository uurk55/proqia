// src/pages/admin/UserManager.tsx

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";

import {
  Box,
  Title,
  Text,
  Table,
  Loader,
  Center,
  Badge,
  Group,
  Paper,
  Button,
  Alert,
  Modal,
  TextInput,
  Select,
  Switch,
  Stack,
} from "@mantine/core";
import { IconAlertCircle, IconUserEdit } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

// Firestore tarihini güvenli şekilde JS Date'e çevir
const toJsDate = (value?: Timestamp | Date | null): Date | undefined => {
  if (!value) return undefined;
  // Firestore Timestamp ise .toDate vardır
  // @ts-expect-error: runtime'ta Timestamp olabilir
  return typeof value.toDate === "function" ? value.toDate() : value;
};

type UserRow = {
  id: string;                // doc id = uid
  full_name: string;
  email: string;
  role_id: string;
  department_id?: string | null;
  department_name?: string | null;
  is_active?: boolean;
  created_at?: Timestamp | Date | null;
  company_id: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "kalite_uzmani", label: "Kalite Uzmanı" },
  { value: "isg_uzmani", label: "İSG Uzmanı" },
  { value: "uretim_sorumlusu", label: "Üretim Sorumlusu" },
  { value: "yonetim", label: "Yönetim" },
];

function UserManager() {
  const { proqiaUser } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editDepartment, setEditDepartment] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // -------- Kullanıcıları çek --------

  const fetchUsers = async () => {
    if (!proqiaUser) {
      setLoading(false);
      return;
    }

    // Admin değilse bu sayfaya hiç erişemesin
    if (proqiaUser.role_id !== "admin") {
      setError("Bu sayfayı sadece şirket admini görüntüleyebilir.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "users"),
        where("company_id", "==", proqiaUser.company_id)
      );

      const snap = await getDocs(q);

      const list: UserRow[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          full_name: data.full_name ?? "",
          email: data.email ?? "",
          role_id: data.role_id ?? "user",
          department_id: data.department_id ?? null,
          department_name:
            data.department_name ?? data.department ?? data.department_id ?? null,
          is_active: data.is_active ?? true,
          created_at: data.created_at ?? null,
          company_id: data.company_id ?? "",
        };
      });

      setUsers(list);
    } catch (err) {
      console.error("Kullanıcı listesi alınırken hata:", err);
      setError(
        "Kullanıcı listesi alınırken bir hata oluştu. Gerekirse Firestore yetkilerini kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proqiaUser]);

  // -------- Düzenleme modalını aç --------

  const openEditModal = (user: UserRow) => {
    setEditingUser(user);
    setEditRole(user.role_id || "user");
    setEditDepartment(user.department_name || "");
    setEditActive(user.is_active ?? true);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditRole(null);
    setEditDepartment("");
    setEditActive(true);
  };

  // -------- Güncelle --------

  const handleSave = async () => {
    if (!editingUser || !editRole) return;

    setSaving(true);
    try {
      const ref = doc(db, "users", editingUser.id);

      await updateDoc(ref, {
        role_id: editRole,
        department_id: editDepartment || null,
        department_name: editDepartment || null,
        is_active: editActive,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                role_id: editRole,
                department_id: editDepartment || null,
                department_name: editDepartment || null,
                is_active: editActive,
              }
            : u
        )
      );

      notifications.show({
        title: "Kullanıcı güncellendi",
        message: `${editingUser.full_name} için bilgiler kaydedildi.`,
        color: "teal",
        icon: <IconUserEdit size={18} />,
      });

      closeEditModal();
    } catch (err) {
      console.error("Kullanıcı güncellenemedi:", err);
      notifications.show({
        title: "Hata",
        message: "Kullanıcı güncellenirken bir sorun oluştu.",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setSaving(false);
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
      <Group justify="space-between" mb="md">
        <Box>
          <Title order={2} mb={4}>
            Kullanıcı Yönetimi
          </Title>
          <Text c="dimmed" fz="sm">
            Şirketinizde kayıtlı kullanıcıların rol ve departman bilgilerini
            yönetin.
          </Text>
        </Box>
      </Group>

      <Paper withBorder shadow="sm" radius="md" p="sm">
        {users.length === 0 ? (
          <Text c="dimmed">
            Şirketinize ait kayıtlı kullanıcı bulunamadı. Kullanıcılar genelde
            kayıt formu üzerinden oluşturulur.
          </Text>
        ) : (
          <Table
            striped
            highlightOnHover
            withTableBorder
            verticalSpacing="sm"
            fz="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ad Soyad</Table.Th>
                <Table.Th>E-posta</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th>Departman</Table.Th>
                <Table.Th>Durum</Table.Th>
                <Table.Th>Oluşturulma</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Aksiyon</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => {
                const createdAt = toJsDate(u.created_at);
                const roleLabel =
                  ROLE_OPTIONS.find((r) => r.value === u.role_id)?.label ||
                  u.role_id ||
                  "-";

                return (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.full_name || "-"}</Table.Td>
                    <Table.Td>{u.email}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{roleLabel}</Badge>
                    </Table.Td>
                    <Table.Td>{u.department_name || "-"}</Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={u.is_active === false ? "red" : "teal"}
                      >
                        {u.is_active === false ? "Pasif" : "Aktif"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {createdAt
                        ? createdAt.toLocaleDateString("tr-TR")
                        : "-"}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Button
                        size="xs"
                        variant="light"
                        radius="md"
                        leftSection={<IconUserEdit size={14} />}
                        onClick={() => openEditModal(u)}
                      >
                        Düzenle
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* Düzenleme modali */}
      <Modal
        opened={!!editingUser}
        onClose={closeEditModal}
        title={editingUser ? `${editingUser.full_name} - Düzenle` : "Kullanıcı"}
        centered
      >
        {editingUser && (
          <Stack gap="md">
            <TextInput
              label="Ad Soyad"
              value={editingUser.full_name}
              readOnly
            />
            <TextInput label="E-posta" value={editingUser.email} readOnly />

            <Select
              label="Rol"
              data={ROLE_OPTIONS}
              value={editRole}
              onChange={setEditRole}
              required
            />

            <TextInput
              label="Departman"
              placeholder="Örn: Kalite, Üretim, İSG"
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.currentTarget.value)}
            />

            <Switch
              label="Kullanıcı aktif"
              checked={editActive}
              onChange={(e) => setEditActive(e.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={closeEditModal}>
                İptal
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!editRole}
              >
                Kaydet
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}

export default UserManager;
