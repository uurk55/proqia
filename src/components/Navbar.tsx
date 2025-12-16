// src/components/Navbar.tsx

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";

import {
  Group,
  Button,
  Text,
  Anchor,
  Box,
  Divider,
  Title,
  Menu,
  useMantineTheme,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

function Navbar() {
  const { currentUser, proqiaUser, permissions } = useAuth();
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Çıkış yapılamadı:", err);
    }
  };

  const menuButtonProps: any = {
    size: "sm",
    variant: "subtle",
    color: "gray",
    radius: "xl",
    px: "sm",
    style: { fontWeight: 500 },
  };

  // Menülerin gösterilip gösterilmeyeceğini tek yerde hesaplayalım
  const hasQualityMenu =
    permissions?.doc_view_list ||
    permissions?.doc_create ||
    permissions?.dof_view_list ||
    permissions?.dof_create ||
    permissions?.audit_view_list ||
    permissions?.audit_create ||
    permissions?.complaint_view_list ||
    permissions?.complaint_create;

  const hasOperationMenu =
    permissions?.device_view_list ||
    permissions?.device_create ||
    permissions?.training_view_list ||
    permissions?.training_create;

  const hasRiskIsgMenu =
    permissions?.risk_view_list ||
    permissions?.risk_create ||
    permissions?.incident_view_list ||
    permissions?.incident_create;

  const hasPerformanceMenu =
    permissions?.kpi_view_list || permissions?.kpi_create;

  const hasAdminMenu =
    permissions?.role_manage ||
    permissions?.workflow_manage ||
    permissions?.user_manage;

  return (
    <Box
      px="md"
      py="xs"
      style={{
        borderBottom: "1px solid #eee",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "#fff",
      }}
    >
      <Group justify="space-between" h="100%">
        {/* Sol: Logo + menüler */}
        <Group align="center" gap="lg">
          <Anchor component={Link} to="/" underline="never" mr="lg">
            <Title order={3} c={theme.primaryColor}>
              PROQIA
            </Title>
          </Anchor>

          {currentUser && proqiaUser && (
            <Group gap="xs">
              <Divider orientation="vertical" />

              {/* KALİTE */}
              {hasQualityMenu && (
                <Menu>
                  <Menu.Target>
                    <Button
                      {...menuButtonProps}
                      rightSection={<IconChevronDown size={14} />}
                    >
                      Kalite
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {permissions?.doc_view_list ||
                    permissions?.doc_create ? (
                      <>
                        <Menu.Label>Dokümanlar</Menu.Label>
                        {permissions?.doc_view_list && (
                          <Menu.Item component={Link} to="/documents">
                            Kütüphane
                          </Menu.Item>
                        )}
                        {permissions?.doc_create && (
                          <Menu.Item component={Link} to="/documents/new">
                            Yeni Doküman
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                      </>
                    ) : null}

                    {permissions?.dof_view_list || permissions?.dof_create ? (
                      <>
                        <Menu.Label>DÖF</Menu.Label>
                        {permissions?.dof_view_list && (
                          <Menu.Item component={Link} to="/dofs">
                            DÖF Listesi
                          </Menu.Item>
                        )}
                        {permissions?.dof_create && (
                          <Menu.Item component={Link} to="/dof/new">
                            Yeni DÖF
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                      </>
                    ) : null}

                    {permissions?.audit_view_list ||
                    permissions?.audit_create ? (
                      <>
                        <Menu.Label>Denetim</Menu.Label>
                        {permissions?.audit_view_list && (
                          <Menu.Item component={Link} to="/audits">
                            Denetim Listesi
                          </Menu.Item>
                        )}
                        {permissions?.audit_create && (
                          <Menu.Item component={Link} to="/audit/new">
                            Yeni Denetim
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                      </>
                    ) : null}

                    {permissions?.complaint_view_list ||
                    permissions?.complaint_create ? (
                      <>
                        <Menu.Label>Şikayet</Menu.Label>
                        {permissions?.complaint_view_list && (
                          <Menu.Item component={Link} to="/complaints">
                            Şikayet Listesi
                          </Menu.Item>
                        )}
                        {permissions?.complaint_create && (
                          <Menu.Item component={Link} to="/complaint/new">
                            Yeni Şikayet
                          </Menu.Item>
                        )}
                      </>
                    ) : null}
                  </Menu.Dropdown>
                </Menu>
              )}

              {/* OPERASYON (Cihaz + Eğitim) */}
              {hasOperationMenu && (
                <Menu>
                  <Menu.Target>
                    <Button
                      {...menuButtonProps}
                      rightSection={<IconChevronDown size={14} />}
                    >
                      Operasyon
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {permissions?.device_view_list ||
                    permissions?.device_create ? (
                      <>
                        <Menu.Label>Cihazlar</Menu.Label>
                        {permissions?.device_view_list && (
                          <Menu.Item component={Link} to="/devices">
                            Cihaz Listesi
                          </Menu.Item>
                        )}
                        {permissions?.device_create && (
                          <Menu.Item component={Link} to="/device/new">
                            Yeni Cihaz
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                      </>
                    ) : null}

                    {permissions?.training_view_list ||
                    permissions?.training_create ? (
                      <>
                        <Menu.Label>Eğitimler</Menu.Label>
                        {permissions?.training_view_list && (
                          <Menu.Item component={Link} to="/trainings">
                            Eğitim Listesi
                          </Menu.Item>
                        )}
                        {permissions?.training_create && (
                          <Menu.Item component={Link} to="/training/new">
                            Yeni Eğitim
                          </Menu.Item>
                        )}
                      </>
                    ) : null}
                  </Menu.Dropdown>
                </Menu>
              )}

              {/* RİSK & İSG */}
              {hasRiskIsgMenu && (
                <Menu>
                  <Menu.Target>
                    <Button
                      {...menuButtonProps}
                      rightSection={<IconChevronDown size={14} />}
                    >
                      Risk & İSG
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {permissions?.risk_view_list || permissions?.risk_create ? (
                      <>
                        <Menu.Label>Riskler</Menu.Label>
                        {permissions?.risk_view_list && (
                          <Menu.Item component={Link} to="/risks">
                            Risk Listesi
                          </Menu.Item>
                        )}
                        {permissions?.risk_create && (
                          <Menu.Item component={Link} to="/risk/new">
                            Yeni Risk
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                      </>
                    ) : null}

                    {permissions?.incident_view_list ||
                    permissions?.incident_create ? (
                      <>
                        <Menu.Label>İSG</Menu.Label>
                        {permissions?.incident_view_list && (
                          <Menu.Item component={Link} to="/incidents">
                            İSG Kayıt Listesi
                          </Menu.Item>
                        )}
                        {permissions?.incident_create && (
                          <Menu.Item component={Link} to="/incident/new">
                            Yeni İSG Kaydı
                          </Menu.Item>
                        )}
                      </>
                    ) : null}
                  </Menu.Dropdown>
                </Menu>
              )}

              {/* PERFORMANS */}
              {hasPerformanceMenu && (
                <Menu>
                  <Menu.Target>
                    <Button
                      {...menuButtonProps}
                      rightSection={<IconChevronDown size={14} />}
                    >
                      Performans
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {permissions?.kpi_view_list && (
                      <Menu.Item component={Link} to="/kpis">
                        KPI Listesi
                      </Menu.Item>
                    )}
                    {permissions?.kpi_create && (
                      <Menu.Item component={Link} to="/kpi/new">
                        Yeni KPI
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              )}

              {/* ADMIN */}
              {hasAdminMenu && (
                <>
                  <Divider orientation="vertical" />
                  <Menu>
                    <Menu.Target>
                      <Button
                        {...menuButtonProps}
                        variant="light"
                        color="dark"
                        rightSection={<IconChevronDown size={14} />}
                      >
                        Admin
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {permissions?.role_manage && (
                        <Menu.Item component={Link} to="/admin/roles">
                          Roller
                        </Menu.Item>
                      )}
                      {permissions?.workflow_manage && (
                        <Menu.Item component={Link} to="/admin/workflows">
                          İş Akışları
                        </Menu.Item>
                      )}
                      <Menu.Item component={Link} to="/documents/approval">
  Doküman Onay
</Menu.Item>

                      {permissions?.user_manage && (
                        <Menu.Item component={Link} to="/admin/users">
                          Kullanıcılar
                        </Menu.Item>
                      )}
{proqiaUser?.role_id === 'admin' && (
  <Menu.Item component={Link} to="/admin/company">
    Şirket Ayarları
  </Menu.Item>
)}


                    </Menu.Dropdown>
                  </Menu>
                </>
              )}
            </Group>
          )}
        </Group>

        {/* Sağ: kullanıcı bilgisi */}
        <Group>
          {currentUser && proqiaUser ? (
            <>
              <Text size="sm" c="dimmed">
                Hoş geldin,{" "}
                <Text span fw={500} c="dark">
                  {proqiaUser.full_name}
                </Text>
              </Text>
              <Button
                variant="light"
                color="red"
                size="sm"
                onClick={handleLogout}
              >
                Çıkış Yap
              </Button>
            </>
          ) : (
            <Group>
              <Button component={Link} to="/login" variant="default" size="sm">
                Giriş Yap
              </Button>
              <Button component={Link} to="/signup" size="sm">
                Kayıt Ol
              </Button>
            </Group>
          )}
        </Group>
      </Group>
    </Box>
  );
}

export default Navbar;
