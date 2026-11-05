
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Screen } from "../components/ui/Screen";
import { theme } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, updateProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setCurrency(profile.currency ?? "INR");
      setTimezone(profile.timezone ?? "Asia/Kolkata");
    }
  }, [profile]);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(currency.trim())) {
      Alert.alert("Invalid currency", "Enter a valid three-letter currency code, such as INR or USD.");
      return;
    }

    if (!timezone.trim()) {
      Alert.alert("Missing timezone", "Please enter your timezone.");
      return;
    }

    try {
      setSaving(true);

      await updateProfile({
        full_name: fullName.trim(),
        currency: currency.trim().toUpperCase(),
        timezone: timezone.trim(),
      });

      Alert.alert("Profile updated", "Your changes have been saved.");
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Sign out failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !profile) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.secondaryText}>Loading your profile...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={21} color={theme.colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Your profile</Text>

          <View style={styles.backButton} />
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile.full_name || profile.email)
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>
            {profile.full_name || "Monetra User"}
          </Text>

          <Text style={styles.email}>{profile.email}</Text>
          <Text style={styles.accountLabel}>MONETRA ACCOUNT</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={theme.colors.secondary}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.input, styles.readOnly]}>
              <Text style={styles.readOnlyText}>{profile.email}</Text>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={theme.colors.secondary}
              />
            </View>
            <Text style={styles.helper}>
              Email is managed by your authentication account.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Preferred currency</Text>
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder="INR"
              placeholderTextColor={theme.colors.secondary}
              style={styles.input}
              autoCapitalize="characters"
              maxLength={3}
            />
            <Text style={styles.helper}>
              Examples: INR, USD, EUR, GBP.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Timezone</Text>
            <TextInput
              value={timezone}
              onChangeText={setTimezone}
              placeholder="Asia/Kolkata"
              placeholderTextColor={theme.colors.secondary}
              style={styles.input}
              autoCapitalize="none"
            />
            <Text style={styles.helper}>
              Use an IANA timezone, such as Asia/Kolkata or Europe/London.
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={theme.colors.background}
              />
              <Text style={styles.saveText}>Save changes</Text>
            </>
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>

          <Pressable
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color={theme.colors.warning} />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={theme.colors.warning}
                />
                <Text style={styles.signOutText}>Sign out</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>MONETRA · MONEY AROUND YOUR LIFE</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 35,
    gap: 25,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    height: 42,
    width: 42,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  identity: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  avatar: {
    height: 82,
    width: 82,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  email: {
    fontSize: 13,
    color: theme.colors.secondary,
  },
  accountLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: 5,
  },
  section: {
    gap: 15,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "700",
    color: theme.colors.secondary,
  },
  field: {
    gap: 8,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 14,
    justifyContent: "center",
  },
  readOnly: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readOnlyText: {
    color: theme.colors.secondary,
    fontSize: 14,
  },
  helper: {
    color: theme.colors.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  secondaryText: {
    color: theme.colors.secondary,
    fontSize: 13,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  saveText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  signOutButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signOutText: {
    color: theme.colors.warning,
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    color: theme.colors.secondary,
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
