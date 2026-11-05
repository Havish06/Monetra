# Monetra Intelligence — Test Catalogue

**Status:** Specification / implementation backlog  
**Purpose:** Build a useful financial assistant without requiring a paid LLM. The catalogue is the source of truth for supported intents, expected behaviour, and edge-case coverage.

## Non-negotiable behaviour

1. Never invent balances, transactions, due dates, bank status, exchange rates, investment returns, or user details.
2. All monetary calculations are performed by deterministic Python functions using decimal arithmetic, never by generated text.
3. Every answer must distinguish **available balance**, **ledger/current balance**, **pending transactions**, **credit limit**, and **invested value** where applicable.
4. Every answer that depends on financial data must state when that data was last updated, or disclose that freshness is unknown.
5. Missing or conflicting data must produce a clarification or a qualified answer, not a guess.
6. Recommendations must account for upcoming commitments, minimum balance/reserve rules, and the user's stated goals.
7. Monetra may explain, calculate, compare, and prepare actions. It must not transfer money, trade, pay bills, cancel subscriptions, or book/purchase without explicit user review and confirmation.
8. Investment responses are educational and scenario-based; no guaranteed returns or personalised buy/sell instructions.
9. Protect privacy: only use the authenticated user's records; never expose another user's data.
10. For suspected fraud, lost cards, wrong transfers, or account compromise, prioritise contacting the bank through official channels. Never ask for PINs, OTPs, CVVs, passwords, or full card credentials.

## Supported question catalogue

Each question below should be accepted in natural variations. The intent identifier, not exact wording, drives the handler.

### A. Accounts and balances
- How much money do I have across all my accounts?
- What's my available balance right now?
- Show the balance in each bank account.
- Which account has the highest balance?
- Why doesn't my app balance match my bank balance?
- How much did I deposit this month?
- How much did I withdraw this month?
- How much cash can I safely use today?
- What happens if one account has insufficient funds?
- Why is one of my accounts not updating?

### B. Income and salary
- How much did I earn this month?
- When is my next salary expected?
- How much of my salary can I save?
- Can my current income support my monthly expenses?
- What if my salary is delayed?
- My income changes every month. How should I plan?
- How much extra income do I need to reach my goal?
- What if I lose my job?
- What percentage of my income goes to fixed expenses?
- Compare this month's income with last month.

### C. Spending and transactions
- Where is my money going?
- What category did I spend the most on?
- How much did I spend today / this week / this month?
- Am I spending more than last month?
- Which expenses could I reduce?
- Did I record the same transaction twice?
- Is this pending payment included in my spending?
- Has this refund been accounted for?
- Why was I charged a fee?
- Show transactions above ₹X this month.

### D. Budgets
- Am I over my monthly budget?
- How much can I spend for the rest of this month?
- Which category is closest to its limit?
- Can I increase my food / travel / entertainment budget?
- What happens if I exceed my budget?
- How much should I allocate to entertainment?
- Can I afford an unexpected expense?
- Should unused budget roll over?
- Is my current budget realistic?
- What is my daily safe-to-spend amount?

### E. Savings and goals
- How much should I save every month?
- Am I on track for my savings goal?
- When will I reach my target at this contribution rate?
- Can I afford to save ₹10,000 every month?
- What if I miss a contribution?
- Should I save or use my leftover money?
- How much emergency cash should I keep?
- Can I work towards two goals at once?
- What if I need to withdraw from a goal?
- Which goal should I prioritise?

### F. Loans, credit cards, and debt
- How much debt do I have?
- How much do I owe across my credit cards?
- When is my next EMI due?
- Can I afford another loan?
- What happens if I miss an EMI?
- How much interest am I paying?
- Should I prioritise debt repayment or savings?
- What if I cannot pay the full card bill?
- What happens if I have multiple EMIs?
- How much of my monthly income goes to debt?

### G. Subscriptions, bills, and trials
- How much do all my subscriptions cost?
- Which subscriptions have I not used?
- What renews this week?
- What is my annual subscription cost?
- Which free trials expire soon?
- What if I forget to cancel a free trial?
- Can I afford another subscription?
- How much could I save by cancelling selected subscriptions?
- Do I have duplicate subscriptions?
- Why was I charged after a trial ended?

### H. Purchase decisions (Decide integration)
- Can I afford this purchase?
- Should I buy now or wait?
- Is this discount genuinely worthwhile?
- Will this purchase delay my savings goal?
- Should I use debit, credit, or cash?
- What would this cost me on EMI?
- How much would remain after buying it?
- Is this a need or a want?
- What if the price drops later?
- Am I rushing because the offer expires soon?

