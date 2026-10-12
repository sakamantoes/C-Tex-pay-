import React, { useState, useRef, useEffect, useMemo } from "react";

/*
|--------------------------------------------------------------------------
| SUPPORT BOT — C-TEX PAY
|--------------------------------------------------------------------------
| Client-side rule-based assistant.
| No backend calls. Answers questions using keyword matching + conditionals.
|
| Rules are organized by topic:
|   - Greetings
|   - Getting started
|   - API keys
|   - Payments
|   - Customers
|   - Transactions
|   - Fees
|   - Balance / Ledger
|   - Payouts / Withdrawals
|   - Webhooks
|   - Team / Roles / Permissions
|   - Errors & troubleshooting
|   - Security
|   - Fallback
|
| To add a new rule, push an entry into RULES below.
|--------------------------------------------------------------------------
*/

// ---------- Rule engine ----------

const KEYWORD_MATCH = (message, patterns) => {
  const lower = message.toLowerCase();
  return patterns.some((p) => lower.includes(p));
};

const RULES = [
  // ---------------- Greetings ----------------
  {
    id: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good evening", "good afternoon"],
    reply:
      "Hello! I'm the C-TEX PAY assistant. I can help with payments, customers, API keys, transactions, fees, balance, payouts, webhooks, and your team. What would you like to know?",
    quickReplies: [
      "How do I create a payment?",
      "How do I get an API key?",
      "How do I add a customer?",
      "What are your fees?",
    ],
  },

  // ---------------- Getting started ----------------
  {
    id: "getting-started",
    keywords: ["get started", "onboarding", "how to start", "first steps", "setup"],
    reply:
      "To get started with C-TEX PAY:\n\n1. Create your merchant account and complete your business profile.\n2. Generate an API key from your dashboard.\n3. Create a customer (or use the one you already have).\n4. Initialize a payment with the customer's details.\n5. Share the payment instructions with your customer.\n\nNeed help on any specific step? Just ask.",
    quickReplies: [
      "How do I create a payment?",
      "How do I get an API key?",
      "How do I add a customer?",
    ],
  },

  // ---------------- API Keys ----------------
  {
    id: "api-key-create",
    keywords: ["api key", "apikey", "secret key", "generate key", "create key"],
    reply:
      "To create an API key:\n\n1. Log in to your dashboard.\n2. Go to API Keys.\n3. Click Create API Key.\n4. Give it a name, pick environment (TEST or LIVE), and choose permissions.\n5. Copy the key immediately — it's shown only once.\n\nStore it securely in your backend. Never expose it in frontend code or browser requests.",
    quickReplies: [
      "What permissions can I assign?",
      "How do I rotate an API key?",
      "How do I revoke an API key?",
    ],
  },
  {
    id: "api-key-permissions",
    keywords: ["api key permission", "key permission", "scope"],
    reply:
      "API keys support fine-grained permissions:\n\n• payments.create — initialize payments\n• payments.read — view payments\n• customers.create / read / update / delete — customer management\n• transactions.read — view transactions\n• payouts.create / read — withdrawals\n• api_keys.read / create / revoke — key management\n\nOnly grant what your integration needs.",
    quickReplies: [
      "How do I create an API key?",
      "How do I rotate an API key?",
    ],
  },
  {
    id: "api-key-rotate",
    keywords: ["rotate key", "rotate api", "regenerate key"],
    reply:
      "To rotate an API key:\n\n1. Go to API Keys in your dashboard.\n2. Open the key you want to rotate.\n3. Click Rotate.\n4. The new key is shown once — copy and store it.\n\nThe old key is revoked immediately. Update your backend before rotating.",
    quickReplies: ["How do I revoke an API key?"],
  },
  {
    id: "api-key-revoke",
    keywords: ["revoke key", "delete key", "disable key"],
    reply:
      "To revoke an API key:\n\n1. Go to API Keys.\n2. Open the key.\n3. Click Revoke.\n\nRevocation is immediate. Any request using that key will be rejected with 401. The key record is kept for audit but can no longer be used.",
    quickReplies: ["How do I create a new API key?"],
  },

  // ---------------- Customers ----------------
  {
    id: "customer-create",
    keywords: ["add customer", "create customer", "new customer", "register customer"],
    reply:
      "To add a customer:\n\nYou can create a customer from your dashboard or via the API.\n\nRequired fields: firstName, lastName, email.\nOptional: phone, metadata.\n\nExample API request:\nPOST /api/v1/customers\n{ \"firstName\": \"Jane\", \"lastName\": \"Doe\", \"email\": \"jane@example.com\", \"phone\": \"08012345678\" }\n\nEach customer is scoped to your merchant — you can only see your own.",
    quickReplies: [
      "Can two merchants have the same customer email?",
      "How do I list my customers?",
    ],
  },
  {
    id: "customer-duplicate",
    keywords: ["duplicate customer", "same email", "customer already exist"],
    reply:
      "Customer emails are unique per merchant. The same email can exist under two different merchants, but not twice under one. If you try to create a duplicate, you'll get a 409 Conflict. To update an existing customer, use PATCH instead of POST.",
    quickReplies: ["How do I add a customer?"],
  },
  {
    id: "customer-list",
    keywords: ["list customer", "view customer", "find customer", "search customer"],
    reply:
      "List your customers:\n\nGET /api/v1/customers?page=1&limit=20&search=jane&status=ACTIVE\n\nSupports pagination, search by name/email/phone, and status filtering. All results are scoped to your merchant automatically.",
    quickReplies: ["How do I add a customer?"],
  },

  // ---------------- Payments ----------------
  {
    id: "payment-create",
    keywords: ["create payment", "initialize payment", "make payment", "collect payment", "new payment"],
    reply:
      "To collect a payment:\n\nPOST /api/v1/payments\n\nBody:\n{\n  \"amount\": 200000,\n  \"currency\": \"NGN\",\n  \"customerId\": \"<customer-uuid>\",\n  \"reference\": \"ORDER-123\",\n  \"paymentMethod\": \"ACCOUNT_TRANSFER\"\n}\n\nAmount is in kobo. 200000 = ₦2,000.\n\nThe response contains paymentInstructions with the bank account your customer should transfer to.",
    quickReplies: [
      "What amount format do you use?",
      "How do I know when a payment is successful?",
      "What happens if I send the same request twice?",
    ],
  },
  {
    id: "payment-amount-unit",
    keywords: ["amount format", "kobo", "naira", "amount unit", "how much is 200000"],
    reply:
      "All amounts are in kobo (the smallest NGN unit).\n\n• ₦50 = 5000\n• ₦2,000 = 200000\n• ₦25,000 = 2500000\n\nThis avoids floating-point errors and is the industry standard for payment systems.",
    quickReplies: ["How do I create a payment?"],
  },
  {
    id: "payment-idempotency",
    keywords: ["duplicate payment", "same request twice", "idempotency", "idempotent", "retry payment"],
    reply:
      "Payments are idempotent. If you send the same request twice with the same Idempotency-Key header:\n\n• Same payload → you get the original payment back (no duplicate).\n• Different payload with same key → 409 Conflict.\n\nAlways send an Idempotency-Key header when creating payments. It protects you from network retries creating duplicate charges.",
    quickReplies: [
      "How do I create a payment?",
      "How do I know when a payment is successful?",
    ],
  },
  {
    id: "payment-status",
    keywords: ["payment status", "is payment successful", "when will payment succeed", "pending payment"],
    reply:
      "A payment starts as PENDING. It becomes SUCCESS once we confirm the customer's transfer with the payment provider.\n\nStatuses:\n• PENDING — awaiting customer transfer\n• SUCCESS — payment confirmed\n• FAILED — payment failed\n• EXPIRED — no payment within the time window\n• CANCELLED — cancelled before completion\n\nYou receive a webhook when the status changes.",
    quickReplies: [
      "What are webhooks?",
      "How do I verify a payment?",
    ],
  },
  {
    id: "payment-verify",
    keywords: ["verify payment", "check payment", "payment confirmation"],
    reply:
      "To verify a payment on demand:\n\nPOST /api/v1/payments/:paymentReference/verify\n\nThis asks the provider for the latest status and updates your payment record. Use it as a fallback if a webhook is delayed, or when your customer says they've paid.",
    quickReplies: ["What are webhooks?"],
  },

  // ---------------- Transactions ----------------
  {
    id: "transaction-list",
    keywords: ["transaction", "list transaction", "view transactions", "payment history"],
    reply:
      "View your transactions:\n\n• Dashboard: GET /api/v1/transactions/dashboard\n• API: GET /api/v1/transactions\n\nSupports pagination (page, limit), filters (status, paymentMethod, customerId, date range, amount range), and search by reference.\n\nEach transaction includes a fee breakdown.",
    quickReplies: [
      "How do I filter by date?",
      "How do I see fees on transactions?",
    ],
  },
  {
    id: "transaction-detail",
    keywords: ["transaction detail", "single transaction", "one transaction"],
    reply:
      "Get a single transaction:\n\n• Dashboard: GET /api/v1/transactions/dashboard/:paymentReference\n• API: GET /api/v1/transactions/:paymentReference\n\nThe response includes the customer, amount, status, and the fee breakdown (gross, service fee, total fee, merchant net).",
    quickReplies: ["How do I list transactions?"],
  },

  // ---------------- Fees ----------------
  {
    id: "fees-explainer",
    keywords: ["fee", "fees", "how much do you charge", "pricing", "commission", "charge"],
    reply:
      "Our service fee is configurable per merchant. Every payment has a fee snapshot with:\n\n• Gross amount — what the customer paid\n• Service fee — our charge\n• Total fee — what you pay\n• Merchant net — what you receive\n\nThe exact rate depends on your account agreement. You can view your current rates under Fees in your dashboard.",
    quickReplies: [
      "How do I see fees on a transaction?",
      "Where does the fee show in my balance?",
    ],
  },
  {
    id: "fees-transaction",
    keywords: ["see fee", "fee breakdown", "fee on transaction", "net amount"],
    reply:
      "Every transaction response includes a fees block:\n\n{\n  \"fees\": {\n    \"grossAmount\": 200000,\n    \"serviceFee\": 1000,\n    \"totalFee\": 1000,\n    \"merchantNetAmount\": 199000,\n    \"providerFeeTreatment\": \"ABSORBED\"\n  }\n}\n\nAmounts are in kobo. Merchant net is what lands in your balance.",
    quickReplies: ["How do I see my balance?"],
  },

  // ---------------- Balance / Ledger ----------------
  {
    id: "balance",
    keywords: ["balance", "my balance", "how much money", "wallet", "available balance"],
    reply:
      "Your balance is derived from a double-entry ledger — every movement is auditable.\n\nGET /api/v1/ledger/balance\n\nThe response:\n{\n  \"availableBalance\": 199000,\n  \"pendingBalance\": 0,\n  \"totalBalance\": 199000,\n  \"currency\": \"NGN\"\n}\n\nAmounts in kobo. Available = withdrawable now. Pending = reserved for in-flight payouts.",
    quickReplies: [
      "What is a ledger?",
      "How do I see my ledger entries?",
      "How do I withdraw?",
    ],
  },
  {
    id: "ledger",
    keywords: ["ledger", "ledger entry", "ledger history", "accounting"],
    reply:
      "The ledger is the source of truth for your balance. Every payment, fee, and payout creates entries. You can view them:\n\nGET /api/v1/ledger/entries?page=1&limit=20\n\nFilter by direction (DEBIT/CREDIT), type, date range, or reference. Ledger entries are immutable — corrections are posted as new compensating entries, never edits.",
    quickReplies: [
      "How do I see my balance?",
      "How do I withdraw?",
    ],
  },

  // ---------------- Payouts / Withdrawals ----------------
  {
    id: "payout-create",
    keywords: ["withdraw", "payout", "cash out", "transfer out", "send to bank"],
    reply:
      "To withdraw funds:\n\nPOST /api/v1/payouts\n\nBody:\n{\n  \"amount\": 100000,\n  \"currency\": \"NGN\",\n  \"bankCode\": \"058\",\n  \"accountNumber\": \"0123456789\",\n  \"accountName\": \"JOHN DOE\",\n  \"narration\": \"Weekly payout\"\n}\n\nInclude an Idempotency-Key header. The amount is checked against your available balance and reserved while the payout is processed.",
    quickReplies: [
      "How do I validate a bank account first?",
      "How long does a payout take?",
      "What happens if a payout fails?",
    ],
  },
  {
    id: "payout-validate",
    keywords: ["validate bank", "verify bank account", "bank validation", "account name"],
    reply:
      "Always validate the bank account before creating a payout:\n\nPOST /api/v1/payouts/validate-bank-account\n\nBody:\n{ \"bankCode\": \"058\", \"accountNumber\": \"0123456789\" }\n\nThe response returns the account name. Use that same accountName when submitting the payout — it must match, otherwise the payout is rejected.",
    quickReplies: ["How do I withdraw?"],
  },
  {
    id: "payout-timing",
    keywords: ["payout take how long", "payout speed", "when will payout arrive", "how long withdraw"],
    reply:
      "Payouts are typically processed within minutes once the provider confirms. The status moves:\n\nPENDING → PROCESSING → SUCCESS\n\nThe full lifecycle is visible on your payouts list. If a payout is stuck in PROCESSING for a while, don't resubmit — the system reconciles with the provider automatically.",
    quickReplies: [
      "What happens if a payout fails?",
      "How do I see my payouts?",
    ],
  },
  {
    id: "payout-failure",
    keywords: ["payout failed", "payout error", "withdrawal failed"],
    reply:
      "If a payout fails at the provider, the reserved funds are released back to your available balance automatically. The payout record shows FAILED with the reason. You can retry with a new idempotency key. Check the failure reason first — most failures are due to invalid bank details.",
    quickReplies: ["How do I validate a bank account?"],
  },
  {
    id: "payout-list",
    keywords: ["my payouts", "payout history", "list payout", "withdrawal history"],
    reply:
      "View your payouts:\n\nGET /api/v1/payouts?page=1&limit=20&status=SUCCESS\n\nEach entry shows the amount, bank account (masked), status, and timestamps. You can filter by status.",
    quickReplies: ["How do I withdraw?"],
  },

  // ---------------- Webhooks ----------------
  {
    id: "webhooks-explainer",
    keywords: ["webhook", "callback", "notification", "notify me", "event"],
    reply:
      "Webhooks let you receive real-time notifications in your backend when a payment succeeds, fails, or when a payout completes.\n\nSet your webhook URL in the dashboard under Webhooks. We POST a signed JSON payload to it. You must verify the signature (HMAC-SHA256, header `X-C-TEX-Signature`) before trusting the payload.",
    quickReplies: [
      "How do I verify webhook signatures?",
      "What events do you send?",
    ],
  },
  {
    id: "webhook-events",
    keywords: ["webhook event", "which event", "event type", "payment.success", "what events"],
    reply:
      "Event types currently sent:\n\n• payment.success — a payment completed successfully\n• payout.success — a payout completed\n• payout.failed — a payout failed\n\nEach event has a unique ID, a signature, and a payload with the C-TEX references. Duplicate delivery is expected and safe — always dedupe by event ID on your side.",
    quickReplies: ["How do I verify webhook signatures?"],
  },
  {
    id: "webhook-verify",
    keywords: ["verify webhook", "webhook signature", "signature header", "X-C-TEX-Signature"],
    reply:
      "Every webhook includes an X-C-TEX-Signature header. To verify:\n\n1. Read the raw request body (as a string, not parsed JSON).\n2. Compute HMAC-SHA256 of that body using your webhook secret.\n3. Compare with the signature header using constant-time comparison.\n4. Reject if they don't match.\n\nAlways verify. Never trust a webhook body without checking the signature.",
    quickReplies: ["What events do you send?"],
  },

  // ---------------- Team / Roles ----------------
  {
    id: "team-invite",
    keywords: ["add team member", "invite team", "invite user", "add staff"],
    reply:
      "To invite a team member:\n\n1. Go to Team in your dashboard.\n2. Click Invite member.\n3. Enter their email and select a role.\n\nThey receive an email invitation. Once accepted, they appear in your team list with the assigned role and permissions.",
    quickReplies: [
      "What roles are available?",
      "How do I remove a team member?",
    ],
  },
  {
    id: "team-roles",
    keywords: ["role", "roles", "permission", "owner", "admin", "what can my team do"],
    reply:
      "Roles group permissions. Common roles:\n\n• OWNER — full access to everything (created automatically for the merchant owner)\n• ADMIN — manages day-to-day operations\n• ACCOUNTANT — views transactions, fees, and balances\n• DEVELOPER — manages API keys and webhooks\n• SUPPORT — views customers and transactions\n\nYou can create custom roles with specific permissions.",
    quickReplies: [
      "How do I invite a team member?",
      "How do I change someone's role?",
    ],
  },
  {
    id: "team-remove",
    keywords: ["remove team", "remove member", "remove staff", "revoke access"],
    reply:
      "To remove a team member:\n\n1. Go to Team.\n2. Find the member.\n3. Click Remove.\n\nTheir access is revoked immediately. Note: you cannot remove the last OWNER of a merchant — assign OWNER to another member first if you need to change ownership.",
    quickReplies: ["What roles are available?"],
  },

  // ---------------- Errors ----------------
  {
    id: "error-401",
    keywords: ["401", "unauthorized", "invalid token", "authentication error"],
    reply:
      "A 401 means your request wasn't authenticated. Common causes:\n\n• Missing Authorization header\n• Token expired or malformed\n• API key revoked or wrong\n\nCheck your Authorization header: `Bearer <your_key_or_token>`. If the key was rotated or revoked, generate a new one.",
    quickReplies: ["How do I create an API key?"],
  },
  {
    id: "error-403",
    keywords: ["403", "forbidden", "permission denied", "not allowed"],
    reply:
      "A 403 means you're authenticated but lack permission. Check:\n\n• Does your API key have the required permission for this endpoint?\n• Is your team role authorized for this action?\n\nIf you need access, ask your merchant OWNER to grant the permission on your role or API key.",
    quickReplies: ["How do I assign permissions to an API key?"],
  },
  {
    id: "error-404",
    keywords: ["404", "not found", "missing resource"],
    reply:
      "A 404 means the resource doesn't exist or isn't visible to you. Common causes:\n\n• Wrong payment/customer reference\n• The resource belongs to a different merchant\n• The resource was deleted\n\nCheck the reference and confirm you're using the right merchant's credentials.",
    quickReplies: ["How do I list transactions?"],
  },
  {
    id: "error-409",
    keywords: ["409", "conflict", "duplicate", "already exists"],
    reply:
      "A 409 means a conflict — usually a duplicate. Common cases:\n\n• Creating a customer with an email that already exists under your merchant\n• Reusing an Idempotency-Key with a different payload\n\nCheck the error message for specifics. For duplicate customers, use PATCH to update the existing one.",
    quickReplies: [
      "How do I add a customer?",
      "What is idempotency?",
    ],
  },
  {
    id: "error-422",
    keywords: ["422", "validation error", "invalid request", "bad request", "validation failed"],
    reply:
      "A 422 means your request body failed validation. Common causes:\n\n• Missing required fields\n• Wrong data type (e.g. string for amount)\n• Invalid email, UUID, or enum value\n\nCheck the `errors` array in the response — it names the exact field and message.",
    quickReplies: ["How do I create a payment?"],
  },
  {
    id: "error-500",
    keywords: ["500", "server error", "internal error"],
    reply:
      "A 500 means something went wrong on our side. Retry the request with the same Idempotency-Key — if the operation was in-flight, you'll get the same result without duplicates. If it persists, contact support with the payment reference and the time it happened.",
    quickReplies: ["Contact support"],
  },

  // ---------------- Security ----------------
  {
    id: "security",
    keywords: ["security", "safe", "secure", "pci", "how do you protect"],
    reply:
      "C-TEX PAY is built with security in mind:\n\n• Every payment is idempotent — no duplicate charges.\n• All financial movements are recorded in an immutable double-entry ledger.\n• Webhooks are signed and must be verified.\n• API keys are hashed and never stored in plaintext.\n• Every request is scoped to your merchant — you can only see your own data.\n\nNever share your secret key or JWT with anyone.",
    quickReplies: ["How do I create an API key?"],
  },

  // ---------------- Contact ----------------
  {
    id: "contact",
    keywords: ["contact", "support", "help me", "talk to human", "email support"],
    reply:
      "If I can't answer your question, reach out to our support team:\n\n• Email: support@ctexpay.com\n• Include: your merchant reference, the payment reference (if applicable), and a short description.\n\nResponse time is typically within a few hours.",
    quickReplies: ["Back to main menu"],
  },
];

