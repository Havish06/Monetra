
import { View, Text, StyleSheet } from "react-native";
import { Surface } from "../../components/ui/Surface";
import { theme } from "../../constants/theme";

type Point = {
  day: string;
  amount: number;
};

export function CashFlowCard({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((p) => p.amount));

  return (
    <Surface style={styles.card}>
      <Text style={styles.heading}>Balance trend</Text>
      <Text style={styles.subheading}>Your available funds</Text>

      <View style={styles.chart}>
        {data.map((point) => {
          const height = Math.max(8, (point.amount / max) * 105);

          return (
            <View key={point.day} style={styles.column}>
              <View style={[styles.bar, { height }]} />
              <Text style={styles.day}>{point.day}</Text>
            </View>
          );
        })}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  heading: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  subheading: {
    color: theme.colors.secondary,
    fontSize: 12,
  },
  chart: {
    height: 140,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  bar: {
    width: 19,
    backgroundColor: theme.colors.primary,
    borderRadius: 7,
    opacity: 0.9,
  },
  day: {
    color: theme.colors.muted,
    fontSize: 10,
  },
});
