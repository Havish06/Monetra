# MONETRA
## Project Documentation & Development Status

**Product:** Monetra  
**Tagline:** Money should work around your life.  
**Identity:** Intelligent Financial Orchestration  
**Current stage:** Early development — Backend foundation and mobile authentication/dashboard implemented  
**Target platforms:** Android first, iOS later

---

# 1. Project Overview

Monetra is an intelligent personal finance and life-planning companion designed to help people make better financial decisions while managing their everyday commitments.

Most financial applications focus on recording transactions, displaying account balances, or tracking expenses. Monetra aims to go beyond that.

It should understand a person's financial situation, consider their upcoming commitments, help them plan their money, and evaluate whether their financial decisions make sense in the context of their life.

Monetra is not intended to be just another expense tracker, budgeting application, or AI chatbot.

It is intended to become a personal financial orchestration system.

# 2. Sole Purpose of Monetra

**The sole purpose of Monetra is to help people make financially intelligent decisions while managing their money and life commitments in one place.**

Monetra should answer questions such as:

- How much money can I safely spend?
- How much should I save before spending?
- Can I afford this purchase without affecting my upcoming commitments?
- Is this discount genuinely worth taking advantage of?
- Am I purchasing something because I need it or because I fear missing out?
- Which subscriptions are consuming my money unnecessarily?
- What should I do with the money remaining after planned expenses?
- How do my upcoming bookings, subscriptions, bills, and trips affect my financial position?

The objective is to move users from reactive money management to proactive financial planning.

## Core philosophy

1. Understand the user's financial situation.
2. Understand their goals and commitments.
3. Evaluate financial decisions before they happen.
4. Recommend practical actions.
5. Allow the user to review and approve important decisions.
6. Continuously improve financial awareness through relevant insights.

**Monetra advises and orchestrates. The user remains in control.**

# 3. Problems Monetra Aims to Solve

### 3.1 Spend now, save later

People often spend first and attempt to save whatever remains.

Monetra should reverse this approach by encouraging users to allocate savings first and plan their expenses around the remaining money.

### 3.2 Impulse purchases and FOMO

Limited-time discounts, countdown timers, flash sales, and scarcity marketing encourage unnecessary purchases.

Monetra should evaluate:
- Actual usefulness of the product.
- Whether the discount represents meaningful savings.
- Whether the purchase is affordable.
- Whether the user already owns something similar.
- Whether waiting would be financially wiser.

### 3.3 Forgotten subscriptions and free trials

People frequently sign up for free trials and forget to cancel them before renewal.

Monetra should identify subscriptions, trials, renewal dates, and recurring charges wherever supported data is available.

### 3.4 Disconnected financial and life planning

A person's financial situation is affected by more than transactions.

Travel bookings, restaurant reservations, event tickets, upcoming bills, and other commitments affect how much money is actually available.

Monetra should bring these considerations together.

### 3.5 Lack of financial clarity

Users may know their account balance but not how much of that balance is already committed.

Monetra should distinguish between:
- Total available balance.
- Planned expenses.
- Upcoming financial obligations.
- Savings allocations.
- Discretionary spending capacity.

# 4. Main Product Modules

## 4.1 Personal Finance Management

The foundation of Monetra.

Expected functionality:
- Financial account management.
- Multiple accounts.
- Income and expense tracking.
- Transaction categorization.
- Monthly cash-flow analysis.
- Budget creation and monitoring.
- Savings goals.
- Savings contributions.
- Financial summaries and reports.

## 4.2 Financial Planning Engine

This module should help users organize their money before spending it.

Expected functionality:
- Monthly salary planning.
- Savings allocation.
- Expense scheduling.
- Upcoming obligation calculations.
- Remaining balance projections.
- Monthly financial recommendations.

The initial planning workflow assumes the user receives their salary around the fifth of each month. This should eventually be configurable.

## 4.3 Purchase Decision Engine

One of Monetra's defining features.

Before making a purchase, users should be able to evaluate whether it is financially sensible.

The engine should consider:
- Purchase price.
- Available discretionary money.
- Existing commitments.
- Savings goals.
- Upcoming expenses.
- Product usefulness.
- Urgency and alternatives.

