
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Surface } from "../../components/ui/Surface";
import { theme } from "../../constants/theme";
import type { UpcomingItemData } from "../../data/demo";

const icons = {
  bill: "receipt-outline",
  trial: "time-outline",
  event: "calendar-outline",
} as const;

export function UpcomingItem({ item }: { item: UpcomingItemData }) {
  return (
    <Surface style={styles.item}>
      <View style={styles.icon}>
        <Ionicons
          name={icons[item.type]}
          size={20}
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>

      <Text style={styles.amount}>
        ₹{item.amount.toLocaleString("en-IN")}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  details: { flex: 1, gap: 5 },
  title: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  amount: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 13,
  },
});
