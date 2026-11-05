
import { View, Text, StyleSheet } from "react-native";
import { Surface } from "../../components/ui/Surface";
import { theme } from "../../constants/theme";

type Props = {
  available: number;
  income: number;
  spent: number;
};

const money = (value: number) =>
  `₹${value.toLocaleString("en-IN")}`;

export function BalanceCard({ available, income, spent }: Props) {
  return (
    <Surface style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>AVAILABLE THIS MONTH</Text>
        <View style={styles.indicator} />
      </View>

      <Text style={styles.amount}>{money(available)}</Text>

      <View style={styles.divider} />

      <View style={styles.stats}>
        <View>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={styles.statValue}>{money(income)}</Text>
        </View>

        <View>
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={styles.statValue}>{money(spent)}</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: 22,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: theme.colors.secondary,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "600",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  amount: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: "700",
    marginTop: 14,
    letterSpacing: -1.5,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 20,
  },
  stats: {
    flexDirection: "row",
    gap: 48,
  },
  statLabel: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
