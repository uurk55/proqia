import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Table, Loader, Center, Title } from "@mantine/core";

function DevicesList() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore'dan cihazları çek
  const fetchDevices = async () => {
    try {
      const q = query(
        collection(db, "devices"),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDevices(list);
    } catch (error) {
      console.error("Cihazlar alınırken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  if (loading) {
    return (
      <Center style={{ padding: 40 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Title order={2} mb="lg">
        Cihaz Listesi
      </Title>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Kod</Table.Th>
            <Table.Th>Adı</Table.Th>
            <Table.Th>Konum</Table.Th>
            <Table.Th>Durum</Table.Th>
            <Table.Th>Son Bakım</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {devices.map((device) => (
            <Table.Tr key={device.id}>
              <Table.Td>{device.device_code}</Table.Td>
              <Table.Td>{device.device_name}</Table.Td>
              <Table.Td>{device.location}</Table.Td>
              <Table.Td>{device.status}</Table.Td>
              <Table.Td>
                {device.last_maintenance_date
                  ? device.last_maintenance_date.toDate().toLocaleDateString("tr-TR")
                  : "-"}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {devices.length === 0 && (
        <Center mt="lg">Henüz kayıtlı cihaz yok.</Center>
      )}
    </div>
  );
}

export default DevicesList;
