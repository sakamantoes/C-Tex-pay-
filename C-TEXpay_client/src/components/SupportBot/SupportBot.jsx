import React, { useState, useRef, useEffect, useMemo } from "react";
import { SUPPORT_WHATSAPP_URL } from "../../constants/support.js";

// Replace this placeholder with your official WhatsApp Business number.
// Use international format without "+" or spaces, e.g. "2348012345678".
const supportWhatsAppUrl = SUPPORT_WHATSAPP_URL("Hello C-TEX PAY Support, I need help with: ");

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

      "Hello! I’m the C-TEX PAY assistant. I can help with merchant setup, API keys, customers, payment initialization, payment status and verification, transactions, webhooks, team access, and common API errors. Ask me a question or choose a topic below.",

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

      "To get started with C-TEX PAY:\n\n1. Create your merchant account and complete your business profile.\n2. Create an API key in your dashboard and keep the secret on your backend.\n3. Create or select a customer.\n4. Initialize a payment through the C-TEX PAY API using your secret key.\n5. Show the returned bank-transfer instructions to your customer.\n6. Confirm the final status using C-TEX PAY payment verification and/or your configured merchant webhook.\n\nProvider integrations are handled by C-TEX PAY behind the scenes; your integration should use the C-TEX PAY API.",

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

      "API keys support fine-grained permissions:\n\n• payments.create — initialize payments\n• payments.read — view payments\n• customers.create / read / update / delete — customer management\n• transactions.read — view transactions\n• api_keys.read / create / revoke — key management\n• webhooks.read / manage — merchant webhook configuration\n\nPayout permissions are not listed because payouts are not a confirmed live feature. Only grant the permissions your integration needs.",

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

      "Do not assume that retrying a payment initialization is safe unless Idempotency-Key support is confirmed for your current C-TEX PAY API version and account. Before retrying after a timeout, check the payment by its reference or use the documented verification flow. If you are unsure whether a request created a payment, contact support before submitting it again.",

    quickReplies: [

      "How do I create a payment?",

      "How do I know when a payment is successful?",

    ],

  },

  {

    id: "payment-status",

    keywords: ["payment status", "is payment successful", "when will payment succeed", "pending payment"],

    reply:

      "A payment starts as PENDING. It becomes SUCCESS once we confirm the customer's transfer with the payment provider.\n\nCommon statuses include PENDING (awaiting confirmation) and SUCCESS (payment confirmed). Use the status returned by the API as the source of truth; do not mark an order paid based only on a customer screenshot. A merchant webhook can notify your backend when a payment succeeds.",

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

      "View your transactions:\n\n• Dashboard: GET /api/v1/transactions/dashboard\n• API: GET /api/v1/transactions\n\nSupports pagination and the filters exposed by your current dashboard/API, including status, payment method, reference, customer, currency, date, and amount where available. Fee breakdowns and balance-ledger reporting are not yet available as completed features.",

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

      "Merchant fee configuration and fee reporting are on the C-TEX PAY roadmap and should not be treated as live dashboard/API features yet. Please contact the C-TEX PAY support team for any current commercial pricing or fee questions. I won’t quote a fee rate because it has not been confirmed here.",

    quickReplies: [

      "How do I see fees on a transaction?",

      "Where does the fee show in my balance?",

    ],


    showWhatsApp: true,
  },

  {

    id: "fees-transaction",

    keywords: ["see fee", "fee breakdown", "fee on transaction", "net amount"],

    reply:

      "The transaction listing is available, but a finalized fee-breakdown response and merchant-net calculation are not confirmed as live features yet. Please check the transaction details returned by your current API version and contact support if you need an authoritative fee calculation.",

    quickReplies: ["How do I see my balance?"],


    showWhatsApp: true,
  },

  // ---------------- Balance / Ledger ----------------

  {

    id: "balance",

    keywords: ["balance", "my balance", "how much money", "wallet", "available balance"],

    reply:

      "Merchant balance and wallet/ledger endpoints are planned work and should not be treated as live C-TEX PAY features yet. You can currently review payment and transaction records in the available dashboard/API. Contact support for questions about settlement or funds availability.",

    quickReplies: [

      "What is a ledger?",

      "How do I see my ledger entries?",

      "How do I withdraw?",

    ],


    showWhatsApp: true,
  },

  {

    id: "ledger",

    keywords: ["ledger", "ledger entry", "ledger history", "accounting"],

    reply:

      "Ledger history and double-entry balance reporting are still on the roadmap. The assistant cannot provide a live ledger endpoint or confirm ledger entries at this stage. Please use the transaction records currently available and contact support for settlement questions.",

    quickReplies: [

      "How do I see my balance?",

      "How do I withdraw?",

    ],


    showWhatsApp: true,
  },

  // ---------------- Payouts / Withdrawals ----------------

  {

    id: "payout-create",

    keywords: ["withdraw", "payout", "cash out", "transfer out", "send to bank"],

    reply:
      'Payouts and withdrawals are on the C-TEX PAY roadmap and are not confirmed as available in the current release. Do not call a guessed payout endpoint or assume funds can be withdrawn from a C-TEX PAY balance yet. Contact support for current settlement arrangements.',

    quickReplies: [

      "How do I validate a bank account first?",

      "How long does a payout take?",

      "What happens if a payout fails?",

    ],


    showWhatsApp: true,
  },

  {

    id: "payout-validate",

    keywords: ["validate bank", "verify bank account", "bank validation", "account name"],

    reply:
      'Bank-account validation for C-TEX PAY payouts is not confirmed as available because the payout feature is still on the roadmap. Please contact support for current settlement or payout options.',

    quickReplies: ["How do I withdraw?"],


    showWhatsApp: true,
  },

  {

    id: "payout-timing",

    keywords: ["payout take how long", "payout speed", "when will payout arrive", "how long withdraw"],

    reply:
      'Payout processing times cannot be promised because the C-TEX PAY payout feature is not confirmed as live yet. Contact support for current settlement arrangements.',

    quickReplies: [

      "What happens if a payout fails?",

      "How do I see my payouts?",

    ],


    showWhatsApp: true,
  },

  {

    id: "payout-failure",

    keywords: ["payout failed", "payout error", "withdrawal failed"],

    reply:
      'Automated payout failure handling is not confirmed as a live C-TEX PAY feature. If you have a settlement issue, contact support and include the relevant transaction reference and timestamp.',

    quickReplies: ["How do I validate a bank account?"],


    showWhatsApp: true,
  },

  {

    id: "payout-list",

    keywords: ["my payouts", "payout history", "list payout", "withdrawal history"],

    reply:
      'Payout history is not available as a confirmed live API feature yet. Please contact support for help with settlement questions.',

    quickReplies: ["How do I withdraw?"],


    showWhatsApp: true,
  },

  // ---------------- Webhooks ----------------

  {

    id: "webhooks-explainer",

    keywords: ["webhook", "callback", "notification", "notify me", "event"],

    reply:

      "Merchant webhooks notify your backend about payment events. Configure your webhook URL in the C-TEX PAY dashboard. Verify webhook authenticity using the signature and secret details documented for your current integration; do not trust an unsigned or unverified payload. Payout events are not advertised here as live because payouts are still on the roadmap.",

    quickReplies: [

      "How do I verify webhook signatures?",

      "What events do you send?",

    ],

  },

  {

    id: "webhook-events",

    keywords: ["webhook event", "which event", "event type", "payment.success", "what events"],

    reply:

      "The confirmed merchant webhook event in the current integration is `payment.success`, sent when a payment succeeds. Do not assume payout events or any additional event types are enabled unless they are listed in your dashboard or current integration documentation. Your endpoint should safely handle repeat deliveries.",

    quickReplies: ["How do I verify webhook signatures?"],

  },

  {

    id: "webhook-verify",

    keywords: ["verify webhook", "webhook signature", "signature header", "X-C-TEX-Signature"],

    reply:

      "Use the signature header and webhook secret specified by your C-TEX PAY integration, following the current webhook documentation. Preserve the raw request body if the documented signature algorithm requires it, compare signatures safely, and reject unverified events. If you need the exact header name or algorithm for your current deployment, contact support rather than guessing.",

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

      "C-TEX PAY uses authenticated API access, merchant-scoped data access, and webhook verification controls. Keep secret API keys and JWTs on trusted servers, never in frontend code or public repositories. Features such as full ledger reporting and confirmed idempotent retries should only be relied on when enabled and documented for your current release.",

    quickReplies: ["How do I create an API key?"],

  },

  // ---------------- Contact ----------------

  {

    id: "contact",

    keywords: ["contact", "support", "help me", "talk to human", "email support"],

    reply:
      'Our support team can help with questions I cannot answer. Tap the WhatsApp support button below to open a direct chat. If the issue involves a payment, include the payment reference, approximate time, and a short description. Never send your API secret key, password, or OTP.',

    quickReplies: ["Back to main menu"],


    showWhatsApp: true,
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

        showWhatsApp: Boolean(rule.showWhatsApp),

      };

    }

  }

  // Fallback

  return {

    reply:

      "I don't have a reliable answer for that question yet. I can currently help with merchant setup, API keys, customers, payment initialization and verification, transactions, merchant webhooks, team access, and common API errors. Fees, ledger/balance reporting, payouts, and reconciliation are still being developed. Tap WhatsApp support below and our team can help.",

    quickReplies: [

      "How do I create a payment?",

      "How do I get an API key?",

      "How do I add a customer?",

      "What are webhooks?",

      "Contact support",

    ],

    showWhatsApp: true,

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

        showWhatsApp: Boolean(rule.showWhatsApp),

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

        "Hi! I'm the C-TEX PAY assistant. Ask me about merchant setup, API keys, customers, payments, payment verification, transactions, webhooks, team access, or API errors. If I don't know an answer, I'll connect you to WhatsApp support.",

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

    const { reply, quickReplies, showWhatsApp } = resolveReply(message);

    const botMsg = {

      id: `b-${Date.now() + 1}`,

      role: "bot",

      text: reply,

      quickReplies,

      showWhatsApp: Boolean(showWhatsApp),

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

          "What are webhooks?",

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

          bg-gradient-to-br from-blue-500 to-blue-600

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

          <div className="bg-gradient-to-r from-blue-600 to-blue-600 text-white px-4 py-3 flex items-center justify-between">

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
                <div className="flex max-w-[90%] flex-col items-start gap-2">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line break-words ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.role === "bot" && msg.showWhatsApp && (
                    <a
                      href={supportWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Contact C-TEX PAY support on WhatsApp"
                      className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1DA851] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path d="M12.04 2a9.87 9.87 0 0 0-8.49 14.9L2.2 22l5.25-1.38A9.96 9.96 0 1 0 12.04 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.03-.2-.31A8.17 8.17 0 1 1 12.04 20.2Zm4.49-6.13c-.25-.13-1.47-.73-1.7-.81-.23-.09-.39-.13-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-.1-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.52.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.06.42 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29Z" />
                      </svg>
                      Chat with support on WhatsApp
                    </a>
                  )}
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

                        bg-white border border-blue-300 text-blue-700

                        hover:bg-emerald-50 hover:border-blue-400

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

                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400

                  max-h-32

                "

              />

              <button

                type="button"

                onClick={() => handleSend()}

                disabled={!input.trim()}

                className="

                  h-10 w-10 rounded-xl

                  bg-blue-600 text-white

                  flex items-center justify-center

                  hover:bg-blue-700

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
