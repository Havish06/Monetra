
import { API_BASE_URL } from "../constants/config";
import { supabase } from "../lib/supabase";
import {
  saveDashboardCache,
  clearDashboardCache,
} from "../lib/appCache";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  institution: string | null;
  balance: number | string;
  currency: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  title: string;
  amount: number | string;
  transaction_type: "income" | "expense";
  category: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  limit_amount: number | string;
  period: "weekly" | "monthly" | "yearly" | "custom";
  start_date: string;
  end_date: string | null;
  created_at: string;
};

export type BudgetSummary = {
  budget: Budget;
  spent: number | string;
  remaining: number | string;
  utilization_percentage: number | string;
  is_exceeded: boolean;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string;
  target_date: string | null;
  status: "active" | "completed" | "paused" | "cancelled";
  created_at: string;
};

export type SavingsGoalSummary = {
  goal: SavingsGoal;
  total_saved: number | string;
  remaining: number | string;
  progress_percentage: number | string;
  is_completed: boolean;
};

export type SavingsContribution = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number | string;
  contribution_date: string;
  note: string | null;
  created_at: string;
};

export type Commitment = {
  id: string;
  user_id: string;
  title: string;
  commitment_type: string;
  amount: number | string | null;
  frequency: string;
  next_due_date: string | null;
  end_date: string | null;
  auto_renewal: boolean;
  status: "active" | "paused" | "cancelled" | "completed" | "expired";
  created_at: string;
};

export type DashboardData = {
  total_account_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_net: number;
  total_savings_target: number;
  total_saved: number;
  upcoming_commitments_count: number;
  accounts: Account[];
  recent_transactions: Transaction[];
  budgets: BudgetSummary[];
  savings_goals: SavingsGoalSummary[];
  upcoming_commitments: Commitment[];
};

export type Payment = {
  id: string;
  commitment_id: string;
  user_id: string;
  amount: number | string | null;
  due_date: string;
  status: "pending" | "overdue" | "paid";
  paid_at: string | null;
  created_at: string;
};


export type SalaryProfile = {
  id: string;
  user_id: string;
  monthly_salary: number | string;
  payday_day: number;
  created_at: string;
  updated_at: string;
};

export type PlannedExpense = {
  id: string;
  title: string;
  amount: number | string;
  due_date: string;
  category: string;
  frequency: "once" | "monthly" | "yearly";
};

