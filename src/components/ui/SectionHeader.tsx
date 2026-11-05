
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../constants/theme";

type Props = {
  title: string;
  action?: string;
};

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  action: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "500",
  },
});