### I. Emergencies and account safety
- Could I manage three months without income?
- What if I have an unexpected medical expense?
- What if my rent increases?
- What should I do if my bank account is frozen?
- What should I do if I lose my debit card?
- I see an unauthorised transaction. What now?
- I transferred money to the wrong account. What should I do?
- What if I cannot pay all upcoming bills?
- What if my bank app or UPI is unavailable?
- How much emergency cash is immediately accessible?

### J. Planning and forecasting
- How much money may remain at month-end?
- Can I cover all upcoming commitments?
- How much can I safely spend this weekend?
- What if I spend ₹5,000 more this month?
- How much should I reserve for next month?
- What if my expenses rise by 20%?
- Can I afford a holiday next month?
- Show a six-month cash-flow projection.
- What happens if salary arrives five days late?
- Compare a normal month with a high-expense month.

### K. Investments (educational only)
- How much have I invested?
- What share of my assets is invested?
- What is the recorded value of my investments?
- How has my portfolio changed over time?
- What is the difference between saving and investing?
- What happens to my portfolio if the market falls 10%?
- How much emergency cash should remain outside investments?
- Explain diversification in simple terms.
- What risks am I exposed to?
- Why can't you guarantee investment returns?

### L. Personalised life questions
- Can I afford to go out tonight?
- Can I buy a laptop next month?
- Am I financially ready for a holiday?
- Can I afford to move into a new apartment?
- Should I postpone this purchase?
- What is putting the most pressure on my finances?
- What should I prioritise this month?
- How can I save another ₹5,000?
- What changed in my finances this month?
- Give me a financial health summary.

## Edge-case and failure matrix

| ID | Scenario / input condition | Required behaviour |
|---|---|---|
| EDGE-001 | No linked or manually added accounts | Explain that account totals are unavailable; offer account setup |
| EDGE-002 | No transactions in requested period | Say no transactions were recorded; do not infer zero real-world spending |
| EDGE-003 | Negative account balance | Show negative value and flag possible overdraft; do not clamp to zero |
| EDGE-004 | Pending debit | Separate from posted spending; show whether available balance already reflects it |
| EDGE-005 | Pending credit | Do not count as received income until posted |
| EDGE-006 | Reversed transaction | Exclude or reverse according to ledger status; avoid double counting |
| EDGE-007 | Refund linked to original purchase | Net it against the purchase only once; preserve gross and net values where useful |
| EDGE-008 | Duplicate-looking transactions | Flag as possible duplicates; never delete automatically |
| EDGE-009 | Same amount and merchant on different dates | Do not assume duplicate based on amount/merchant alone |
| EDGE-010 | Stale account sync | Display last sync time and label figures stale |
| EDGE-011 | Conflicting bank and app balances | Show both sources and explain mismatch; do not silently reconcile |
| EDGE-012 | Missing salary date | Ask for date or use clearly labelled historical estimate |
| EDGE-013 | Irregular income / gig income | Use conservative historical range; disclose sample size and period |
| EDGE-014 | No income history | Do not forecast salary or affordability from assumptions |
| EDGE-015 | Zero or negative budget limit | Reject invalid budget or explain that remaining budget is not meaningful |
| EDGE-016 | Spending exactly equals budget | Report 100% used, not over budget |
| EDGE-017 | Spending exceeds budget by a small amount | Report exact overage without rounding it away |
| EDGE-018 | Goal target already reached | Mark achieved; do not calculate a negative remaining amount |
| EDGE-019 | Goal has no target date | Calculate progress only; do not invent completion date |
| EDGE-020 | Contribution greater than remaining goal amount | Cap goal progress at target while preserving actual contribution history |
| EDGE-021 | Commitment overdue | Mark overdue using user's timezone and due-date semantics |
| EDGE-022 | Cancelled / paused commitment | Exclude from active recurring forecast unless a final charge remains due |
| EDGE-023 | Trial has no known expiry date | Do not invent expiry; mark date unknown and ask user to add it |
| EDGE-024 | Trial converts to paid subscription | Warn only when conversion date and price are known; identify uncertainty otherwise |
| EDGE-025 | Duplicate subscription records | Flag possible duplicate; do not assume same service means same billing |
| EDGE-026 | Multiple currencies | Never sum raw amounts; require dated exchange rates and disclose conversion basis |
| EDGE-027 | Missing exchange rate | Keep currencies separate and explain why total cannot be calculated |
| EDGE-028 | Leap day / month-end date arithmetic | Use calendar-aware date calculations, not fixed 30-day months |
| EDGE-029 | User timezone differs from server timezone | Use profile timezone for day, month, due-date and alert boundaries |
| EDGE-030 | Future-dated transaction | Keep out of historical actuals; treat separately as scheduled if applicable |
| EDGE-031 | Transaction has unknown category | Place in uncategorised; do not fabricate a category |
| EDGE-032 | Very large amount / decimal precision | Use Decimal; reject malformed or overflow values safely |
| EDGE-033 | User asks for another user's data | Deny; enforce ownership at query/service layer |
| EDGE-034 | Expired / invalid auth token | Return authentication error; do not leak data in error details |
| EDGE-035 | Bank API unavailable | Explain data source unavailable; use cached data only with freshness label |
| EDGE-036 | Bank API rate limit | Back off safely; do not retry indefinitely |
| EDGE-037 | No upcoming commitments | Say none are recorded; don't claim user has no real-world bills |
| EDGE-038 | Spending recommendation conflicts with essential bill | Protect known essential commitments and explain the conflict |
| EDGE-039 | User requests a guaranteed investment return | Refuse guarantee; explain uncertainty and scenario assumptions |
| EDGE-040 | Fraud / stolen card / wrong transfer | Give urgent official-bank contact steps; never request credentials or OTP |
| EDGE-041 | User asks Monetra to transfer / trade / cancel | Require explicit confirmation and supported secure workflow; otherwise explain unavailable action |
| EDGE-042 | Ambiguous question ("Can I afford it?") | Ask amount and timing, or identify the missing item; don't guess |
| EDGE-043 | Very broad time range | Confirm or state the exact period used |
| EDGE-044 | Rounding boundary | Calculate using Decimal; round only for display using documented currency precision |
| EDGE-045 | Partial data from one account | Label result partial and list included/excluded sources |
| EDGE-046 | Negative or implausible transaction amount | Validate sign and transaction type; don't silently reinterpret |
| EDGE-047 | User changes currency preference | Preserve original transaction currency and convert only with explicit rate basis |
| EDGE-048 | Empty / malformed natural-language input | Ask user to rephrase; no stack trace or generic fabricated answer |

