import { hasPermission } from "../../utils/permissions";

const merchantNav = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
      {
        key: "payments", label: "Payments", icon: "payments", children: [
          { key: "transactions", label: "Transactions", path: "/merchant/dashboard/transactions", permission: "transactions.read" },
          { key: "payment-links", label: "Payment Links", path: "/merchant/dashboard/payment-links", permission: "payment_links.read" },
          { key: "customers", label: "Customers", path: "/merchant/dashboard/customers", permission: "customers.read" },
        ],
      },
      {
        key: "wallet", label: "Wallet", icon: "wallet", children: [
          { key: "wallet-balance", label: "Balance", path: "/merchant/dashboard/wallet", permission: "ledger.read" },
          { key: "wallet-transactions", label: "Transactions", path: "/merchant/dashboard/wallet/transactions", permission: "ledger.read" },
          { key: "withdraw", label: "Withdraw", path: "/merchant/dashboard/wallet/withdraw", permission: "payouts.create" },
        ],
      },
      {
        key: "business", label: "Business", icon: "business", children: [
          { key: "business-profile", label: "Business Profile", path: "/merchant/dashboard/business", permission: "merchants.read" },
          { key: "team-members", label: "Team Members", path: "/merchant/dashboard/team", permission: "team.read" },
          { key: "roles-permissions", label: "Roles & Permissions", path: "/merchant/dashboard/roles", permission: "roles.read" },
          { key: "settings", label: "Settings", path: "/merchant/dashboard/settings", permission: "settings.read" },
        ],
      },
      {
        key: "developers", label: "Developers", icon: "developers", children: [
          { key: "api-docs", label: "API Documentation", path: "/merchant/dashboard/api-docs" },
          { key: "api-keys", label: "API Keys", path: "/merchant/dashboard/api-keys", permission: "api_keys.read" },
          { key: "webhooks", label: "Webhooks", path: "/merchant/dashboard/webhooks", permission: "webhooks.read" },
        ],
      },
      { key: "notifications", label: "Notifications", icon: "notifications", path: "/merchant/dashboard/notifications" },
      { key: "support", label: "Support", icon: "support", path: "/merchant/dashboard/support" },
    ],
  },
];

export function buildMerchantNav(permissions) {
  const filterItem = (item) => {
    if (item.permission && !hasPermission(permissions, item.permission)) return null;
    if (!item.children) return item;
    const children = item.children.filter((child) =>
      !child.permission || hasPermission(permissions, child.permission),
    );
    return children.length ? { ...item, children } : null;
  };

  return merchantNav.map((section) => ({
    ...section,
    items: section.items.map(filterItem).filter(Boolean),
  }));
}