It should provide an understandable recommendation rather than blindly approving or rejecting purchases.

## 4.4 Sale Countdown and FOMO Protection

A feature designed to address urgency-driven purchases.

Expected functionality:
- Evaluate limited-time offers.
- Identify artificial urgency where possible.
- Compare purchase urgency against actual need.
- Determine whether the purchase fits the user's financial plan.
- Recommend buying, waiting, or avoiding the purchase.

## 4.5 Subscription Watchtower

Expected functionality:
- Track recurring subscriptions.
- Track free trials.
- Record renewal dates.
- Estimate recurring monthly and annual costs.
- Notify users before renewals.
- Identify potentially unnecessary subscriptions.

## 4.6 Life Management

Monetra should also help users organize commitments that affect their finances.

Expected functionality:
- Reservations.
- Bookings.
- Trips and itineraries.
- Event tickets.
- Upcoming events.
- Payment obligations.
- Important dates and reminders.

## 4.7 Gmail Integration

Planned integration using Google's OAuth authorization.

Initially, Monetra should use read-only Gmail access with explicit user consent.

It should identify relevant information from emails, such as:
- Receipts.
- Subscription confirmations.
- Free-trial registrations.
- Renewal notifications.
- Booking confirmations.
- Travel itineraries.
- Ticket confirmations.
- Payment reminders.

Gmail discovery cannot guarantee finding every account or transaction. Users must be able to review discovered information before it becomes part of their records.

## 4.8 AI Orchestrator

The intelligence layer connecting the different modules.

It should understand the user's financial context and coordinate recommendations across the application.

Examples:
- Suggesting a savings allocation after salary arrives.
- Evaluating whether a purchase is affordable.
- Warning about upcoming subscription renewals.
- Identifying conflicts between planned expenses and upcoming commitments.
- Recommending what to do with remaining monthly funds.

AI should interpret information and generate recommendations. Deterministic backend logic should perform calculations, enforce constraints, and validate financial operations.

## 4.9 Investment Intelligence

A future module for investment awareness and research.

Expected functionality:
- Investment tracking.
- Basic portfolio visibility.
- Market information.
- Investment research.
- Risk and performance insights.

The initial scope is research and tracking, not autonomous trading or execution of investment transactions.

# 5. Technology Stack

| Layer | Technology |
|---|---|
| Mobile application | React Native |
| Mobile framework | Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| Backend | FastAPI |
| Backend language | Python |
| Database | Supabase PostgreSQL |
| ORM | SQLAlchemy |
| Database driver | Psycopg 3 |
| Migrations | Alembic |
| Authentication | Supabase Auth |
| Data validation | Pydantic |
| Local caching | AsyncStorage |
| Secure token storage | Expo SecureStore |
| Notifications | Expo Notifications (planned integration) |

## Architecture

Monetra currently follows a modular monolithic architecture.

The mobile application communicates with the FastAPI backend. The backend validates authenticated requests, processes business logic, and interacts with PostgreSQL.

Supabase provides authentication and PostgreSQL hosting.

Future modules should extend the existing architecture rather than introducing unnecessary microservices.

# 6. What Has Been Implemented

## 6.1 Backend foundation

**Status: Implemented**

- FastAPI application initialized.
- Environment-based configuration.
- PostgreSQL connection established.
- SQLAlchemy configured.
- Alembic initialized.
- Database migrations successfully applied.
- Health-check endpoint.
- Database connectivity endpoint.

## 6.2 Database models

**Status: Implemented**

The following database models have been created:

| Model | Purpose |
|---|---|
| User | Monetra user profile |
| FinancialAccount | User financial accounts |
| Transaction | Income and expense records |
| Budget | Budget allocations |
| SavingsGoal | Savings targets |
| SavingsContribution | Contributions towards goals |
| Commitment | Subscriptions and upcoming obligations |

The User model also maps the internal Monetra user to the Supabase authentication user.

## 6.3 Authentication

**Status: Implemented, with further hardening required**