export type MonthlyPlan = {
  id: string | null;
  month_start: string;
  salary_amount: number | string;
  savings_amount: number | string;
  buffer_amount: number | string;
  planned_expenses: PlannedExpense[];
  planned_expenses_total: number | string;
  safe_to_spend: number | string;
  over_allocated_by: number | string;
  updated_at: string | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;

    try {
      const parsed = JSON.parse(body);
      message = parsed.detail ?? body;
    } catch {}

    throw new Error(`Request failed (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const userPath = (userId: string) => `/api/v1/users/${userId}`;

async function invalidateDashboard(userId: string) {
  await clearDashboardCache(userId);
}

// DASHBOARD

export async function getDashboard(
  userId: string
): Promise<DashboardData> {
  if (!userId) throw new Error("Monetra profile ID is missing.");

  const dashboard = await apiRequest<DashboardData>(
    `${userPath(userId)}/dashboard`
  );

  await saveDashboardCache(userId, dashboard);
  return dashboard;
}

// PAYMENTS

// PAYMENTS

export function getPayments(
  userId: string,
  status?: Payment["status"],
) {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  return apiRequest<Payment[]>(
    `${userPath(userId)}/payments${query}`,
  );
}

export async function markPaymentPaid(
  userId: string,
  paymentId: string,
) {
  const result = await apiRequest<Payment>(
    `${userPath(userId)}/payments/${paymentId}/pay`,
    {
      method: "PATCH",
    },
  );

  await invalidateDashboard(userId);

  return result;
}

// ACCOUNTS

export function getAccounts(userId: string) {
  return apiRequest<Account[]>(`${userPath(userId)}/accounts`);
}

export async function createAccount(
  userId: string,
  payload: {
    name: string;
    account_type: string;
    institution: string | null;
    balance: number;
    currency: string;
  }
) {
  const result = await apiRequest<Account>(
    `${userPath(userId)}/accounts`,
    { method: "POST", body: payload }
  );

  await invalidateDashboard(userId);
  return result;
}

export async function updateAccount(
  userId: string,
  accountId: string,
  payload: Partial<{
    name: string;
    account_type: string;
    institution: string | null;
    balance: number;
    currency: string;
  }>
) {
  const result = await apiRequest<Account>(
    `${userPath(userId)}/accounts/${accountId}`,
    { method: "PATCH", body: payload }
  );

  await invalidateDashboard(userId);
  return result;
}

export async function deleteAccount(
  userId: string,
  accountId: string
) {
  await apiRequest<void>(
    `${userPath(userId)}/accounts/${accountId}`,
    { method: "DELETE" }
  );

  await invalidateDashboard(userId);
}

// TRANSACTIONS

export async function getTransactions(
  userId: string,
  filter: "all" | "income" | "expense" = "all"
) {
  const params = new URLSearchParams();

  if (filter !== "all") {
    params.set("transaction_type", filter);
  }

  const query = params.toString();

  return apiRequest<Transaction[]>(
    `${userPath(userId)}/transactions${query ? `?${query}` : ""}`
  );
}

export async function createTransaction(
  userId: string,
  payload: {
    account_id: string | null;
    title: string;
    amount: number;
    transaction_type: "income" | "expense";
    category: string | null;
    description: string | null;
    transaction_date: string;
  }
) {
  const result = await apiRequest<Transaction>(
    `${userPath(userId)}/transactions`,
    { method: "POST", body: payload }
  );

  await invalidateDashboard(userId);
  return result;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  payload: {
    account_id: string | null;
    title: string;
    amount: number;
    transaction_type: "income" | "expense";
    category: string | null;
    description: string | null;
    transaction_date: string;
  }
) {
  const result = await apiRequest<Transaction>(
    `${userPath(userId)}/transactions/${transactionId}`,
    { method: "PATCH", body: payload }
  );

  await invalidateDashboard(userId);
  return result;
}

export async function deleteTransaction(
  userId: string,
  transactionId: string
) {
  await apiRequest<void>(
    `${userPath(userId)}/transactions/${transactionId}`,
    { method: "DELETE" }
  );

  await invalidateDashboard(userId);
}

// BUDGETS

export function getBudgets(userId: string) {
  return apiRequest<Budget[]>(
    `${userPath(userId)}/budgets`
  );
}

export function getBudgetSummaries(userId: string) {
  return apiRequest<BudgetSummary[]>(
    `${userPath(userId)}/budgets/summary`
  );
}

export async function createBudget(
  userId: string,
  payload: {
    name: string;
    category: string;
    limit_amount: number;
    period: Budget["period"];
    start_date: string;
    end_date: string | null;
  }
) {
  const result = await apiRequest<Budget>(
    `${userPath(userId)}/budgets`,
    { method: "POST", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  payload: Partial<{
    name: string;
    category: string;
    limit_amount: number;
    period: Budget["period"];
    start_date: string;
    end_date: string | null;
  }>
) {
  const result = await apiRequest<Budget>(
    `${userPath(userId)}/budgets/${budgetId}`,
    { method: "PATCH", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function deleteBudget(
  userId: string,
  budgetId: string
) {
  await apiRequest<void>(
    `${userPath(userId)}/budgets/${budgetId}`,
    { method: "DELETE" }
  );
  await invalidateDashboard(userId);
}

// SAVINGS GOALS

export function getSavingsGoals(userId: string) {
  return apiRequest<SavingsGoal[]>(
    `${userPath(userId)}/savings-goals`
  );
}

export function getSavingsGoalSummaries(userId: string) {
  return apiRequest<SavingsGoalSummary[]>(
    `${userPath(userId)}/savings-goals/summary`
  );
}

export async function createSavingsGoal(
  userId: string,
  payload: {
    name: string;
    target_amount: number;
    target_date: string | null;
  }
) {
  const result = await apiRequest<SavingsGoal>(
    `${userPath(userId)}/savings-goals`,
    { method: "POST", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function updateSavingsGoal(
  userId: string,
  goalId: string,
  payload: Partial<{
    name: string;
    target_amount: number;
    target_date: string | null;
    status: SavingsGoal["status"];
  }>
) {
  const result = await apiRequest<SavingsGoal>(
    `${userPath(userId)}/savings-goals/${goalId}`,
    { method: "PATCH", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function deleteSavingsGoal(
  userId: string,
  goalId: string
) {
  await apiRequest<void>(
    `${userPath(userId)}/savings-goals/${goalId}`,
    { method: "DELETE" }
  );
  await invalidateDashboard(userId);
}

// SAVINGS CONTRIBUTIONS

export function getSavingsContributions(
  userId: string,
  goalId: string
) {
  return apiRequest<SavingsContribution[]>(
    `${userPath(userId)}/savings-goals/${goalId}/contributions`
  );
}

export async function createSavingsContribution(
  userId: string,
  goalId: string,
  payload: {
    amount: number;
    contribution_date: string;
    note: string | null;
  }
) {
  const result = await apiRequest<SavingsContribution>(
    `${userPath(userId)}/savings-goals/${goalId}/contributions`,
    { method: "POST", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function deleteSavingsContribution(
  userId: string,
  goalId: string,
  contributionId: string
) {
  await apiRequest<void>(
    `${userPath(userId)}/savings-goals/${goalId}/contributions/${contributionId}`,
    { method: "DELETE" }
  );
  await invalidateDashboard(userId);
}

// COMMITMENTS

export function getCommitments(userId: string) {
  return apiRequest<Commitment[]>(
    `${userPath(userId)}/commitments`
  );
}

export function getUpcomingCommitments(
  userId: string,
  days = 30
) {
  return apiRequest<Commitment[]>(
    `${userPath(userId)}/commitments/upcoming?days=${days}`
  );
}

export async function createCommitment(
  userId: string,
  payload: {
    title: string;
    commitment_type: string;
    amount: number | null;
    frequency: string;
    next_due_date: string | null;
    end_date: string | null;
    auto_renewal: boolean;
  }
) {
  const result = await apiRequest<Commitment>(
    `${userPath(userId)}/commitments`,
    { method: "POST", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function updateCommitment(
  userId: string,
  commitmentId: string,
  payload: Partial<{
    title: string;
    commitment_type: string;
    amount: number | null;
    frequency: string;
    next_due_date: string | null;
    end_date: string | null;
    auto_renewal: boolean;
    status: Commitment["status"];
  }>
) {
  const result = await apiRequest<Commitment>(
    `${userPath(userId)}/commitments/${commitmentId}`,
    { method: "PATCH", body: payload }
  );
  await invalidateDashboard(userId);
  return result;
}

export async function deleteCommitment(
  userId: string,
  commitmentId: string
) {
  await apiRequest<void>(
    `${userPath(userId)}/commitments/${commitmentId}`,
    { method: "DELETE" }
  );
  await invalidateDashboard(userId);
}


// MONTHLY PLANNER

export function getSalaryProfile(userId: string) {
  return apiRequest<SalaryProfile | null>(
    `${userPath(userId)}/monthly-planner/salary`
  );
}

export async function saveSalaryProfile(
  userId: string,
  payload: { monthly_salary: number; payday_day: number }
) {
  return apiRequest<SalaryProfile>(
    `${userPath(userId)}/monthly-planner/salary`,
    { method: "PUT", body: payload }
  );
}

export function getMonthlyPlan(userId: string, month: string) {
  return apiRequest<MonthlyPlan>(
    `${userPath(userId)}/monthly-planner/plan?month=${encodeURIComponent(month)}`
  );
}

export async function saveMonthlyPlan(
  userId: string,
  month: string,
  payload: {
    salary_amount: number;
    savings_amount: number;
    buffer_amount: number;
    planned_expenses: PlannedExpense[];
  }
) {
  return apiRequest<MonthlyPlan>(
    `${userPath(userId)}/monthly-planner/plan?month=${encodeURIComponent(month)}`,
    { method: "PUT", body: payload }
  );
}

// MONETRA AI

export type MonetraAIResponse = {
  message: string;
  intent: string;
  category: string | null;
  confidence: number;
  response: string;
  decision: Record<string, unknown>;
  analysis: Record<string, any>;
  clarification_required: boolean;
};

export async function askMonetra(
  message: string,
  previousIntent?: string | null,
  previousResult?: Record<string, any> | null
): Promise<MonetraAIResponse> {
  return apiRequest<MonetraAIResponse>("/api/v1/ai/chat", {
    method: "POST",
    body: {
      message,
      previous_intent: previousIntent ?? null,
      previous_result: previousResult ?? null,
    },
  });
}

export async function getMonetraFinancialOverview() {
  return apiRequest<{
    analysis: Record<string, any>;
    fetched_at: string;
    date_range: {
      start_date: string;
      end_date: string;
    };
  }>("/api/v1/ai/financial-overview");
}