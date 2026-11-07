import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Surface } from "../../components/ui/Surface";
import { theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  Commitment,
  Payment,
  createCommitment,
  deleteCommitment,
  getCommitments,
  getPayments,
  markPaymentPaid,
  updateCommitment,
} from "../../services/api";

type Filter = "all" | "subscriptions" | "trials";
type PaymentFilter = "all" | "pending" | "overdue" | "paid";

type FormState = {
  title: string;
  commitment_type: string;
  amount: string;
  frequency: string;
  next_due_date: string;
  end_date: string;
  auto_renewal: boolean;
};

const emptyForm: FormState = {
  title: "",
  commitment_type: "subscription",
  amount: "",
  frequency: "monthly",
  next_due_date: "",
  end_date: "",
  auto_renewal: true,
};

function money(value: number | string | null, currency = "INR") {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null) {
  if (!value) return "No date set";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value: string | null) {
  if (!value) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(due.getTime())) return null;

  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function isTrial(item: Commitment) {
  return item.commitment_type.toLowerCase().includes("trial");
}

function dueLabel(item: Commitment) {
  const days = daysUntil(item.next_due_date);

  if (days === null) return "Date not set";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";

  return `Due in ${days} days`;
}

function paymentStatusLabel(status: Payment["status"]) {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

export default function BillsScreen() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const currency = profile?.currency || "INR";

  const [items, setItems] = useState<Commitment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentFilter>("all");
  const [expandedCommitmentId, setExpandedCommitmentId] =
    useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [commitmentResult, paymentResult] = await Promise.all([
        getCommitments(userId),
        getPayments(userId),
      ]);

      setItems(commitmentResult);
      setPayments(paymentResult);
    } catch (error) {
      Alert.alert(
        "Couldn't load bills",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeItems = useMemo(
    () => items.filter((item) => item.status === "active"),
    [items]
  );

  const upcomingItems = useMemo(
    () =>
      activeItems
        .filter((item) => {
          const days = daysUntil(item.next_due_date);
          return days !== null && days >= 0 && days <= 30;
        })
        .sort((a, b) =>
          (a.next_due_date || "").localeCompare(b.next_due_date || "")
        ),
    [activeItems]
  );

  const monthlyExposure = useMemo(
    () =>
      activeItems.reduce((total, item) => {
        if (isTrial(item)) return total;

        const amount = Number(item.amount ?? 0);
        const frequency = item.frequency.toLowerCase();

        if (frequency === "once" || !Number.isFinite(amount)) {
          return total;
        }

        if (frequency === "yearly" || frequency === "annually") {
          return total + amount / 12;
        }

        if (frequency === "weekly") {
          return total + amount * 4.33;
        }

        return total + amount;
      }, 0),
    [activeItems]
  );

  const outstandingPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status === "pending" || payment.status === "overdue"
      ),
    [payments]
  );

  const overduePayments = useMemo(
    () => payments.filter((payment) => payment.status === "overdue"),
    [payments]
  );

  const outstandingAmount = useMemo(
    () =>
      outstandingPayments.reduce(
        (total, payment) => total + Number(payment.amount ?? 0),
        0
      ),
    [outstandingPayments]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.status !== "cancelled" && item.status !== "completed"
      )
      .filter((item) => {
        if (filter === "trials") return isTrial(item);
        if (filter === "subscriptions") return !isTrial(item);
        return true;
      })
      .filter((item) => {
        if (paymentFilter === "all") return true;

        return payments.some(
          (payment) =>
            payment.commitment_id === item.id &&
            payment.status === paymentFilter
        );
      })
      .sort((a, b) => {
        if (!a.next_due_date) return 1;
        if (!b.next_due_date) return -1;
        return a.next_due_date.localeCompare(b.next_due_date);
      });
  }, [items, filter, paymentFilter, payments]);

  function paymentsFor(item: Commitment) {
    return payments
      .filter((payment) => payment.commitment_id === item.id)
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  }

  function openEdit(item: Commitment) {
    setEditing(item);
    setForm({
      title: item.title,
      commitment_type: item.commitment_type,
      amount: item.amount === null ? "" : String(item.amount),
      frequency: item.frequency,
      next_due_date: item.next_due_date || "",
      end_date: item.end_date || "",
      auto_renewal: item.auto_renewal,
    });
    setModalVisible(true);
  }

  function changeForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function isValidDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  async function saveCommitment() {
    if (!userId) return;

    if (!form.title.trim()) {
      Alert.alert(
        "Name required",
        "Enter a name for this bill or subscription."
      );
      return;
    }

    const amount = form.amount.trim() ? Number(form.amount) : null;

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount <= 0)
    ) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    if (
      (form.next_due_date && !isValidDate(form.next_due_date)) ||
      (form.end_date && !isValidDate(form.end_date))
    ) {
      Alert.alert(
        "Invalid date",
        "Enter a real date using YYYY-MM-DD."
      );
      return;
    }

    const payload = {
      title: form.title.trim(),
      commitment_type: form.commitment_type.trim() || "subscription",
      amount,
      frequency: form.frequency.trim() || "monthly",
      next_due_date: form.next_due_date.trim() || null,
      end_date: form.end_date.trim() || null,
      auto_renewal: form.auto_renewal,
    };

    setSaving(true);

    try {
      if (editing) {
        await updateCommitment(userId, editing.id, payload);
      } else {
        await createCommitment(userId, payload);
      }

      setModalVisible(false);
      setEditing(null);
      setForm(emptyForm);
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

  async function changeStatus(item: Commitment) {
    if (!userId) return;

    const nextStatus =
      item.status === "paused" ? "active" : "paused";

    try {
      await updateCommitment(userId, item.id, {
        status: nextStatus,
      });
      await loadData();
    } catch (error) {
      Alert.alert(
        "Couldn't update",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  function confirmDelete(item: Commitment) {
    Alert.alert(
      "Delete commitment?",
      `${item.title} and its payment history will be removed.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;

            try {
              await deleteCommitment(userId, item.id);
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

  function confirmMarkPaid(payment: Payment, title: string) {
    if (!userId) return;

    Alert.alert(
      "Mark payment as paid?",
      `Record ${money(payment.amount, currency)} for ${title} as paid. This does not make an actual bank payment.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as paid",
          onPress: async () => {
            setPayingId(payment.id);

            try {
              await markPaymentPaid(userId, payment.id);
              await loadData();
            } catch (error) {
              Alert.alert(
                "Couldn't update payment",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setPayingId(null);
            }
          },
        },
      ]
    );
  }

  function renderPaymentHistory(item: Commitment) {
    const itemPayments = paymentsFor(item);

    if (itemPayments.length === 0) {
      return (
        <View style={styles.paymentEmpty}>
          <Text style={styles.paymentEmptyText}>
            No payment records yet.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.paymentHistory}>
        {itemPayments.map((payment) => {
          const isPaid = payment.status === "paid";
          const isOverdue = payment.status === "overdue";
          const isPaying = payingId === payment.id;

          return (
            <View key={payment.id} style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDate}>
                  {formatDate(payment.due_date)}
                </Text>
                <Text style={styles.paymentAmount}>
                  {money(payment.amount, currency)}
                </Text>
                {payment.paid_at && (
                  <Text style={styles.paymentPaidDate}>
                    Paid on {formatDate(payment.paid_at.slice(0, 10))}
                  </Text>
                )}
              </View>

              <View style={styles.paymentActions}>
                <View
                  style={[
                    styles.paymentStatusBadge,
                    isPaid && styles.paidBadge,
                    isOverdue && styles.overdueBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentStatusText,
                      isPaid && styles.paidText,
                      isOverdue && styles.overdueText,
                    ]}
                  >
                    {paymentStatusLabel(payment.status)}
                  </Text>
                </View>

                {!isPaid && (
                  <Pressable
                    style={[
                      styles.markPaidButton,
                      isPaying && styles.disabledButton,
                    ]}
                    disabled={isPaying}
                    onPress={() => confirmMarkPaid(payment, item.title)}
                  >
                    {isPaying ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.background}
                      />
                    ) : (
                      <Text style={styles.markPaidText}>Mark paid</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderCommitment(item: Commitment) {
    const trial = isTrial(item);
    const paused = item.status === "paused";
    const days = daysUntil(item.next_due_date);
    const itemPayments = paymentsFor(item);
    const isExpanded = expandedCommitmentId === item.id;

    const nextPayment = itemPayments.find(
      (payment) =>
        payment.status === "pending" || payment.status === "overdue"
    );

    return (
      <Surface key={item.id} style={styles.commitmentCard}>
        <View style={styles.cardTop}>
          <View style={styles.cardIdentity}>
            <View
              style={[
                styles.iconBox,
                trial && styles.trialIconBox,
              ]}
            >
              <Ionicons
                name={trial ? "hourglass-outline" : "repeat-outline"}
                size={21}
                color={trial ? theme.colors.warning : theme.colors.primary}
              />
            </View>

            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>
                {item.frequency} · {item.commitment_type}
              </Text>
            </View>
          </View>

          <Text style={styles.amount}>
            {item.amount === null
              ? "Amount not set"
              : money(item.amount, currency)}
          </Text>
        </View>

        <View style={styles.cardDetails}>
          <View>
            <Text style={styles.detailLabel}>
              {trial ? "TRIAL ENDS / NEXT DATE" : "NEXT PAYMENT"}
            </Text>
            <Text style={styles.detailValue}>
              {formatDate(item.next_due_date)}
            </Text>
          </View>

          <View style={styles.dueBadge}>
            <Text
              style={[
                styles.dueText,
                days !== null && days < 4 && styles.dueWarning,
                paused && styles.pausedText,
              ]}
            >
              {paused ? "Paused" : dueLabel(item)}
            </Text>
          </View>
        </View>

        {nextPayment && (
          <View style={styles.nextPaymentBox}>
            <View style={styles.nextPaymentInfo}>
              <Text style={styles.nextPaymentLabel}>
                {nextPayment.status === "overdue"
                  ? "OUTSTANDING · OVERDUE"
                  : "NEXT PAYMENT"}
              </Text>
              <Text style={styles.nextPaymentAmount}>
                {money(nextPayment.amount, currency)}
              </Text>
            </View>

            <Pressable
              style={[
                styles.markPaidButton,
                payingId === nextPayment.id && styles.disabledButton,
              ]}
              disabled={payingId === nextPayment.id}
              onPress={() => confirmMarkPaid(nextPayment, item.title)}
            >
              {payingId === nextPayment.id ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.background}
                />
              ) : (
                <Text style={styles.markPaidText}>Mark paid</Text>
              )}
            </Pressable>
          </View>
        )}

        <Pressable
          style={styles.historyToggle}
          onPress={() =>
            setExpandedCommitmentId(
              isExpanded ? null : item.id
            )
          }
        >
          <View style={styles.historyToggleLeft}>
            <Ionicons
              name="receipt-outline"
              size={15}
              color={theme.colors.secondary}
            />
            <Text style={styles.historyToggleText}>
              Payment history ({itemPayments.length})
            </Text>
          </View>

          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.secondary}
          />
        </Pressable>

        {isExpanded && renderPaymentHistory(item)}

        {item.auto_renewal && !paused && (
          <View style={styles.renewalNotice}>
            <Ionicons
              name="alert-circle-outline"
              size={15}
              color={theme.colors.warning}
            />
            <Text style={styles.renewalText}>
              Auto-renewal is enabled
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => openEdit(item)}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={theme.colors.text}
            />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => changeStatus(item)}
          >
            <Ionicons
              name={paused ? "play-outline" : "pause-outline"}
              size={16}
              color={theme.colors.text}
            />
            <Text style={styles.actionText}>
              {paused ? "Resume" : "Pause"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => confirmDelete(item)}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={theme.colors.danger}
            />
            <Text style={[styles.actionText, { color: theme.colors.danger }]}>
              Delete
            </Text>
          </Pressable>
        </View>
      </Surface>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MONETRA / LIFE MANAGEMENT</Text>
          <Text style={styles.title}>Watchtower.</Text>
          <Text style={styles.subtitle}>
            Never get caught off guard by a payment.
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={openCreate}>
          <Ionicons
            name="add"
            size={25}
            color={theme.colors.background}
          />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>MONTHLY EXPOSURE</Text>
          <Text style={styles.summaryValue}>
            {money(monthlyExposure, currency)}
          </Text>
          <Text style={styles.summaryHint}>
            Estimated recurring cost
          </Text>
        </Surface>

        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>UPCOMING</Text>
          <Text style={styles.summaryValue}>
            {upcomingItems.length}
          </Text>
          <Text style={styles.summaryHint}>
            Due in the next 30 days
          </Text>
        </Surface>
      </View>

      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>OUTSTANDING</Text>
          <Text style={styles.summaryValue}>
            {money(outstandingAmount, currency)}
          </Text>
          <Text style={styles.summaryHint}>
            {outstandingPayments.length} unpaid payment(s)
          </Text>
        </Surface>

        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>OVERDUE</Text>
          <Text
            style={[
              styles.summaryValue,
              overduePayments.length > 0 && styles.overdueSummaryValue,
            ]}
          >
            {overduePayments.length}
          </Text>
          <Text style={styles.summaryHint}>
            Payment(s) past due date
          </Text>
        </Surface>
      </View>

      <Surface style={styles.alertCard}>
        <View style={styles.alertIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Stay ahead of renewals</Text>
          <Text style={styles.alertDescription}>
            Track free trials, recurring charges and payment history in one place.
          </Text>
        </View>
      </Surface>

      <SectionHeader
        title={`Your commitments · ${filteredItems.length} tracked`}
      />

      <View style={styles.filters}>
        {(
          [
            ["all", "All"],
            ["subscriptions", "Subscriptions"],
            ["trials", "Free trials"],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={[
              styles.filterButton,
              filter === value && styles.activeFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === value && styles.activeFilterText,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.filterSectionLabel}>PAYMENT STATUS</Text>

      <View style={styles.filters}>
        {(
          [
            ["all", "All"],
            ["pending", "Pending"],
            ["overdue", "Overdue"],
            ["paid", "Paid"],
          ] as [PaymentFilter, string][]
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setPaymentFilter(value)}
            style={[
              styles.filterButton,
              paymentFilter === value && styles.activeFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                paymentFilter === value && styles.activeFilterText,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Loading commitments and payments...
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <Ionicons
            name="receipt-outline"
            size={32}
            color={theme.colors.muted}
          />
          <Text style={styles.emptyTitle}>
            {paymentFilter === "all"
              ? "Nothing tracked yet."
              : `No ${paymentFilter} payments.`}
          </Text>
          <Text style={styles.emptyText}>
            {paymentFilter === "all"
              ? "Add a subscription, bill or free trial to start keeping track."
              : "Try another payment filter or add a new commitment."}
          </Text>

          {paymentFilter === "all" && (
            <Pressable
              style={styles.emptyButton}
              onPress={openCreate}
            >
              <Text style={styles.emptyButtonText}>
                Add your first commitment
              </Text>
            </Pressable>
          )}
        </Surface>
      ) : (
        <View style={styles.list}>
          {filteredItems.map(renderCommitment)}
        </View>
      )}

      <View style={styles.bottomNote}>
        <Ionicons
          name="information-circle-outline"
          size={15}
          color={theme.colors.muted}
        />
        <Text style={styles.bottomNoteText}>
          Marking a payment as paid updates Monetra records only. It does not transfer money.
        </Text>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  COMMITMENT MANAGER
                </Text>
                <Text style={styles.modalTitle}>
                  {editing ? "Edit commitment" : "New commitment"}
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput
                value={form.title}
                onChangeText={(value) => changeForm("title", value)}
                placeholder="e.g. Spotify Premium"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>TYPE</Text>
              <View style={styles.choiceRow}>
                {["subscription", "trial", "bill"].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => changeForm("commitment_type", value)}
                    style={[
                      styles.choice,
                      form.commitment_type === value && styles.choiceActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        form.commitment_type === value &&
                          styles.choiceTextActive,
                      ]}
                    >
                      {value === "trial"
                        ? "Free trial"
                        : value.charAt(0).toUpperCase() + value.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>AMOUNT ({currency})</Text>
              <TextInput
                value={form.amount}
                onChangeText={(value) => changeForm("amount", value)}
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>FREQUENCY</Text>
              <View style={styles.choiceRow}>
                {["monthly", "yearly", "weekly", "once"].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => changeForm("frequency", value)}
                    style={[
                      styles.choice,
                      form.frequency === value && styles.choiceActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        form.frequency === value && styles.choiceTextActive,
                      ]}
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                NEXT PAYMENT / TRIAL END
              </Text>
              <TextInput
                value={form.next_due_date}
                onChangeText={(value) =>
                  changeForm("next_due_date", value)
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>END DATE (OPTIONAL)</Text>
              <TextInput
                value={form.end_date}
                onChangeText={(value) => changeForm("end_date", value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                autoCapitalize="none"
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Auto-renewal</Text>
                  <Text style={styles.switchSubtitle}>
                    This commitment renews automatically.
                  </Text>
                </View>
                <Switch
                  value={form.auto_renewal}
                  onValueChange={(value) =>
                    changeForm("auto_renewal", value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primaryMuted,
                  }}
                  thumbColor={
                    form.auto_renewal
                      ? theme.colors.primary
                      : theme.colors.secondary
                  }
                />
              </View>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveCommitment}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editing ? "Save changes" : "Add commitment"}
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  eyebrow: {
    color: theme.colors.primaryMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginTop: 5,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 10,
  },
  overdueSummaryValue: {
    color: theme.colors.danger,
  },
  summaryHint: {
    color: theme.colors.secondary,
    fontSize: 10,
    marginTop: 5,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 2,
    marginBottom: 28,
    padding: 16,
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#C5F27718",
    alignItems: "center",
    justifyContent: "center",
  },
  alertContent: { flex: 1 },
  alertTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  alertDescription: {
    color: theme.colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 15,
  },
  filterSectionLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeFilter: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  activeFilterText: {
    color: theme.colors.background,
    fontWeight: "800",
  },
  list: { gap: 12 },
  commitmentCard: { padding: 15 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 11,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#C5F27718",
    alignItems: "center",
    justifyContent: "center",
  },
  trialIconBox: { backgroundColor: "#E7B66D18" },
  cardTitleWrap: { flex: 1 },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: theme.colors.secondary,
    fontSize: 11,
    marginTop: 4,
    textTransform: "capitalize",
  },
  amount: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  cardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
  dueBadge: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
  },
  dueText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  dueWarning: { color: theme.colors.warning },
  pausedText: { color: theme.colors.secondary },

  nextPaymentBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceElevated,
  },
  nextPaymentInfo: { flex: 1 },
  nextPaymentLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  nextPaymentAmount: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  markPaidButton: {
    minWidth: 85,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markPaidText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: "800",
  },
  historyToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  historyToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  historyToggleText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  paymentHistory: {
    gap: 0,
    marginTop: 3,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paymentInfo: { flex: 1 },
  paymentDate: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  paymentAmount: {
    color: theme.colors.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  paymentPaidDate: {
    color: theme.colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  paymentActions: {
    alignItems: "flex-end",
    gap: 7,
  },
  paymentStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceElevated,
  },
  paidBadge: {
    backgroundColor: "#C5F27720",
  },
  overdueBadge: {
    backgroundColor: "#E5737320",
  },
  paymentStatusText: {
    color: theme.colors.secondary,
    fontSize: 9,
    fontWeight: "800",
  },
  paidText: {
    color: theme.colors.primary,
  },
  overdueText: {
    color: theme.colors.danger,
  },
  paymentEmpty: {
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paymentEmptyText: {
    color: theme.colors.muted,
    fontSize: 11,
  },

  renewalNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 13,
  },
  renewalText: {
    color: theme.colors.warning,
    fontSize: 10,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  loading: {
    alignItems: "center",
    padding: 35,
    gap: 10,
  },
  loadingText: {
    color: theme.colors.secondary,
    fontSize: 12,
  },
  emptyCard: {
    alignItems: "center",
    padding: 25,
    gap: 10,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: theme.colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: theme.radius.pill,
    marginTop: 5,
  },
  emptyButtonText: {
    color: theme.colors.background,
    fontSize: 11,
    fontWeight: "800",
  },
  bottomNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    marginBottom: 20,
  },
  bottomNoteText: {
    color: theme.colors.muted,
    fontSize: 10,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#000000AA",
  },
  modal: {
    maxHeight: "92%",
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 35,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  modalEyebrow: {
    color: theme.colors.primaryMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 5,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  choiceActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#C5F27718",
  },
  choiceText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  choiceTextActive: {
    color: theme.colors.primary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 12,
  },
  switchTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  switchSubtitle: {
    color: theme.colors.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: "800",
  },
});