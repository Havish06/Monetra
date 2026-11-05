
import { Text, StyleSheet } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { theme } from "../../constants/theme";

export default function BillsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Subscription watchtower.</Text>
      <Text style={styles.subtitle}>
        Keep track of trials, recurring payments and renewals.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: theme.colors.secondary, fontSize: 14 },
});
