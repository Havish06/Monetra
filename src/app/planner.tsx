import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Screen } from "../components/ui/Screen";
import { theme } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import {
  getSalaryProfile, saveSalaryProfile, getMonthlyPlan, saveMonthlyPlan,
  type PlannedExpense,
} from "../services/api";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};
const currency = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function MonthlyPlannerScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const userId = profile?.id;

  const [month, setMonth] = useState(currentMonth());
  const [salary, setSalary] = useState("");
  const [payday, setPayday] = useState("5");
  const [savings, setSavings] = useState("0");
  const [buffer, setBuffer] = useState("0");
  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(currentMonth().slice(0, 7) + "-10");
  const [expenseCategory, setExpenseCategory] = useState("Essentials");
  const [frequency, setFrequency] = useState<PlannedExpense["frequency"]>("once");
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [salaryData, plan] = await Promise.all([
        getSalaryProfile(userId),
        getMonthlyPlan(userId, month),
      ]);
      setSalary(salaryData ? String(salaryData.monthly_salary) : String(plan.salary_amount || ""));
      setPayday(salaryData ? String(salaryData.payday_day) : "5");
      setSavings(String(plan.savings_amount ?? 0));
      setBuffer(String(plan.buffer_amount ?? 0));
      setExpenses(plan.planned_expenses ?? []);
    } catch (error) {
      Alert.alert("Couldn't load planner", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId, month]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const income = Number(salary) || 0;
    const saved = Number(savings) || 0;
    const reserve = Number(buffer) || 0;
    const planned = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    return { income, saved, reserve, planned, remaining: income - saved - reserve - planned };
  }, [salary, savings, buffer, expenses]);

  function addExpense() {
    const value = Number(expenseAmount);
    if (!expenseTitle.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert("Check expense", "Enter a title and an amount greater than zero.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      Alert.alert("Check date", "Use YYYY-MM-DD for the due date.");
      return;
    }
    setExpenses(items => [...items, {
      id: newId(), title: expenseTitle.trim(), amount: value,
      due_date: expenseDate, category: expenseCategory.trim() || "Other", frequency,
    }]);
    setExpenseTitle("");
    setExpenseAmount("");
  }

  async function savePlan() {
    if (!userId) return;
    const income = Number(salary);
    const paydayNumber = Number(payday);
    const saved = Number(savings);
    const reserve = Number(buffer);
    if (!Number.isFinite(income) || income <= 0) {
      Alert.alert("Set your salary", "Enter your monthly take-home salary first.");
      return;
    }
    if (!Number.isInteger(paydayNumber) || paydayNumber < 1 || paydayNumber > 31) {
      Alert.alert("Invalid payday", "Choose a day from 1 to 31.");
      return;
    }
    if (![saved, reserve].every(value => Number.isFinite(value) && value >= 0)) {
      Alert.alert("Invalid allocation", "Savings and buffer cannot be negative.");
      return;
    }
    if (totals.remaining < 0) {
      Alert.alert("Over-allocated", "Reduce savings, buffer or planned expenses to fit your salary.");
      return;
    }
    setSavingState(true);
    try {
      await saveSalaryProfile(userId, { monthly_salary: income, payday_day: paydayNumber });
      await saveMonthlyPlan(userId, month, {
        salary_amount: income, savings_amount: saved,
        buffer_amount: reserve, planned_expenses: expenses,
      });
      Alert.alert("Plan saved", "Your monthly allocations are safely stored.");
    } catch (error) {
      Alert.alert("Couldn't save plan", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingState(false);
    }
  }

  if (loading) {
    return <Screen><View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View></Screen>;
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PLAN WITH PURPOSE</Text>
            <Text style={styles.heading}>Monthly planner</Text>
          </View>
          <Ionicons name="calendar-clear-outline" size={25} color={theme.colors.primary} />
        </View>

        <View style={styles.monthRow}>
          <Text style={styles.sectionTitle}>Planning month</Text>
          <TextInput
            value={month.slice(0, 7)}
            onChangeText={value => {
              if (/^\d{4}-\d{2}$/.test(value)) {
                const [year, monthNumber] = value.split("-").map(Number);
                if (monthNumber >= 1 && monthNumber <= 12) setMonth(value + "-01");
              }
            }}
            placeholder="YYYY-MM" placeholderTextColor={theme.colors.muted}
            style={styles.monthInput} maxLength={7}
          />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>SAFE TO SPEND</Text>
          <Text style={styles.heroAmount}>{currency(Math.max(0, totals.remaining))}</Text>
          <Text style={styles.heroHint}>Income minus savings, buffer and planned expenses</Text>
          {totals.remaining < 0 && <Text style={styles.warning}>Over-allocated by {currency(Math.abs(totals.remaining))}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>01 · Income & payday</Text>
          <Text style={styles.helper}>Set your monthly take-home salary. Payday defaults to the 5th.</Text>
          <Field label="Monthly salary (₹)" value={salary} onChangeText={setSalary} keyboard="numeric" placeholder="45000" />
          <Field label="Salary day of month" value={payday} onChangeText={setPayday} keyboard="numeric" placeholder="5" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>02 · Save first</Text>
          <Text style={styles.helper}>Choose what to set aside before planning your spending.</Text>
          <Field label="Savings allocation (₹)" value={savings} onChangeText={setSavings} keyboard="numeric" placeholder="5000" />
          <Field label="Safety buffer (₹)" value={buffer} onChangeText={setBuffer} keyboard="numeric" placeholder="2000" />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>03 · Planned expenses</Text>
              <Text style={styles.helper}>Add bills, bookings, events and purchases for this month.</Text>
            </View>
            <Text style={styles.total}>{currency(totals.planned)}</Text>
          </View>
          {expenses.map(item => (
            <View key={item.id} style={styles.expenseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle}>{item.title}</Text>
                <Text style={styles.helper}>{item.category} · {item.due_date} · {item.frequency}</Text>
              </View>
              <Text style={styles.expenseAmount}>{currency(Number(item.amount))}</Text>
              <Pressable onPress={() => setExpenses(items => items.filter(expense => expense.id !== item.id))} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
          ))}
          {expenses.length === 0 && <Text style={styles.empty}>Nothing planned yet. Add your first expense below.</Text>}
          <Field label="Expense title" value={expenseTitle} onChangeText={setExpenseTitle} placeholder="Rent, dinner, internet..." />
          <Field label="Estimated amount (₹)" value={expenseAmount} onChangeText={setExpenseAmount} keyboard="numeric" placeholder="1200" />
          <Field label="Due date (YYYY-MM-DD)" value={expenseDate} onChangeText={setExpenseDate} placeholder="2026-11-25" />
          <Field label="Category" value={expenseCategory} onChangeText={setExpenseCategory} placeholder="Essentials" />
          <View style={styles.frequencyRow}>
            {(["once", "monthly", "yearly"] as const).map(value => (
              <Pressable key={value} onPress={() => setFrequency(value)} style={[styles.frequency, frequency === value && styles.frequencyActive]}>
                <Text style={[styles.frequencyText, frequency === value && styles.frequencyTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={addExpense} style={styles.addButton}>
            <Ionicons name="add" size={18} color={theme.colors.primary} />
            <Text style={styles.addText}>Add expense</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Summary label="Monthly income" value={currency(totals.income)} />
          <Summary label="Savings first" value={currency(totals.saved)} />
          <Summary label="Planned expenses" value={currency(totals.planned)} />
          <Summary label="Safety buffer" value={currency(totals.reserve)} />
          <View style={styles.divider} />
          <Summary label="Safe to spend" value={currency(Math.max(0, totals.remaining))} strong />
        </View>

        <Pressable onPress={savePlan} disabled={savingState} style={[styles.saveButton, savingState && { opacity: 0.6 }]}>
          {savingState ? <ActivityIndicator color={theme.colors.background} /> : <Text style={styles.saveText}>Save monthly plan</Text>}
        </Pressable>
        <Text style={styles.footer}>Planning estimate only. Monetra never moves money or executes investments.</Text>
      </ScrollView>
    </Screen>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboard }: {
  label: string; value: string; onChangeText: (value: string) => void;
  placeholder?: string; keyboard?: "numeric" | "default";
}) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={theme.colors.muted} keyboardType={keyboard ?? "default"} style={styles.input} />
  </View>;
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.rowBetween}>
    <Text style={[styles.summaryLabel, strong && styles.strong]}>{label}</Text>
    <Text style={[styles.summaryValue, strong && styles.strong]}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 36 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  back: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: theme.colors.secondary, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 5 },
  heading: { color: theme.colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.8 },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monthInput: { color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 100, textAlign: "center" },
  hero: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 20, gap: 7 },
  heroLabel: { color: theme.colors.primary, fontSize: 10, letterSpacing: 1.3, fontWeight: "700" },
  heroAmount: { color: theme.colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  heroHint: { color: theme.colors.secondary, fontSize: 12 },
  warning: { color: theme.colors.warning, fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 16, gap: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  helper: { color: theme.colors.secondary, fontSize: 11, lineHeight: 17 },
  field: { gap: 6 },
  fieldLabel: { color: theme.colors.secondary, fontSize: 11, fontWeight: "600" },
  input: { color: theme.colors.text, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  total: { color: theme.colors.primary, fontWeight: "700", fontSize: 13 },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 10 },
  expenseTitle: { color: theme.colors.text, fontSize: 13, fontWeight: "600" },
  expenseAmount: { color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  empty: { color: theme.colors.muted, fontSize: 12, paddingVertical: 8 },
  frequencyRow: { flexDirection: "row", gap: 8 },
  frequency: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  frequencyActive: { borderColor: theme.colors.primary, backgroundColor: "#26311D" },
  frequencyText: { color: theme.colors.secondary, fontSize: 11, textTransform: "capitalize" },
  frequencyTextActive: { color: theme.colors.primary, fontWeight: "700" },
  addButton: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.primaryMuted },
  addText: { color: theme.colors.primary, fontSize: 12, fontWeight: "700" },
  summaryCard: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg, padding: 16, gap: 12 },
  summaryLabel: { color: theme.colors.secondary, fontSize: 12 },
  summaryValue: { color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  strong: { color: theme.colors.primary, fontWeight: "800", fontSize: 14 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  saveButton: { minHeight: 50, borderRadius: 15, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  saveText: { color: theme.colors.background, fontWeight: "800", fontSize: 13 },
  footer: { color: theme.colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
});