- Supabase signup.
- Supabase login.
- Session persistence.
- Secure token storage.
- Backend bearer-token validation.
- User identity verification through Supabase.
- Mapping Supabase identities to Monetra database users.
- Protected backend routes.
- Logout.
- Local profile caching.

The authentication flow has been tested on the mobile application.

Email-confirmation and deep-link handling still need further work if email confirmation is enabled.

## 6.4 Financial Accounts API

**Status: Implemented**

Available operations:
- Create account.
- List accounts.
- Retrieve account.
- Update account.
- Delete account.

The account CRUD operations have been manually tested.

## 6.5 Transactions API

**Status: Implemented**

Available operations:
- Create transactions.
- Retrieve transactions.
- Filter transactions.
- Update transactions.
- Delete transactions.
- Support income and expense transaction types.

Further business logic is needed to ensure transactions consistently affect account balances and financial summaries.

## 6.6 Budgets API

**Status: Implemented**

Available operations:
- Create budgets.
- Retrieve budgets.
- Update budgets.
- Delete budgets.
- Retrieve budget summaries.

Recurring budgets and rollover logic remain future work.

## 6.7 Savings Goals API

**Status: Implemented**

Available operations:
- Create savings goals.
- Retrieve goals.
- Update goals.
- Delete goals.
- Record savings contributions.
- Retrieve contributions.

## 6.8 Commitments API

**Status: Implemented**

Available operations:
- Create commitments.
- Retrieve commitments.
- Update commitments.
- Delete commitments.
- Retrieve upcoming commitments.

This provides the initial foundation for subscription and obligation management.

## 6.9 Dashboard API

**Status: Implemented**

The dashboard aggregates:

- Total account balance.
- Monthly income.
- Monthly expenses.
- Monthly net cash flow.
- Total savings target.
- Total saved.
- Upcoming commitments count.
- Financial accounts.
- Recent transactions.
- Budgets.
- Savings goals.
- Upcoming commitments.

## 6.10 Mobile application

**Status: Partially implemented**

Implemented:
- Expo React Native application.
- Expo Router navigation.
- Authentication context.
- Signup and login screens.
- Session persistence.
- Navigation guard.
- Profile synchronization.
- Dashboard screen.
- Dashboard API integration.
- Dashboard cache.
- Profile cache.
- Loading and error handling.

The dashboard can display cached information immediately and refresh it in the background. The user has reported dashboard loading in under one second.

# 7. Current Development Status

| Component | Status |
|---|---|
| Backend foundation | Implemented |
| PostgreSQL connection | Working |
| Database migrations | Applied |
| User authentication | Working |
| Protected APIs | Implemented |
| Financial accounts API | Implemented |
| Transactions API | Implemented |
| Budgets API | Implemented |
| Savings goals API | Implemented |
| Savings contributions API | Implemented |
| Commitments API | Implemented |
| Dashboard aggregation | Implemented |
| Mobile authentication | Working |
| Mobile dashboard | Implemented |
| Local caching | Implemented |
| Complete finance UI | Pending |
| Financial planning engine | Pending |
| Purchase decision engine | Pending |
| Subscription intelligence | Pending |
| Gmail integration | Pending |
| Life management UI | Pending |
| AI orchestrator | Pending |
| Investment intelligence | Pending |
| Production release | Pending |

*Implemented means the foundation or functionality described has been built; it does not mean every production scenario has been tested.*

# 8. What Needs to Be Done

## Phase 1 — Complete Core Financial Application

Priority: Highest

- Complete financial accounts screens.
- Add transaction creation and editing screens.
- Add transaction categories.
- Add transaction history and filtering.
- Complete budget management screens.
- Add budget progress and visualizations.
- Complete savings goal management.
- Add savings contribution screens.
- Complete commitment and subscription screens.
- Implement account balance updates.
- Ensure financial calculations are consistent.
- Add dashboard cache invalidation.
- Add appropriate empty, loading, and error states.

**Expected outcome:** Users can manage their everyday finances entirely through Monetra.

## Phase 2 — Financial Planning

- Salary-day planning.
- Monthly financial allocation.
- Savings-first workflow.
- Scheduled expense planning.
- Available spending calculations.
- Upcoming obligation analysis.
- Remaining balance projections.
- Financial insights.

