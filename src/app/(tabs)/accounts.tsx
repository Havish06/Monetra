import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/ui/Screen";
import { Surface } from "../../components/ui/Surface";
import { theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  getAccounts,
  getTransactions,
  createAccount,
  updateAccount,
  deleteAccount,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type Account,
  getBudgetSummaries,
  createBudget,
  updateBudget,
  deleteBudget,
  type Transaction,
  type Budget,
  type BudgetSummary,
} from "../../services/api";

type AccountForm = {
  name: string;
  account_type: string;
  institution: string;
  balance: string;
  currency: string;
};

type TransactionForm = {
  title: string;
  amount: string;
  transaction_type: "income" | "expense";
  category: string;
  description: string;
  account_id: string | null;
  transaction_date: string;
};

type Filter = "all" | "income" | "expense";

type BudgetForm = {
  name: string;
  category: string;
  limit_amount: string;
  period: Budget["period"];
  start_date: string;
  end_date: string;
};

const emptyBudget = (): BudgetForm => ({
  name: "",
  category: "",
  limit_amount: "",
  period: "monthly",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
});

const emptyAccount: AccountForm = {
  name: "",
  account_type: "Bank",
  institution: "",
  balance: "0",
  currency: "INR",
};

const emptyTransaction = (): TransactionForm => ({
  title: "",
  amount: "",
  transaction_type: "expense",
  category: "",
  description: "",
  account_id: null,
  transaction_date: new Date().toISOString().slice(0, 10),
});

function transactionEffect(transaction: {
  amount: string | number;
  transaction_type: "income" | "expense";
}) {
  const amount = Number(transaction.amount);

  return transaction.transaction_type === "income" ? amount : -amount;
}

function changeAccountBalance(
  accounts: Account[],
  transaction: Transaction,
  multiplier: 1 | -1
): Account[] {
  if (!transaction.account_id) return accounts;

  return accounts.map((account) =>
    account.id === transaction.account_id
      ? {
          ...account,
          balance:
            Number(account.balance) +
            transactionEffect(transaction) * multiplier,
        }
      : account
  );
}

function matchesFilter(transaction: Transaction, filter: Filter) {
  return (
    filter === "all" || transaction.transaction_type === filter
  );
}