## Intent-to-handler coverage

Implement reusable handlers, not one hardcoded answer per question:

| Handler | Example intents | Required data |
|---|---|---|
| account_summary | total_balance, account_balance, available_cash | accounts, balance type, currency, sync time |
| transaction_analytics | spending_total, category_breakdown, merchant_spend, income_total | posted transactions, dates, categories |
| cash_flow | monthly_surplus, safe_to_spend, month_end_projection | income, expenses, commitments, dates |
| budget_analysis | budget_status, budget_remaining, budget_reallocation | budget limits, posted spend, pending treatment |
| goal_analysis | goal_progress, goal_eta, contribution_plan | target, current progress, contributions, dates |
| commitment_analysis | upcoming_due, recurring_exposure, overdue_items | status, amount, frequency, due date |
| affordability | purchase_affordability, emi_scenario, goal_impact | amount, date, available funds, commitments, reserve |
| debt_analysis | debt_total, emi_burden, repayment_scenario | balances, rates, minimums, due dates |
| emergency_analysis | emergency_runway, income_shock | liquid funds, essential expenses, income assumptions |
| investment_education | portfolio_summary, risk_explanation, scenario_analysis | recorded holdings/values, explicit assumptions |
| account_safety | fraud_guidance, lost_card, wrong_transfer | user-described event only; no credentials |
| clarification | missing_amount, ambiguous_period, missing_currency | only the missing fields |

## Response contract

Every answer should be represented internally as:

- `intent`: canonical intent identifier
- `answer_status`: `complete`, `partial`, `needs_clarification`, or `unsupported`
- `answer_text`: user-facing explanation
- `facts`: structured values used in the answer, with currency and period
- `assumptions`: explicit assumptions (empty when none)
- `data_freshness`: timestamps / stale indicators
- `warnings`: risk, missing-data, or uncertainty warnings
- `suggested_actions`: safe next steps; never execute financial actions implicitly

## Test design rules

- Use deterministic fixtures with fixed dates, timezone, currencies, and transaction statuses.
- Test calculations independently from natural-language intent matching.
- Test every handler with normal, zero, negative, missing, boundary, stale, and conflicting data where relevant.
- Add paraphrases, typos, abbreviations, Hinglish, and currency formats (₹5,000; 5k; INR 5000) to intent-recognition tests.
- Assert structured outputs and numerical values, not brittle full-sentence wording.
- Keep bank-provider integration tests mocked; never require real credentials or real money.
- Use property-based tests for date ranges, decimal arithmetic, aggregation, and invariants.
- Never use production customer data in fixtures.

## Release gate

An intent is not production-ready until:
- its required context is documented;
- at least one happy-path test passes;
- missing-data and boundary tests pass;
- financial arithmetic is independently verified;
- unsafe or unauthorised actions are blocked;
- response freshness and assumptions are visible;
- tenant isolation is tested.
