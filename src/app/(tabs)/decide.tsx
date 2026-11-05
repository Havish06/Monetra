
import { Text, StyleSheet } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { theme } from "../../constants/theme";

export default function DecideScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Make better decisions.</Text>
      <Text style={styles.subtitle}>
        Evaluate purchases before committing your money.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: theme.colors.secondary, fontSize: 14 },
});
