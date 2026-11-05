
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
  budgets: any[];
  savings_goals: any[];
  upcoming_commitments: any[];
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

// Dashboard
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

// Accounts
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

// Transactions
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
