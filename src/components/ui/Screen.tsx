
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { theme } from "../../constants/theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
};

export function Screen({ children, style, scroll = true }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fixedContent, style]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 12,
    gap: theme.spacing.xl,
  },
  fixedContent: {
    flex: 1,
  },
});
