
import { View, StyleSheet, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { theme } from "../../constants/theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

export function Surface({ children, style }: Props) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
});