function makeTemporaryId() {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AccountsScreen() {
  const { profile } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingCount, setSyncingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [pendingAccountIds, setPendingAccountIds] = useState<Set<string>>(
    new Set()
  );
  const [pendingTransactionIds, setPendingTransactionIds] = useState<
    Set<string>
  >(new Set());

  const [modal, setModal] = useState<"account" | "transaction" | "budget" | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [accountForm, setAccountForm] =
    useState<AccountForm>(emptyAccount);
  const [transactionForm, setTransactionForm] =
    useState<TransactionForm>(emptyTransaction());
  const [budgetForm, setBudgetForm] = useState<BudgetForm>(emptyBudget());

  const userId = profile?.id;

  const loadData = useCallback(
    async (showLoader = false) => {
      if (!userId) return;

      if (showLoader) setRefreshing(true);

      try {
        setError(null);

        const [accountData, transactionData, budgetData] = await Promise.all([
          getAccounts(userId),
          getTransactions(userId, filter),
          getBudgetSummaries(userId),
        ]);

        setAccounts(accountData);
        setTransactions(transactionData);
        setBudgets(budgetData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your money data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, filter]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Runs an API operation without blocking the UI.
   * The rollback callback only runs if the API operation fails.
   */
  const runBackgroundSync = useCallback(
    async (
      task: () => Promise<unknown>,
      rollback: () => void,
      refreshAfterSuccess = false
    ) => {
      setSyncingCount((count) => count + 1);

      try {
        await task();

        if (refreshAfterSuccess) {
          await loadData();
        }
      } catch (err) {
        rollback();

        Alert.alert(
          "Sync failed",
          err instanceof Error
            ? `${err.message}\n\nYour screen has been restored to its previous state.`
            : "The change couldn't be saved. Your screen has been restored."
        );
      } finally {
        setSyncingCount((count) => Math.max(0, count - 1));
      }
    },
    [loadData]
  );

  function markAccountPending(id: string) {
    setPendingAccountIds((current) => new Set(current).add(id));
  }

  function unmarkAccountPending(id: string) {
    setPendingAccountIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function markTransactionPending(id: string) {
    setPendingTransactionIds((current) => new Set(current).add(id));
  }

  function unmarkTransactionPending(id: string) {
    setPendingTransactionIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function openNewAccount() {
    setEditingAccount(null);
    setAccountForm(emptyAccount);
    setModal("account");
  }

  function openEditAccount(account: Account) {
    if (pendingAccountIds.has(account.id)) return;

    setEditingAccount(account);
    setAccountForm({
      name: account.name,
      account_type: account.account_type,
      institution: account.institution ?? "",
      balance: String(account.balance),
      currency: account.currency,
    });
    setModal("account");
  }

  function openNewTransaction(
    type: "income" | "expense" = "expense"
  ) {
    const availableAccounts = accounts.filter(
      (account) => !pendingAccountIds.has(account.id)
    );

    setEditingTransaction(null);
    setTransactionForm({
      ...emptyTransaction(),
      transaction_type: type,
      account_id: availableAccounts[0]?.id ?? null,
    });
    setModal("transaction");
  }

  function openEditTransaction(transaction: Transaction) {
    if (pendingTransactionIds.has(transaction.id)) return;

    setEditingTransaction(transaction);
    setTransactionForm({
      title: transaction.title,
      amount: String(transaction.amount),
      transaction_type: transaction.transaction_type,
      category: transaction.category ?? "",
      description: transaction.description ?? "",
      account_id: transaction.account_id,
      transaction_date: transaction.transaction_date.slice(0, 10),
    });
    setModal("transaction");
  }

  function saveAccount() {
    if (!userId || saving) return;

    const balance = Number(accountForm.balance);

    if (!accountForm.name.trim() || !accountForm.account_type.trim()) {
      Alert.alert("Missing details", "Enter an account name and type.");
      return;
    }

    if (!Number.isFinite(balance)) {
      Alert.alert("Invalid balance", "Enter a valid account balance.");
      return;
    }

    const payload = {
      name: accountForm.name.trim(),
      account_type: accountForm.account_type.trim(),
      institution: accountForm.institution.trim() || null,
      balance,
      currency: accountForm.currency.trim().toUpperCase(),
    };

    const previousAccounts = accounts;
    const previousTransactions = transactions;

    const isEditing = Boolean(editingAccount);
    const temporaryId = isEditing
      ? editingAccount!.id
      : makeTemporaryId();

    const optimisticAccount = {
      ...(editingAccount ?? {}),
      id: temporaryId,
      ...payload,
    } as Account;

    // Update the UI immediately.
    if (isEditing) {
      setAccounts((current) =>
        current.map((account) =>
          account.id === temporaryId ? optimisticAccount : account
        )
      );
    } else {
      setAccounts((current) => [optimisticAccount, ...current]);
    }

    markAccountPending(temporaryId);

    // Close the modal without waiting for the server.
    setModal(null);
    setSaving(false);

    void runBackgroundSync(
      async () => {
        if (editingAccount) {
          await updateAccount(userId, editingAccount.id, payload);
        } else {
          await createAccount(userId, payload);
        }
      },
      () => {
        setAccounts(previousAccounts);
        setTransactions(previousTransactions);
      },
      !isEditing
    ).finally(() => {
      unmarkAccountPending(temporaryId);
    });
  }

  function saveTransaction() {
    if (!userId || saving) return;

    const amount = Number(transactionForm.amount);

    if (!transactionForm.title.trim() || !transactionForm.amount.trim()) {
      Alert.alert("Missing details", "Enter a title and amount.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(transactionForm.transaction_date)
    ) {
      Alert.alert("Invalid date", "Use the YYYY-MM-DD date format.");
      return;
    }

    const payload = {
      account_id: transactionForm.account_id,
      title: transactionForm.title.trim(),
      amount,
      transaction_type: transactionForm.transaction_type,
      category: transactionForm.category.trim() || null,
      description: transactionForm.description.trim() || null,
      transaction_date: `${transactionForm.transaction_date}T12:00:00`,
    };

    const previousAccounts = accounts;
    const previousTransactions = transactions;

    const isEditing = Boolean(editingTransaction);
    const temporaryId = isEditing
      ? editingTransaction!.id
      : makeTemporaryId();

    const optimisticTransaction = {
      ...(editingTransaction ?? {}),
      id: temporaryId,
      ...payload,
    } as Transaction;

    // Reverse the previous transaction's balance effect when editing.
    let nextAccounts = accounts;

    if (editingTransaction) {
      nextAccounts = changeAccountBalance(
        nextAccounts,
        editingTransaction,
        -1
      );
    }

    // Apply the new transaction's balance effect.
    nextAccounts = changeAccountBalance(
      nextAccounts,
      optimisticTransaction,
      1
    );

    setAccounts(nextAccounts);

    // Update the visible transaction list according to the active filter.
    setTransactions((current) => {
      const withoutPrevious = current.filter(
        (transaction) => transaction.id !== temporaryId
      );

      if (!matchesFilter(optimisticTransaction, filter)) {
        return withoutPrevious;
      }

      return [optimisticTransaction, ...withoutPrevious];
    });

    markTransactionPending(temporaryId);

    // Close immediately. The API call continues in the background.
    setModal(null);
    setSaving(false);

    void runBackgroundSync(
      async () => {
        if (editingTransaction) {
          await updateTransaction(
            userId,
            editingTransaction.id,
            payload
          );
        } else {
          await createTransaction(userId, payload);
        }
      },
      () => {
        setAccounts(previousAccounts);
        setTransactions(previousTransactions);
      },
      !isEditing
    ).finally(() => {
      unmarkTransactionPending(temporaryId);
    });
  }

  function openNewBudget() {
    setEditingBudget(null);
    setBudgetForm(emptyBudget());
    setModal("budget");
  }

  function openEditBudget(summary: BudgetSummary) {
    setEditingBudget(summary.budget);
    setBudgetForm({
      name: summary.budget.name,
      category: summary.budget.category,
      limit_amount: String(summary.budget.limit_amount),
      period: summary.budget.period,
      start_date: summary.budget.start_date.slice(0, 10),
      end_date: summary.budget.end_date?.slice(0, 10) ?? "",
    });
    setModal("budget");
  }

  async function saveBudget() {
    if (!userId || saving) return;

    const limit = Number(budgetForm.limit_amount);
    if (!budgetForm.name.trim() || !budgetForm.category.trim()) {
      Alert.alert("Missing details", "Enter a budget name and category.");
      return;
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      Alert.alert("Invalid limit", "Enter a budget limit greater than zero.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(budgetForm.start_date)) {
      Alert.alert("Invalid start date", "Use the YYYY-MM-DD date format.");
      return;
    }
    if (budgetForm.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(budgetForm.end_date)) {
      Alert.alert("Invalid end date", "Use the YYYY-MM-DD date format.");
      return;
    }
    if (budgetForm.end_date && budgetForm.end_date < budgetForm.start_date) {
      Alert.alert("Invalid date range", "End date must be on or after the start date.");
      return;
    }

    const payload = {
      name: budgetForm.name.trim(),
      category: budgetForm.category.trim(),
      limit_amount: limit,
      period: budgetForm.period,
      start_date: budgetForm.start_date,
      end_date: budgetForm.period === "custom" && budgetForm.end_date
        ? budgetForm.end_date
        : null,
    };

    setSaving(true);
    try {
      if (editingBudget) {
        await updateBudget(userId, editingBudget.id, payload);
      } else {
        await createBudget(userId, payload);
      }
      setModal(null);
      await loadData();
    } catch (err) {
      Alert.alert(
        "Could not save budget",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteBudget(budget: Budget) {
    Alert.alert(
      "Delete budget?",
      `“${budget.name}” will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;
            const previous = budgets;
            setBudgets((current) => current.filter((item) => item.budget.id !== budget.id));
            try {
              await deleteBudget(userId, budget.id);
              await loadData();
            } catch (err) {
              setBudgets(previous);
              Alert.alert(
                "Could not delete budget",
                err instanceof Error ? err.message : "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  function confirmDeleteAccount(account: Account) {
    if (pendingAccountIds.has(account.id)) return;

    Alert.alert(
      "Delete account?",
      "Its transactions will remain in your history but will no longer be linked to this account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (!userId) return;

            const previousAccounts = accounts;
            const previousTransactions = transactions;

            // Remove the account and unlink its transactions immediately.
            setAccounts((current) =>
              current.filter((item) => item.id !== account.id)
            );

            setTransactions((current) =>
              current.map((transaction) =>
                transaction.account_id === account.id
                  ? { ...transaction, account_id: null }
                  : transaction
              )
            );

            markAccountPending(account.id);

            void runBackgroundSync(
              () => deleteAccount(userId, account.id),
              () => {
                setAccounts(previousAccounts);
                setTransactions(previousTransactions);
              }
            ).finally(() => {
              unmarkAccountPending(account.id);
            });
          },
        },
      ]
    );
  }

  function confirmDeleteTransaction(transaction: Transaction) {
    if (pendingTransactionIds.has(transaction.id)) return;

    Alert.alert(
      "Delete transaction?",
      "This will also reverse its effect on the linked account balance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (!userId) return;

            const previousAccounts = accounts;
            const previousTransactions = transactions;

            // Reverse the balance effect and remove the transaction immediately.
            setAccounts((current) =>
              changeAccountBalance(current, transaction, -1)
            );

            setTransactions((current) =>
              current.filter((item) => item.id !== transaction.id)
            );

            markTransactionPending(transaction.id);

            void runBackgroundSync(
              () => deleteTransaction(userId, transaction.id),
              () => {
                setAccounts(previousAccounts);
                setTransactions(previousTransactions);
              }
            ).finally(() => {
              unmarkTransactionPending(transaction.id);
            });
          },
        },
      ]
    );
  }

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.muted}>Loading your accounts...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR FINANCES</Text>
          <Text style={styles.title}>Money.</Text>
          <Text style={styles.subtitle}>
            Accounts, balances and transaction activity.
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={() => loadData(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={20}
              color={theme.colors.text}
            />
          )}
        </Pressable>
      </View>

      {syncingCount > 0 && (
        <View style={styles.syncIndicator}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
          />
          <Text style={styles.syncText}>Syncing changes...</Text>
        </View>
      )}

      <Surface style={styles.balanceCard}>
        <Text style={styles.cardLabel}>TOTAL ACCOUNT BALANCE</Text>
        <Text style={styles.totalBalance}>{currency(totalBalance)}</Text>
        <Text style={styles.cardFootnote}>
          Across {accounts.length}{" "}
          {accounts.length === 1 ? "account" : "accounts"}
        </Text>
      </Surface>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadData(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Your accounts</Text>
          <Text style={styles.sectionSubtitle}>
            Where your money lives
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={openNewAccount}>
          <Ionicons name="add" size={18} color={theme.colors.background} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {accounts.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <Ionicons
            name="wallet-outline"
            size={28}
            color={theme.colors.primary}
          />
          <Text style={styles.emptyTitle}>No accounts yet</Text>
          <Text style={styles.muted}>
            Add your bank account, cash wallet or other financial account.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={openNewAccount}
          >
            <Text style={styles.primaryButtonText}>
              Add your first account
            </Text>
          </Pressable>
        </Surface>
      ) : (
        <View style={styles.list}>
          {accounts.map((account) => {
            const isPending = pendingAccountIds.has(account.id);

            return (
              <Surface key={account.id} style={styles.accountCard}>
                <View style={styles.accountIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={21}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.muted}>
                    {account.institution || account.account_type}
                  </Text>
                  <Text style={styles.accountBalance}>
                    {currency(Number(account.balance), account.currency)}
                  </Text>
                  {isPending && (
                    <Text style={styles.pendingText}>Syncing...</Text>
                  )}
                </View>

                <View style={styles.iconActions}>
                  <Pressable
                    onPress={() => openEditAccount(account)}
                    style={styles.iconButton}
                    disabled={isPending}
                  >
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color={
                        isPending
                          ? theme.colors.muted
                          : theme.colors.secondary
                      }
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => confirmDeleteAccount(account)}
                    style={styles.iconButton}
                    disabled={isPending}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={
                        isPending
                          ? theme.colors.muted
                          : theme.colors.danger
                      }
                    />
                  </Pressable>
                </View>
              </Surface>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Budgets</Text>
          <Text style={styles.sectionSubtitle}>Keep spending within your limits</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openNewBudget}>
          <Ionicons name="add" size={18} color={theme.colors.background} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {budgets.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <Ionicons name="pie-chart-outline" size={26} color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>No budgets yet</Text>
          <Text style={styles.muted}>Create a spending limit for food, travel, shopping or any category.</Text>
          <Pressable style={styles.primaryButton} onPress={openNewBudget}>
            <Text style={styles.primaryButtonText}>Create your first budget</Text>
          </Pressable>
        </Surface>
      ) : (
        <View style={styles.list}>
          {budgets.map((summary) => {
            const percentage = Math.max(0, Number(summary.utilization_percentage) || 0);
            const barWidth = Math.min(100, percentage);
            const exceeded = summary.is_exceeded || percentage > 100;
            return (
              <Surface key={summary.budget.id} style={styles.budgetCard}>
                <View style={styles.budgetTopRow}>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.accountName}>{summary.budget.name}</Text>
                    <Text style={styles.muted}>{summary.budget.category} · {summary.budget.period}</Text>
                  </View>
                  <View style={styles.iconActions}>
                    <Pressable style={styles.iconButton} onPress={() => openEditBudget(summary)}>
                      <Ionicons name="create-outline" size={18} color={theme.colors.secondary} />
                    </Pressable>
                    <Pressable style={styles.iconButton} onPress={() => confirmDeleteBudget(summary.budget)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.budgetNumbers}>
                  <Text style={styles.budgetSpent}>{currency(Number(summary.spent))} spent</Text>
                  <Text style={styles.budgetLimit}>of {currency(Number(summary.budget.limit_amount))}</Text>
                </View>
                <View style={styles.budgetTrack}>
                  <View style={[styles.budgetFill, { width: `${barWidth}%` }, exceeded && styles.budgetFillExceeded]} />
                </View>
                <View style={styles.budgetBottomRow}>
                  <Text style={[styles.budgetPercent, exceeded && styles.budgetExceededText]}>
                    {percentage.toFixed(0)}% used
                  </Text>
                  <Text style={styles.muted}>
                    {exceeded
                      ? `${currency(Math.abs(Number(summary.remaining)))} over budget`
                      : `${currency(Number(summary.remaining))} remaining`}
                  </Text>
                </View>
              </Surface>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <Text style={styles.sectionSubtitle}>
            Your income and expenses
          </Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          style={[styles.quickButton, styles.incomeButton]}
          onPress={() => openNewTransaction("income")}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={20}
            color={theme.colors.success}
          />
          <Text style={styles.quickButtonText}>Add income</Text>
        </Pressable>

        <Pressable
          style={[styles.quickButton, styles.expenseButton]}
          onPress={() => openNewTransaction("expense")}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={20}
            color={theme.colors.warning}
          />
          <Text style={styles.quickButtonText}>Add expense</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(["all", "income", "expense"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={[
              styles.filter,
              filter === value && styles.activeFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === value && styles.activeFilterText,
              ]}
            >
              {value === "all"
                ? "All"
                : value === "income"
                  ? "Income"
                  : "Expenses"}
            </Text>
          </Pressable>
        ))}
      </View>

      {transactions.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.muted}>
            Add an income or expense to start building your financial history.
          </Text>
        </Surface>
      ) : (
        <View style={styles.list}>
          {transactions.map((transaction) => {
            const isIncome = transaction.transaction_type === "income";
            const isPending = pendingTransactionIds.has(transaction.id);

            return (
              <Surface
                key={transaction.id}
                style={styles.transactionCard}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    isIncome ? styles.incomeIcon : styles.expenseIcon,
                  ]}
                >
                  <Ionicons
                    name={isIncome ? "arrow-down" : "arrow-up"}
                    size={18}
                    color={
                      isIncome
                        ? theme.colors.success
                        : theme.colors.warning
                    }
                  />
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.title}
                  </Text>
                  <Text style={styles.muted}>
                    {transaction.category || "Uncategorized"} ·{" "}
                    {transaction.transaction_date.slice(0, 10)}
                  </Text>
                  {isPending && (
                    <Text style={styles.pendingText}>Syncing...</Text>
                  )}
                </View>

                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color: isIncome
                          ? theme.colors.success
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {isIncome ? "+" : "−"}
                    {currency(Number(transaction.amount))}
                  </Text>

                  <View style={styles.iconActions}>
                    <Pressable
                      onPress={() => openEditTransaction(transaction)}
                      style={styles.iconButton}
                      disabled={isPending}
                    >
                      <Ionicons
                        name="create-outline"
                        size={17}
                        color={
                          isPending
                            ? theme.colors.muted
                            : theme.colors.secondary
                        }
                      />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        confirmDeleteTransaction(transaction)
                      }
                      style={styles.iconButton}
                      disabled={isPending}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={
                          isPending
                            ? theme.colors.muted
                            : theme.colors.danger
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              </Surface>
            );
          })}
        </View>
      )}

      <Text style={styles.footerNote}>
        Account balances update instantly. Changes sync with your database in
        the background.
      </Text>

      <Modal
        visible={modal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal === "account"
                  ? editingAccount
                    ? "Edit account"
                    : "New account"
                  : modal === "transaction"
                    ? editingTransaction
                      ? "Edit transaction"
                      : "New transaction"
                    : editingBudget
                      ? "Edit budget"
                      : "New budget"}
              </Text>

              <Pressable onPress={() => setModal(null)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>

            {modal === "account" && (
              <>
                <Text style={styles.inputLabel}>Account name</Text>
                <TextInput
                  value={accountForm.name}
                  onChangeText={(value) =>
                    setAccountForm({ ...accountForm, name: value })
                  }
                  placeholder="e.g. Main savings"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Account type</Text>
                <TextInput
                  value={accountForm.account_type}
                  onChangeText={(value) =>
                    setAccountForm({
                      ...accountForm,
                      account_type: value,
                    })
                  }
                  placeholder="Bank, cash, credit card..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>
                  Institution (optional)
                </Text>
                <TextInput
                  value={accountForm.institution}
                  onChangeText={(value) =>
                    setAccountForm({
                      ...accountForm,
                      institution: value,
                    })
                  }
                  placeholder="Bank or provider"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Current balance</Text>
                <TextInput
                  value={accountForm.balance}
                  onChangeText={(value) =>
                    setAccountForm({ ...accountForm, balance: value })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Currency</Text>
                <TextInput
                  value={accountForm.currency}
                  onChangeText={(value) =>
                    setAccountForm({ ...accountForm, currency: value })
                  }
                  autoCapitalize="characters"
                  maxLength={3}
                  style={styles.input}
                />

                <Pressable
                  disabled={saving}
                  style={styles.primaryButton}
                  onPress={saveAccount}
                >
                  <Text style={styles.primaryButtonText}>
                    {editingAccount ? "Save changes" : "Create account"}
                  </Text>
                </Pressable>
              </>
            )}

            {modal === "transaction" && (
              <>
                <Text style={styles.inputLabel}>Transaction title</Text>
                <TextInput
                  value={transactionForm.title}
                  onChangeText={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      title: value,
                    })
                  }
                  placeholder="e.g. Groceries"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  value={transactionForm.amount}
                  onChangeText={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      amount: value,
                    })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeOptions}>
                  {(["expense", "income"] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() =>
                        setTransactionForm({
                          ...transactionForm,
                          transaction_type: type,
                        })
                      }
                      style={[
                        styles.typeOption,
                        transactionForm.transaction_type === type &&
                          styles.selectedType,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          transactionForm.transaction_type === type &&
                            styles.selectedTypeText,
                        ]}
                      >
                        {type === "income" ? "Income" : "Expense"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>
                  Category (optional)
                </Text>
                <TextInput
                  value={transactionForm.category}
                  onChangeText={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      category: value,
                    })
                  }
                  placeholder="Food, travel, salary..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Account</Text>
                <View style={styles.accountChoices}>
                  <Pressable
                    onPress={() =>
                      setTransactionForm({
                        ...transactionForm,
                        account_id: null,
                      })
                    }
                    style={[
                      styles.accountChoice,
                      transactionForm.account_id === null &&
                        styles.selectedType,
                    ]}
                  >
                    <Text
                      style={[
                        styles.accountChoiceText,
                        transactionForm.account_id === null &&
                          styles.selectedTypeText,
                      ]}
                    >
                      No account
                    </Text>
                  </Pressable>

                  {accounts
                    .filter(
                      (account) => !pendingAccountIds.has(account.id)
                    )
                    .map((account) => (
                      <Pressable
                        key={account.id}
                        onPress={() =>
                          setTransactionForm({
                            ...transactionForm,
                            account_id: account.id,
                          })
                        }
                        style={[
                          styles.accountChoice,
                          transactionForm.account_id === account.id &&
                            styles.selectedType,
                        ]}
                      >
                        <Text
                          style={[
                            styles.accountChoiceText,
                            transactionForm.account_id === account.id &&
                              styles.selectedTypeText,
                          ]}
                        >
                          {account.name}
                        </Text>
                      </Pressable>
                    ))}
                </View>

                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  value={transactionForm.transaction_date}
                  onChangeText={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      transaction_date: value,
                    })
                  }
                  placeholder="2026-11-05"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>
                  Description (optional)
                </Text>
                <TextInput
                  value={transactionForm.description}
                  onChangeText={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      description: value,
                    })
                  }
                  placeholder="Add a note"
                  placeholderTextColor={theme.colors.muted}
                  style={[styles.input, styles.descriptionInput]}
                  multiline
                />

                <Pressable
                  disabled={saving}
                  style={styles.primaryButton}
                  onPress={saveTransaction}
                >
                  <Text style={styles.primaryButtonText}>
                    {editingTransaction
                      ? "Save changes"
                      : "Add transaction"}
                  </Text>
                </Pressable>
              </>
            )}

            {modal === "budget" && (
              <>
                <Text style={styles.inputLabel}>Budget name</Text>
                <TextInput
                  value={budgetForm.name}
                  onChangeText={(value) => setBudgetForm({ ...budgetForm, name: value })}
                  placeholder="e.g. Monthly food budget"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  value={budgetForm.category}
                  onChangeText={(value) => setBudgetForm({ ...budgetForm, category: value })}
                  placeholder="Food, travel, shopping..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Spending limit</Text>
                <TextInput
                  value={budgetForm.limit_amount}
                  onChangeText={(value) => setBudgetForm({ ...budgetForm, limit_amount: value })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Budget period</Text>
                <View style={styles.typeOptions}>
                  {(["weekly", "monthly", "yearly", "custom"] as const).map((period) => (
                    <Pressable
                      key={period}
                      onPress={() => setBudgetForm({ ...budgetForm, period })}
                      style={[styles.periodOption, budgetForm.period === period && styles.selectedType]}
                    >
                      <Text style={[styles.typeOptionText, budgetForm.period === period && styles.selectedTypeText]}>
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  value={budgetForm.start_date}
                  onChangeText={(value) => setBudgetForm({ ...budgetForm, start_date: value })}
                  placeholder="2026-11-06"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                />

                {budgetForm.period === "custom" && (
                  <>
                    <Text style={styles.inputLabel}>End date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={budgetForm.end_date}
                      onChangeText={(value) => setBudgetForm({ ...budgetForm, end_date: value })}
                      placeholder="2026-12-06"
                      placeholderTextColor={theme.colors.muted}
                      style={styles.input}
                    />
                  </>
                )}

                <Pressable disabled={saving} style={styles.primaryButton} onPress={saveBudget}>
                  {saving ? (
                    <ActivityIndicator color={theme.colors.background} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{editingBudget ? "Save changes" : "Create budget"}</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function currency(value: number, code = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    minHeight: 350,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: theme.colors.secondary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginTop: 5,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  syncText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  pendingText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  balanceCard: {
    backgroundColor: "#20291B",
    borderColor: "#39472D",
    gap: 8,
  },
  cardLabel: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  totalBalance: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: "700",
  },
  cardFootnote: {
    color: theme.colors.secondary,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#34452A",
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: {
    flex: 1,
    gap: 4,
  },
  accountName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  accountBalance: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  muted: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  iconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconButton: {
    padding: 7,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickButton: {
    flex: 1,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  incomeButton: {
    borderColor: "#40583A",
  },
  expenseButton: {
    borderColor: "#5A4931",
  },
  quickButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filter: {
    paddingHorizontal: 16,
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
    fontSize: 12,
    fontWeight: "600",
  },
  activeFilterText: {
    color: theme.colors.background,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  incomeIcon: {
    backgroundColor: "#263A27",
  },
  expenseIcon: {
    backgroundColor: "#3A3022",
  },
  transactionInfo: {
    flex: 1,
    gap: 5,
  },
  transactionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 8,
  },
  errorText: {
    color: theme.colors.warning,
    fontSize: 12,
  },
  retryText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  budgetCard: {
    padding: 14,
    gap: 10,
  },
  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  budgetInfo: {
    flex: 1,
    gap: 4,
  },
  budgetNumbers: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  budgetSpent: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  budgetLimit: {
    color: theme.colors.secondary,
    fontSize: 11,
  },
  budgetTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: theme.colors.border,
    overflow: "hidden",
  },
  budgetFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  budgetFillExceeded: {
    backgroundColor: theme.colors.danger,
  },
  budgetBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetPercent: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  budgetExceededText: {
    color: theme.colors.danger,
  },
  periodOption: {
    flexGrow: 1,
    flexBasis: "22%",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  footerNote: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    paddingBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  inputLabel: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 12,
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
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  typeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  selectedType: {
    backgroundColor: "#34452A",
    borderColor: theme.colors.primary,
  },
  typeOptionText: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  selectedTypeText: {
    color: theme.colors.primary,
  },
  accountChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  accountChoice: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: theme.colors.surface,
  },
  accountChoiceText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
});