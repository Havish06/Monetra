
from dataclasses import dataclass, field


@dataclass
class Intent:
    name: str
    category: str
    examples: list[str]
    required_context: list[str] = field(default_factory=list)
    clarification_required: bool = False


QUESTION_BANK: list[Intent] = [

    # BANK ACCOUNTS
    Intent(
        "list_accounts",
        "bank_accounts",
        [
            "Show my bank accounts",
            "What accounts do I have?",
            "List all my accounts",
            "Which banks are connected?",
            "How many accounts do I have?",
            "Show my savings accounts",
            "Mere saare accounts dikhao",
            "Mere kaun kaun se bank accounts linked hain?",
            "Which accounts have I added?",
            "Show all my linked accounts",
        ],
        ["authenticated_user"],
    ),

    Intent(
        "total_account_balance",
        "bank_accounts",
        [
            "How much money do I have?",
            "What's my total balance?",
            "How much do I have across all accounts?",
            "What's my combined bank balance?",
            "Add up all my account balances",
            "How much money is in my banks?",
            "Total balance batao",
            "Mere sabhi accounts mein kitne paise hain?",
            "What's my overall balance?",
            "How much cash do I have in total?",
        ],
        ["linked_accounts", "balance_freshness"],
    ),

    Intent(
        "single_account_balance",
        "bank_accounts",
        [
            "What's my HDFC balance?",
            "Check my SBI balance",
            "How much is in my savings account?",
            "What's left in my salary account?",
            "Show my ICICI balance",
            "Balance in my main account?",
            "Mere HDFC mein kitna balance hai?",
            "How much money is in my Axis account?",
        ],
        ["linked_accounts"],
        True,
    ),

    # INCOME AND SALARY
    Intent(
        "salary_arrival_date",
        "income",
        [
            "When will my salary arrive?",
            "When is my next payday?",
            "What day do I get paid?",
            "Salary kab aayegi?",
            "When should I expect my paycheck?",
            "Is my salary due this week?",
            "When did I usually receive my salary?",
            "Predict my next salary date",
        ],
        ["salary_transaction_history"],
    ),

    Intent(
        "salary_amount",
        "income",
        [
            "How much salary do I get?",
            "What's my monthly income?",
            "Show my last salary credit",
            "How much do I earn every month?",
            "What's my take-home salary?",
            "Meri monthly salary kitni hai?",
            "Compare my last three salaries",
        ],
        ["income_transactions"],
    ),

    # TRANSACTIONS AND SPENDING
    Intent(
        "search_transactions",
        "transactions",
        [
            "Show my recent transactions",
            "What did I spend yesterday?",
            "Find my Amazon payments",
            "Show transactions above 5000",
            "Where did my money go?",
            "Show my UPI payments",
            "Mere recent transactions dikhao",
            "Find my Swiggy payment",
            "Show all my debits this month",
            "Did I pay Netflix?",
        ],
        ["transaction_history"],
    ),

    Intent(
        "explain_transaction",
        "transactions",
        [
            "What is this 799 rupee transaction?",
            "Why was I charged 499?",
            "Explain this debit",
            "I don't recognise this payment",
            "Who charged my card?",
            "What did I pay 2000 for?",
            "Ye transaction kya hai?",
            "Can you identify this unknown merchant?",
        ],
        ["transaction_details"],
        True,
    ),

    Intent(
        "spending_summary",
        "spending",
        [
            "How much did I spend this month?",
            "Show my monthly expenses",
            "Where am I spending the most?",
            "Give me an expense breakdown",
            "How much did I spend this week?",
            "Compare this month with last month",
            "Iss month kitna kharcha hua?",
            "Show my category-wise spending",
        ],
        ["transaction_history", "date_range"],
    ),

    # BUDGETS
    Intent(
        "budget_status",
        "budgets",
        [
            "Am I within my budget?",
            "How much budget is left?",
            "Which budgets have I exceeded?",
            "How much can I spend on food?",
            "Am I overspending?",
            "Budget mein kitna bacha hai?",
            "Show my budget status",
            "Which category is closest to its limit?",
        ],
        ["budgets", "categorized_transactions"],
    ),

    Intent(
        "create_or_change_budget",
        "budgets",
        [
            "Set my food budget to 5000",
            "Create a monthly travel budget",
            "Increase my shopping budget",
            "Change my entertainment limit to 2000",
            "Set a budget for groceries",
            "Mera monthly fuel budget 2500 kar do",
            "Lower my shopping budget next month",
        ],
        ["budget_preferences"],
        True,
    ),

    # SAVINGS
    Intent(
        "savings_goal_progress",
        "savings",
        [
            "How close am I to my savings goal?",
            "Show my emergency fund progress",
            "How much have I saved for my laptop?",
            "How much more do I need to save?",
            "Am I on track for my goal?",
            "Mera savings goal kitna complete hua?",
            "When will I reach my target?",
        ],
        ["savings_goals", "contributions"],
    ),

    Intent(
        "plan_savings",
        "savings",
        [
            "How much should I save every month?",
            "Can I save 10000 monthly?",
            "Help me reach my goal by December",
            "How much should I save every payday?",
            "Plan my savings for a new phone",
            "Mujhe har mahine kitna save karna chahiye?",
        ],
        ["income", "commitments", "savings_goals"],
        True,
    ),

    # CASH FLOW
    Intent(
        "safe_to_spend",
        "cash_flow",
        [
            "How much can I safely spend?",
            "Can I afford to spend 3000 today?",
            "How much is left after bills?",
            "What's my safe-to-spend amount?",
            "How much can I spend until payday?",
            "Abhi kitna kharch kar sakta hoon?",
            "Do I have enough spare cash?",
        ],
        ["balances", "commitments", "savings", "budgets"],
    ),

    Intent(
        "cash_shortfall_forecast",
        "cash_flow",
        [
            "Will I run out of money before payday?",
            "Can I cover all my bills?",
            "Will my balance go negative?",
            "Do I have enough for rent and EMI?",
            "Payday se pehle paise khatam toh nahi honge?",
            "Forecast my balance this month",
        ],
        ["balances", "income", "commitments"],
    ),

    # BILLS AND SUBSCRIPTIONS
    Intent(
        "upcoming_commitments",
        "bills",
        [
            "What bills are due next?",
            "Show my upcoming payments",
            "What do I need to pay this week?",
            "When is my next EMI?",
            "Mere upcoming bills dikhao",
            "What's due before payday?",
            "List my recurring expenses",
        ],
        ["commitments"],
    ),

    Intent(
        "subscription_audit",
        "subscriptions",
        [
            "Which subscriptions am I paying for?",
            "Find my active subscriptions",
            "Am I paying for anything I don't use?",
            "Show my recurring app charges",
            "How much do subscriptions cost monthly?",
            "Which free trials are expiring?",
            "Koi unnecessary subscription hai kya?",
        ],
        ["recurring_transactions"],
    ),

    # CREDIT CARDS AND LOANS
    Intent(
        "credit_card_due",
        "credit_cards",
        [
            "When is my credit card bill due?",
            "How much do I owe on my card?",
            "What's my minimum due?",
            "Show my next card payment",
            "Credit card ka due date kya hai?",
            "Did I pay my card bill?",
        ],
        ["credit_card_data"],
        True,
    ),

    Intent(
        "loan_emi_details",
        "loans",
        [
            "What EMIs do I have?",
            "How much do I pay in loans monthly?",
            "When is my next EMI?",
            "How many EMIs are left?",
            "Mera next EMI kab hai?",
            "Show my active loans",
        ],
        ["loan_details"],
        True,
    ),

    # DECIDE
    Intent(
        "evaluate_purchase",
        "decide",
        [
            "Should I buy this right now?",
            "Can I afford a new phone?",
            "Should I spend 15000 on shoes?",
            "Should I wait until next month?",
            "Can I buy this without hurting my savings?",
            "Ye purchase karna chahiye kya?",
            "Is this worth my money?",
            "Should I buy now or save?",
        ],
        ["purchase_price", "cash_flow", "budgets", "goals"],
        True,
    ),

    Intent(
        "compare_purchase_options",
        "decide",
        [
            "Which of these two should I buy?",
            "Compare these phones for my budget",
            "Should I choose EMI or upfront payment?",
            "Which option affects my savings less?",
            "Help me choose between these laptops",
            "Is no-cost EMI worth it?",
            "Compare these purchase options",
        ],
        ["purchase_options", "cash_flow"],
        True,
    ),

    # FRAUD AND SECURITY
    Intent(
        "unknown_transaction_help",
        "security",
        [
            "I see a payment I didn't make",
            "Someone used my card",
            "There is an unknown UPI debit",
            "I think my account was hacked",
            "I was charged twice",
            "Mere account se unknown paise kat gaye",
            "What should I do about a suspicious debit?",
        ],
        ["user_reported_issue"],
    ),

    # FINANCIAL PLANNING
    Intent(
        "monthly_money_plan",
        "planning",
        [
            "Plan my money for this month",
            "Help me manage my salary",
            "How should I divide my income?",
            "Make a budget from my next paycheck",
            "What should I do with leftover money?",
            "Salary aane ke baad paise kaise manage karun?",
            "Create a monthly financial plan",
        ],
        ["income", "commitments", "budgets", "goals"],
        True,
    ),

    # INVESTMENT EDUCATION
    Intent(
        "investment_education",
        "investments",
        [
            "Explain mutual funds",
            "What's the difference between stocks and mutual funds?",
            "What is an SIP?",
            "How does investment risk work?",
            "What is an index fund?",
            "Mutual funds kaise kaam karte hain?",
            "Explain compounding",
            "What is diversification?",
        ],
    ),

    # CONVERSATIONAL FOLLOW-UPS
    Intent(
        "change_timeframe",
        "conversation",
        [
            "What about last month?",
            "And for this week?",
            "Show me the same thing for October",
            "What about next month?",
            "Compare it with the previous month",
            "Aur pichhle mahine ka?",
            "Only show the last 7 days",
        ],
        ["previous_intent"],
        True,
    ),

    Intent(
        "change_account_scope",
        "conversation",
        [
            "Only my HDFC account",
            "What about my other account?",
            "Exclude my savings account",
            "Show just my salary account",
            "Across all banks instead",
            "Same thing but for SBI",
        ],
        ["previous_intent", "linked_accounts"],
        True,
    ),

    Intent(
        "what_if_scenario",
        "conversation",
        [
            "What if I spend 2000 more?",
            "What if I save 5000 instead?",
            "What happens if my rent increases?",
            "What if I delay this purchase?",
            "Suppose I get paid late",
            "Agar 1000 extra kharch karun toh?",
            "Try it with 15000",
        ],
        ["previous_intent"],
        True,
    ),

    Intent(
        "explain_previous_result",
        "conversation",
        [
            "Why?",
            "How did you calculate that?",
            "Explain that simply",
            "Where did this number come from?",
            "Can you break it down?",
            "Show me the calculation",
            "What assumptions did you make?",
        ],
        ["previous_result"],
    ),

    # AMBIGUOUS QUESTIONS
    Intent(
        "request_clarification",
        "ambiguous",
        [
            "How much do I have?",
            "Can I afford it?",
            "Is it enough?",
            "What should I do?",
            "Show me that",
            "Is this okay?",
            "How much is left?",
            "Can you check it?",
        ],
        ["conversation_context"],
        True,
    ),

    # GENERAL
    Intent(
        "capabilities_help",
        "general",
        [
            "What can you help me with?",
            "What can Monetra do?",
            "How do I use this app?",
            "Can you track my subscriptions?",
            "Can you make payments for me?",
            "What can I ask you?",
            "Help me understand Decide",
        ],
    ),
]