**Expected outcome:** Monetra becomes a proactive financial planner rather than just a financial record keeper.

## Phase 3 — Purchase Intelligence

- Purchase evaluation.
- Affordability calculations.
- Discount evaluation.
- FOMO protection.
- Sale countdown.
- Buy, wait, or avoid recommendations.
- Financial impact analysis.

**Expected outcome:** Users can make more informed purchasing decisions.

## Phase 4 — Subscription Management

- Subscription records.
- Free-trial tracking.
- Renewal schedules.
- Recurring expense calculations.
- Renewal notifications.
- Subscription insights.

**Expected outcome:** Users can monitor recurring financial commitments and avoid forgotten renewals.

## Phase 5 — Life Management

- Booking management.
- Reservations.
- Travel planning.
- Itineraries.
- Events and tickets.
- Calendar integration.
- Upcoming payment obligations.

**Expected outcome:** Financial planning and everyday commitments become connected.

## Phase 6 — Gmail Integration

- Google OAuth.
- Read-only Gmail access.
- Email discovery.
- Receipt extraction.
- Subscription discovery.
- Booking and travel discovery.
- Renewal detection.
- User review and confirmation.
- Duplicate detection.

**Expected outcome:** Monetra can reduce manual entry by discovering relevant information from authorized email accounts.

## Phase 7 — AI Orchestrator

- Context-aware recommendations.
- Financial planning assistance.
- Purchase decision explanations.
- Subscription analysis.
- Financial insights.
- Cross-module coordination.
- Personalized recommendations.

**Expected outcome:** Monetra becomes an intelligent assistant that understands the user's financial and life context.

## Phase 8 — Production Readiness

- Comprehensive backend testing.
- Authentication and authorization hardening.
- Database isolation checks.
- Input validation.
- Error handling.
- Offline and network failure handling.
- Notification testing.
- Performance optimization.
- Privacy and security review.
- Android release build.
- iOS compatibility and release preparation.

# 9. Important Engineering Principles

These principles should remain consistent throughout development.

### 9.1 User control

Monetra must never autonomously execute purchases, bookings, cancellations, or financial transactions.

It can recommend and prepare actions, but the user must review and explicitly approve them.

### 9.2 Financial accuracy

Financial calculations must be handled by deterministic backend logic.

AI-generated answers must not be trusted as the source of truth for balances, budgets, or affordability.

### 9.3 Privacy

- Use OAuth for third-party integrations.
- Never request Gmail passwords.
- Request only necessary permissions.
- Protect authentication tokens.
- Keep financial records isolated by user.
- Avoid unnecessary collection of personal information.

### 9.4 Modularity

Each major feature should have a clear separation between:
- Database models.
- Validation schemas.
- API routes.
- Business logic.
- Mobile screens.
- Reusable UI components.

### 9.5 Reliability

The application should handle:
- Network failures.
- Expired authentication sessions.
- Duplicate requests.
- Invalid input.
- Stale cached data.
- Partial failures.

### 9.6 AI is not the financial engine

AI interprets, explains, and recommends.

The backend calculates, validates, and executes approved operations.

# 10. What Monetra Is Not

To prevent the product from losing its identity, the following distinctions are important:

- It is not merely an expense tracker.
- It is not just a budgeting application.
- It is not a banking application.
- It is not a stock-trading platform.
- It is not an autonomous purchasing agent.
- It is not simply a chatbot connected to financial data.

These may overlap with individual features, but they are not the central purpose.

# 11. Long-Term Product Vision

The long-term goal is to create one system that understands the relationship between a person's money, decisions, goals, and commitments.

A user should not have to switch between multiple applications just to understand whether they can afford something, whether a subscription is worth keeping, or how an upcoming trip affects their monthly finances.

Monetra should connect these pieces and provide a clearer picture of the user's financial life.

## Final Definition

**MONETRA is an intelligent financial orchestration platform that helps individuals plan, manage, and optimize their money by connecting financial data, spending decisions, savings goals, subscriptions, and everyday life commitments into one coordinated system.**

**Money should work around your life.**