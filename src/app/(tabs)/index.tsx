
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { getDashboardCache } from "../../lib/appCache";
import { Screen } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { BalanceCard } from "../../components/dashboard/BalanceCard";
import { theme } from "../../constants/theme";
import { getDashboard, type DashboardData } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const { profile, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!profile?.id) {
      setLoading(false);
      setData(null);
      setError("Your Monetra profile is unavailable. Please sign in again.");
      return;
    }

    let active = true;

    async function initializeDashboard() {
      setError(null);

      // Show the loading screen only when no data is available.
      if (!data) {
        setLoading(true);
      }

      try {
        // 1. Read cached dashboard first.
        const cached = await getDashboardCache(profile!.id);

        if (!active) return;

        // 2. Display cached data immediately.
        if (cached) {
          setData(cached);
          setLoading(false);
        }

        // 3. Fetch fresh data from the backend.
        const fresh = await getDashboard(profile!.id);

        if (!active) return;

        // 4. Replace cached data with fresh data.
        setData(fresh);
        setError(null);
      } catch (err: unknown) {
        if (!active) return;

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load your dashboard.";

        setError(message);

        // Keep cached data visible if the request fails.
        console.error("Dashboard refresh failed:", message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      active = false;
    };
  }, [authLoading, profile?.id, retry]);

  if (authLoading || (loading && !data)) {
    return (
      <Screen>
        <View style={styles.state}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
          />

          <Text style={styles.stateText}>
            Loading your Monetra dashboard...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen>
        <View style={styles.state}>
          <Ionicons
            name="cloud-offline-outline"
            size={36}
            color={theme.colors.warning}
          />

          <Text style={styles.stateTitle}>
            Couldn't load your dashboard
          </Text>

          <Text style={styles.stateText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => setRetry((value) => value + 1)}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!data) return null;

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || "there";

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              YOUR FINANCIAL OVERVIEW
            </Text>

            <Text style={styles.greeting}>
              Welcome, {firstName}.
            </Text>
          </View>

          <Pressable
            style={styles.notification}
            onPress={() => router.push("/profile")}
          >
            <Ionicons
              name="person-circle-outline"
              size={23}
              color={theme.colors.text}
            />
          </Pressable>
        </View>

        <Text style={styles.demoLabel}>
          LIVE DATA · YOUR MONETRA ACCOUNTS
        </Text>

        <BalanceCard
          available={data.total_account_balance}
          income={data.monthly_income}
          spent={data.monthly_expenses}
        />

        <View style={styles.insight}>
          <View style={styles.insightIcon}>
            <Ionicons
              name="sparkles"
              size={17}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.insightContent}>
            <Text style={styles.insightLabel}>
              MONETRA OVERVIEW
            </Text>

            <Text style={styles.insightText}>
              Your monthly net cash flow is{" "}
              {formatCurrency(data.monthly_net)}. You have{" "}
              {data.upcoming_commitments_count} upcoming commitments
              to keep in mind.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Savings progress" />

          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total saved</Text>

              <Text style={styles.statValue}>
                {formatCurrency(data.total_saved)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Savings target</Text>

              <Text style={styles.statValue}>
                {formatCurrency(data.total_savings_target)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Upcoming commitments" />

          {data.upcoming_commitments.length === 0 ? (
            <Text style={styles.emptyText}>
              No upcoming commitments. You're all clear!
            </Text>
          ) : (
            data.upcoming_commitments.map(
              (item: any, index: number) => (
                <View
                  key={item.id ?? index}
                  style={styles.commitment}
                >
                  <View style={styles.commitmentIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={19}
                      color={theme.colors.primary}
                    />
                  </View>

                  <View style={styles.commitmentInfo}>
                    <Text style={styles.commitmentTitle}>
                      {item.title ?? item.name ?? "Commitment"}
                    </Text>

                    <Text style={styles.commitmentSubtitle}>
                      {item.due_date
                        ? String(item.due_date).slice(0, 10)
                        : "Upcoming"}
                    </Text>
                  </View>

                  <Text style={styles.commitmentAmount}>
                    {formatCurrency(item.amount ?? 0)}
                  </Text>
                </View>
              )
            )
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Quick actions" />

          <View style={styles.actions}>
            <Pressable style={styles.action}>
              <Ionicons
                name="scan-outline"
                size={21}
                color={theme.colors.primary}
              />

              <Text style={styles.actionText}>
                Check purchase
              </Text>
            </Pressable>

            <Pressable style={styles.action}>
              <Ionicons
                name="add-circle-outline"
                size={21}
                color={theme.colors.primary}
              />

              <Text style={styles.actionText}>
                Add subscription
              </Text>
            </Pressable>
          </View>
        </View>

        {error && data && (
          <Text style={styles.refreshNotice}>
            Showing saved data. Couldn't refresh right now.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: theme.colors.secondary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
    marginBottom: 7,
  },
  greeting: {
    color: theme.colors.text,
    fontSize: 23,
    fontWeight: "600",
    letterSpacing: -0.7,
  },
  notification: {
    height: 44,
    width: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  demoLabel: {
    color: theme.colors.secondary,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "600",
  },
  insight: {
    flexDirection: "row",
    backgroundColor: "#20291B",
    borderColor: "#39472D",
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 15,
    gap: 12,
  },
  insightIcon: {
    height: 32,
    width: 32,
    borderRadius: 11,
    backgroundColor: "#34452A",
    alignItems: "center",
    justifyContent: "center",
  },
  insightContent: {
    flex: 1,
    gap: 6,
  },
  insightLabel: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  insightText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    gap: 13,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 16,
    gap: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    color: theme.colors.secondary,
    fontSize: 13,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyText: {
    color: theme.colors.secondary,
    fontSize: 13,
  },
  commitment: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 13,
    gap: 12,
  },
  commitmentIcon: {
    height: 38,
    width: 38,
    borderRadius: 12,
    backgroundColor: "#34452A",
    alignItems: "center",
    justifyContent: "center",
  },
  commitmentInfo: {
    flex: 1,
    gap: 4,
  },
  commitmentTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  commitmentSubtitle: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  commitmentAmount: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  action: {
    flex: 1,
    minHeight: 95,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "space-between",
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
  state: {
    flex: 1,
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  stateTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  stateText: {
    color: theme.colors.secondary,
    fontSize: 13,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    marginTop: 8,
  },
  retryText: {
    color: theme.colors.background,
    fontWeight: "700",
  },
  refreshNotice: {
    color: theme.colors.secondary,
    fontSize: 11,
    textAlign: "center",
    paddingBottom: 8,
  },
});