// ---------- Response resolution ----------

function resolveReply(message) {
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return {
      reply: "Please type your question and I'll do my best to help.",
      quickReplies: [],
    };
  }

  // First: exact quick reply match
  const quickMatch = QUICK_REPLY_MAP[trimmed];
  if (quickMatch) return quickMatch;

  // Then: keyword matching, in order of RULES
  for (const rule of RULES) {
    if (KEYWORD_MATCH(trimmed, rule.keywords)) {
      return {
        reply: rule.reply,
        quickReplies: rule.quickReplies || [],
      };
    }
  }

  // Fallback
  return {
    reply:
      "I'm not sure I have an answer for that yet. Try asking about:\n\n• Payments\n• Customers\n• API keys\n• Transactions\n• Fees\n• Balance\n• Payouts\n• Webhooks\n• Team & roles\n• Errors\n\nOr type 'contact support' and I'll point you to the right channel.",
    quickReplies: [
      "How do I create a payment?",
      "How do I get an API key?",
      "How do I withdraw?",
      "Contact support",
    ],
  };
}

// Precompute quick replies → rules for O(1) lookup
const QUICK_REPLY_MAP = (() => {
  const map = {};
  for (const rule of RULES) {
    for (const qr of rule.quickReplies || []) {
      map[qr] = {
        reply: rule.reply,
        quickReplies: rule.quickReplies,
      };
    }
  }
  // Explicit quick reply shortcuts
  map["Back to main menu"] = {
    reply:
      "Sure — here's what I can help with. What would you like to know?",
    quickReplies: [
      "How do I create a payment?",
      "How do I get an API key?",
      "How do I add a customer?",
      "What are your fees?",
      "How do I withdraw?",
      "What are webhooks?",
    ],
  };
  return map;
})();

