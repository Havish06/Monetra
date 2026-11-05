import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { theme } from "../constants/theme";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setMessage("Enter your name.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        await signUp(email.trim(), password, name.trim());
        setMessage("Account created. Check your email if confirmation is required.");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>MONETRA</Text>
        <Text style={styles.tagline}>INTELLIGENT FINANCIAL ORCHESTRATION</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>
            {mode === "login" ? "Welcome back." : "Start with clarity."}
          </Text>

          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Your money, organized around your life."
              : "Create your personal financial space."}
          </Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={theme.colors.muted}
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={theme.colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {!!message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            style={[styles.button, busy && styles.disabled]}
            onPress={handleSubmit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#101110" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            <Text style={styles.switchText}>
              {mode === "login"
                ? "New to Monetra? Create an account"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Money should work around your life.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 5,
    textAlign: "center",
  },
  tagline: {
    color: theme.colors.secondary,
    fontSize: 9,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 42,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 27,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 26,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 14,
    fontSize: 14,
  },
  message: {
    color: theme.colors.warning,
    fontSize: 12,
    marginBottom: 14,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#101110",
    fontWeight: "700",
    fontSize: 15,
  },
  switchText: {
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: 22,
    fontSize: 12,
  },
  footer: {
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: 32,
    fontSize: 12,
  },
});