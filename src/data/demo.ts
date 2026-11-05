
export const demoFinance = {
  user: {
    firstName: "Havish",
    currency: "₹",
  },

  balance: {
    available: 24500,
    income: 45000,
    spent: 12800,
    committed: 7700,
    savings: 5000,
  },

  cashFlow: [
    { day: "01", amount: 45000 },
    { day: "05", amount: 39000 },
    { day: "10", amount: 35000 },
    { day: "15", amount: 31800 },
    { day: "20", amount: 28500 },
    { day: "25", amount: 24500 },
  ],

  upcoming: [
    {
      id: "1",
      title: "Internet bill",
      subtitle: "Tomorrow · Utilities",
      amount: 999,
      type: "bill",
    },
    {
      id: "2",
      title: "Design tool trial",
      subtitle: "In 3 days · Trial ending",
      amount: 799,
      type: "trial",
    },
    {
      id: "3",
      title: "Dinner with friends",
      subtitle: "Nov 16 · Lifestyle",
      amount: 1200,
      type: "event",
    },
  ],
};

export type UpcomingItemData =
  (typeof demoFinance.upcoming)[number];