// ---------- Component ----------

export default function SupportBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "initial",
      role: "bot",
      text:
        "Hi! I'm the C-TEX PAY assistant. Ask me anything about payments, customers, API keys, transactions, fees, balance, payouts, webhooks, or your team.",
      quickReplies: [
        "How do I create a payment?",
        "How do I get an API key?",
        "How do I add a customer?",
        "What are your fees?",
        "How do I withdraw?",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = (text) => {
    const message = (text ?? input).trim();
    if (!message) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: message,
    };

    const { reply, quickReplies } = resolveReply(message);

    const botMsg = {
      id: `b-${Date.now() + 1}`,
      role: "bot",
      text: reply,
      quickReplies,
    };

    setMessages((prev) => [...prev, userMsg]);

    // Small delay for a natural feel
    setTimeout(() => {
      setMessages((prev) => [...prev, botMsg]);
    }, 350);

    setInput("");
  };

  const handleQuickReply = (qr) => {
    handleSend(qr);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "bot",
        text: "Conversation cleared. What would you like to know?",
        quickReplies: [
          "How do I create a payment?",
          "How do I get an API key?",
          "How do I withdraw?",
        ],
      },
    ]);
  };

  const unreadHint = useMemo(
    () => messages.filter((m) => m.role === "bot").length,
    [messages]
  );

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        aria-label="Open support chat"
        onClick={() => setOpen((v) => !v)}
        className="
          fixed bottom-5 right-5 z-50
          h-14 w-14 rounded-full
          bg-gradient-to-br from-emerald-500 to-teal-600
          text-white shadow-lg shadow-emerald-500/30
          flex items-center justify-center
          transition-transform duration-300
          hover:scale-110 active:scale-95
          animate-[pulseSoft_2.5s_ease-in-out_infinite]
        "
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-3.5-7.1L21 3v9z"
            />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`
          fixed bottom-24 right-5 z-50
          w-[360px] max-w-[calc(100vw-2.5rem)]
          origin-bottom-right
          transition-all duration-300 ease-out
          ${
            open
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-90 pointer-events-none"
          }
        `}
        role="dialog"
        aria-label="C-TEX PAY support chat"
      >
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-slate-200 bg-white flex flex-col h-[560px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-semibold">
                CT
              </div>
              <div>
                <div className="font-semibold text-sm leading-tight">
                  C-TEX PAY Support
                </div>
                <div className="text-xs text-white/80 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Online
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-white/80 hover:text-white transition-colors"
              title="Clear conversation"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-[fadeSlideIn_0.25s_ease-out]`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line
                    ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                    }
                  `}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Quick replies on the latest bot message */}
            {(() => {
              const last = messages[messages.length - 1];
              if (!last || last.role !== "bot" || !last.quickReplies?.length) {
                return null;
              }
              return (
                <div className="flex flex-wrap gap-2 pt-1 animate-[fadeSlideIn_0.35s_ease-out]">
                  {last.quickReplies.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => handleQuickReply(qr)}
                      className="
                        text-xs px-3 py-1.5 rounded-full
                        bg-white border border-emerald-300 text-emerald-700
                        hover:bg-emerald-50 hover:border-emerald-400
                        transition-colors duration-200
                      "
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask a question..."
                className="
                  flex-1 resize-none rounded-xl border border-slate-300
                  px-3 py-2 text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  max-h-32
                "
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="
                  h-10 w-10 rounded-xl
                  bg-emerald-600 text-white
                  flex items-center justify-center
                  hover:bg-emerald-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors
                "
                aria-label="Send message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9-7-9-7v14zM5 12h11"
                  />
                </svg>
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 text-center">
              Automated replies. For account issues, contact support.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}