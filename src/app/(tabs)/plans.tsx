
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/ui/Screen";
import { PlanCard } from "../../components/plans/PlanCard";
import { theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

import {
  getBudgetSummaries,
  createBudget,
  updateBudget,
  deleteBudget,
  getSavingsGoalSummaries,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  createSavingsContribution,
  getUpcomingCommitments,
  createCommitment,
  updateCommitment,
  deleteCommitment,
  type BudgetSummary,
  type SavingsGoalSummary,
  type Commitment,
} from "../../services/api";

type PlanType = "budget" | "goal" | "commitment" | "contribution";

type FormState = {
  name: string;
  category: string;
  amount: string;
  period: "weekly" | "monthly" | "yearly" | "custom";
  start_date: string;
  end_date: string;
  target_date: string;
  commitment_type: string;
  frequency: string;
  next_due_date: string;
  auto_renewal: boolean;
  note: string;
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyForm = (): FormState => ({
  name: "",
  category: "",
  amount: "",
  period: "monthly",
  start_date: today(),
  end_date: "",
  target_date: "",
  commitment_type: "subscription",
  frequency: "monthly",
  next_due_date: today(),
  auto_renewal: false,
  note: "",
});

export default function PlansScreen() {
  const { profile } = useAuth();
  const userId = profile?.id;

  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [goals, setGoals] = useState<SavingsGoalSummary[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);

  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PlanType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [budgetData, goalData, commitmentData] = await Promise.all([
        getBudgetSummaries(userId),
        getSavingsGoalSummaries(userId),
        getUpcomingCommitments(userId, 365),
      ]);

      setBudgets(budgetData);
      setGoals(goalData);
      setCommitments(commitmentData);
    } catch (error) {
      Alert.alert(
        "Couldn't load plans",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate(type: PlanType) {
    setEditingId(null);
    setSelectedGoalId(null);
    setForm(emptyForm());
    setModal(type);
  }

  function openBudgetEdit(item: BudgetSummary) {
    const budget = item.budget;
    setEditingId(budget.id);
    setForm({
      ...emptyForm(),
      name: budget.name,
      category: budget.category,
      amount: String(budget.limit_amount),
      period: budget.period,
      start_date: budget.start_date,
      end_date: budget.end_date ?? "",
    });
    setModal("budget");
  }

  function openGoalEdit(item: SavingsGoalSummary) {
    const goal = item.goal;
    setEditingId(goal.id);
    setForm({
      ...emptyForm(),
      name: goal.name,
      amount: String(goal.target_amount),
      target_date: goal.target_date ?? "",
    });
    setModal("goal");
  }

  function openCommitmentEdit(item: Commitment) {
    setEditingId(item.id);
    setForm({
      ...emptyForm(),
      name: item.title,
      amount: item.amount == null ? "" : String(item.amount),
      commitment_type: item.commitment_type,
      frequency: item.frequency,
      next_due_date: item.next_due_date ?? "",
      end_date: item.end_date ?? "",
      auto_renewal: item.auto_renewal,
    });
    setModal("commitment");
  }

  function openContribution(goalId: string) {
    setSelectedGoalId(goalId);
    setForm(emptyForm());
    setModal("contribution");
  }

  async function savePlan() {
    if (!userId || !modal) return;

    const amount = Number(form.amount);

    if (modal !== "contribution" && !form.name.trim()) {
      Alert.alert("Missing details", "Please enter a name.");
      return;
    }

    const amountRequired = modal !== "commitment";

    if (
      amountRequired &&
      (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0)
    ) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    if (
      modal === "commitment" &&
      form.amount.trim() &&
      (!Number.isFinite(amount) || amount <= 0)
    ) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than zero.");
      return;
    }

    setSaving(true);

    try {
      if (modal === "budget") {
        const payload = {
          name: form.name.trim(),
          category: form.category.trim() || "Other",
          limit_amount: amount,
          period: form.period,
          start_date: form.start_date,
          end_date: form.end_date || null,
        };

        if (editingId) {
          await updateBudget(userId, editingId, payload);
        } else {
          await createBudget(userId, payload);
        }
      }

      if (modal === "goal") {
        const payload = {
          name: form.name.trim(),
          target_amount: amount,
          target_date: form.target_date || null,
        };

        if (editingId) {
          await updateSavingsGoal(userId, editingId, payload);
        } else {
          await createSavingsGoal(userId, payload);
        }
      }

      if (modal === "commitment") {
        const payload = {
          title: form.name.trim(),
          commitment_type: form.commitment_type,
          amount: form.amount.trim() ? amount : null,
          frequency: form.frequency,
          next_due_date: form.next_due_date || null,
          end_date: form.end_date || null,
          auto_renewal: form.auto_renewal,
        };

        if (editingId) {
          await updateCommitment(userId, editingId, payload);
        } else {
          await createCommitment(userId, payload);
        }
      }

      if (modal === "contribution" && selectedGoalId) {
        await createSavingsContribution(userId, selectedGoalId, {
          amount,
          contribution_date: today(),
          note: form.note.trim() || null,
        });
      }

      setModal(null);
      await loadData();
    } catch (error) {
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(
    type: "budget" | "goal" | "commitment",
    id: string
  ) {
    Alert.alert(
      "Delete this item?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;

            try {
              if (type === "budget") {
                await deleteBudget(userId, id);
              } else if (type === "goal") {
                await deleteSavingsGoal(userId, id);
              } else {
                await deleteCommitment(userId, id);
              }

              await loadData();
            } catch (error) {
              Alert.alert(
                "Couldn't delete",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  const totalBudget = budgets.reduce(
    (sum, item) => sum + Number(item.budget.limit_amount),
    0
  );

  const totalSpent = budgets.reduce(
    (sum, item) => sum + Number(item.spent),
    0
  );

  const totalSaved = goals.reduce(
    (sum, item) => sum + Number(item.total_saved),
    0
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PLAN WITH PURPOSE</Text>
          <Text style={styles.title}>Your plans.</Text>
          <Text style={styles.subtitle}>
            Give every rupee a direction.
          </Text>
        </View>
        <Ionicons name="calendar-clear-outline" size={27} color={theme.colors.primary} />
      </View>

      <View style={styles.overview}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>BUDGETED</Text>
          <Text style={styles.overviewValue}>{money(totalBudget)}</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>SPENT</Text>
          <Text style={styles.overviewValue}>{money(totalSpent)}</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>SAVED</Text>
          <Text style={styles.overviewValue}>{money(totalSaved)}</Text>
        </View>
      </View>

      <SectionTitle
        title="Budgets"
        subtitle="Keep spending within your limits."
        onAdd={() => openCreate("budget")}
      />

      {budgets.length === 0 ? (
        <EmptyState
          icon="pie-chart-outline"
          text="No budgets yet. Set a spending limit to get started."
        />
      ) : (
        budgets.map((item) => (
          <PlanCard
            key={item.budget.id}
            title={item.budget.name}
            subtitle={`${item.budget.category} · ${item.budget.period}`}
            amount={money(item.spent)}
            detail={`of ${money(item.budget.limit_amount)} · ${money(item.remaining)} remaining`}
            icon="pie-chart-outline"
            progress={Number(item.utilization_percentage)}
            progressLabel={`${Number(item.utilization_percentage).toFixed(0)}% of budget used`}
            onEdit={() => openBudgetEdit(item)}
            onDelete={() => confirmDelete("budget", item.budget.id)}
          />
        ))
      )}

      <SectionTitle
        title="Savings goals"
        subtitle="Small contributions. Bigger possibilities."
        onAdd={() => openCreate("goal")}
      />

      {goals.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          text="No savings goals yet. Give yourself something to work towards."
        />
      ) : (
        goals.map((item) => (
          <PlanCard
            key={item.goal.id}
            title={item.goal.name}
            subtitle={
              item.goal.target_date
                ? `Target date · ${formatDate(item.goal.target_date)}`
                : "No target date"
            }
            amount={money(item.total_saved)}
            detail={`of ${money(item.goal.target_amount)} · ${money(item.remaining)} to go`}
            icon="flag-outline"
            progress={Number(item.progress_percentage)}
            progressLabel={`${Number(item.progress_percentage).toFixed(0)}% saved`}
            onEdit={() => openGoalEdit(item)}
            onDelete={() => confirmDelete("goal", item.goal.id)}
            onContribute={() => openContribution(item.goal.id)}
          />
        ))
      )}

      <SectionTitle
        title="Upcoming commitments"
        subtitle="Recurring payments and obligations."
        onAdd={() => openCreate("commitment")}
      />

      {commitments.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          text="Nothing scheduled. Add subscriptions or upcoming payments here."
        />
      ) : (
        commitments.map((item) => (
          <PlanCard
            key={item.id}
            title={item.title}
            subtitle={`${item.commitment_type} · ${item.frequency}`}
            amount={item.amount == null ? "Amount not set" : money(item.amount)}
            detail={
              item.next_due_date
                ? `Next due · ${formatDate(item.next_due_date)}${item.auto_renewal ? " · Auto-renews" : ""}`
                : "No due date set"
            }
            icon="repeat-outline"
            onEdit={() => openCommitmentEdit(item)}
            onDelete={() => confirmDelete("commitment", item.id)}
          />
        ))
      )}

      <Text style={styles.footer}>
        Monetra helps you plan and track. Payments and financial transactions
        are never made automatically.
      </Text>

      <Modal
        visible={modal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal === "contribution"
                  ? "Add contribution"
                  : editingId
                    ? "Edit plan"
                    : `New ${modal}`}
              </Text>
              <Pressable onPress={() => setModal(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {modal !== "contribution" && (
                <Field
                  label={modal === "commitment" ? "Title" : "Name"}
                  value={form.name}
                  onChange={(name) => setForm({ ...form, name })}
                  placeholder="Give it a name"
                />
              )}

              {modal === "budget" && (
                <>
                  <Field
                    label="Category"
                    value={form.category}
                    onChange={(category) => setForm({ ...form, category })}
                    placeholder="Food, travel, shopping..."
                  />
                  <Field
                    label="Budget limit (₹)"
                    value={form.amount}
                    onChange={(amount) => setForm({ ...form, amount })}
                    placeholder="10000"
                    numeric
                  />
                  <Text style={styles.fieldLabel}>Period</Text>
                  <View style={styles.options}>
                    {(["weekly", "monthly", "yearly", "custom"] as const).map((period) => (
                      <Choice
                        key={period}
                        label={period}
                        selected={form.period === period}
                        onPress={() => setForm({ ...form, period })}
                      />
                    ))}
                  </View>
                  <Field
                    label="Start date (YYYY-MM-DD)"
                    value={form.start_date}
                    onChange={(start_date) => setForm({ ...form, start_date })}
                    placeholder="2026-11-05"
                  />
                  {form.period === "custom" && (
                    <Field
                      label="End date (YYYY-MM-DD)"
                      value={form.end_date}
                      onChange={(end_date) => setForm({ ...form, end_date })}
                      placeholder="2026-12-05"
                    />
                  )}
                </>
              )}

              {modal === "goal" && (
                <>
                  <Field
                    label="Target amount (₹)"
                    value={form.amount}
                    onChange={(amount) => setForm({ ...form, amount })}
                    placeholder="50000"
                    numeric
                  />
                  <Field
                    label="Target date (optional)"
                    value={form.target_date}
                    onChange={(target_date) => setForm({ ...form, target_date })}
                    placeholder="2027-06-01"
                  />
                </>
              )}

              {modal === "commitment" && (
                <>
                  <Field
                    label="Type"
                    value={form.commitment_type}
                    onChange={(commitment_type) => setForm({ ...form, commitment_type })}
                    placeholder="subscription, bill, booking..."
                  />
                  <Field
                    label="Amount (₹)"
                    value={form.amount}
                    onChange={(amount) => setForm({ ...form, amount })}
                    placeholder="999"
                    numeric
                  />
                  <Field
                    label="Frequency"
                    value={form.frequency}
                    onChange={(frequency) => setForm({ ...form, frequency })}
                    placeholder="monthly, yearly, one-time..."
                  />
                  <Field
                    label="Next due date"
                    value={form.next_due_date}
                    onChange={(next_due_date) => setForm({ ...form, next_due_date })}
                    placeholder="2026-12-05"
                  />
                  <Field
                    label="End date (optional)"
                    value={form.end_date}
                    onChange={(end_date) => setForm({ ...form, end_date })}
                    placeholder="2027-12-05"
                  />
                  <Choice
                    label={form.auto_renewal ? "Auto-renewal enabled" : "Auto-renewal disabled"}
                    selected={form.auto_renewal}
                    onPress={() => setForm({ ...form, auto_renewal: !form.auto_renewal })}
                  />
                </>
              )}

              {modal === "contribution" && (
                <>
                  <Field
                    label="Contribution amount (₹)"
                    value={form.amount}
                    onChange={(amount) => setForm({ ...form, amount })}
                    placeholder="1000"
                    numeric
                  />
                  <Field
                    label="Note (optional)"
                    value={form.note}
                    onChange={(note) => setForm({ ...form, note })}
                    placeholder="Monthly savings"
                  />
                </>
              )}

              <Pressable
                style={[styles.saveButton, saving && styles.disabled]}
                disabled={saving}
                onPress={savePlan}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingId ? "Save changes" : "Save"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SectionTitle({
  title,
  subtitle,
  onAdd,
}: {
  title: string;
  subtitle: string;
  onAdd: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <Pressable style={styles.addButton} onPress={onAdd}>
        <Ionicons name="add" size={18} color={theme.colors.background} />
        <Text style={styles.addText}>Add</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={25} color={theme.colors.muted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={styles.input}
      />
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.selectedChoice]}
    >
      <Text style={[styles.choiceText, selected && styles.selectedChoiceText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function money(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  loading: {
    minHeight: 400,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 29,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginTop: 5,
  },
  overview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 15,
  },
  overviewItem: {
    flex: 1,
    gap: 7,
  },
  overviewLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  overviewValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  overviewDivider: {
    width: 1,
    height: 35,
    backgroundColor: theme.colors.border,
    marginHorizontal: 9,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 5,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: theme.colors.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 22,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    color: theme.colors.secondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    paddingBottom: 35,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  field: {
    marginBottom: 13,
  },
  fieldLabel: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 5,
    textTransform: "capitalize",
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 13,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  choice: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    marginBottom: 8,
  },
  selectedChoice: {
    backgroundColor: "#34452A",
    borderColor: theme.colors.primary,
  },
  choiceText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  selectedChoiceText: {
    color: theme.colors.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    padding: 14,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
