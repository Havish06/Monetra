
import { Text, StyleSheet } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { theme } from "../../constants/theme";

export default function PlansScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Your plans.</Text>
      <Text style={styles.subtitle}>
        Upcoming events, expenses and financial commitments.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: theme.colors.secondary, fontSize: 14 },
});
