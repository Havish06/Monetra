
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

type Props = {
  title: string;
  subtitle: string;
  amount: string;
  detail?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  progress?: number;
  progressLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onContribute?: () => void;
};

export function PlanCard({
  title,
  subtitle,
  amount,
  detail,
  icon,
  progress,
  progressLabel,
  onEdit,
  onDelete,
  onContribute,
}: Props) {
  const safeProgress =
    progress === undefined
      ? undefined
      : Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={21} color={theme.colors.primary} />
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={19} color={theme.colors.secondary} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.amount}>{amount}</Text>

      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      {safeProgress !== undefined && (
        <View style={styles.progressArea}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${safeProgress}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {progressLabel ?? `${safeProgress.toFixed(0)}% complete`}
          </Text>
        </View>
      )}

      {onContribute && (
        <Pressable style={styles.contributeButton} onPress={onContribute}>
          <Ionicons name="add-circle-outline" size={17} color={theme.colors.primary} />
          <Text style={styles.contributeText}>Add contribution</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 11,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#303D28",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  actions: {
    flexDirection: "row",
    gap: 13,
  },
  amount: {
    color: theme.colors.text,
    fontSize: 23,
    fontWeight: "700",
  },
  detail: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  progressArea: {
    gap: 7,
  },
  progressTrack: {
    height: 7,
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
  },
  progressLabel: {
    color: theme.colors.secondary,
    fontSize: 10,
  },
  contributeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contributeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
});
