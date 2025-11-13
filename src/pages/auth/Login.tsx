// src/pages/auth/Login.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Stack,
  Alert,
  Center,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("E-posta veya şifre hatalı. Lütfen kontrol edin.");
      } else {
        setError("Giriş başarısız oldu. Lütfen daha sonra tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ height: "calc(100vh - 120px)" }}>
      <Paper withBorder shadow="md" p="xl" radius="md" w={450}>
        <Title order={2} ta="center" mb="xs">
          PROQIA
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Hesabınıza giriş yapın
        </Text>

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            {error && (
              <Alert
                icon={<IconAlertCircle size="1.2rem" />}
                title="Giriş Hatası"
                color="red"
                radius="md"
                withCloseButton
                onClose={() => setError("")}
              >
                {error}
              </Alert>
            )}

            <TextInput
              required
              label="E-posta Adresi"
              placeholder="admin@sirket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <PasswordInput
              required
              label="Şifre"
              placeholder="Şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" loading={loading} fullWidth mt="md">
              Giriş Yap
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="lg">
          Hesabınız yok mu?{" "}
          <Anchor component={Link} to="/signup" size="sm">
            Hemen Kayıt Olun
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}

export default Login;
