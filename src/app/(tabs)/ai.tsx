import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { theme } from "../../constants/theme";

export default function AiScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Your financial companion.</Text>
        <Text style={styles.subtitle}>
          Ask Monetra about your money, purchases, subscriptions, bookings
          and plans.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 14,
    lineHeight: 22,
  },
});