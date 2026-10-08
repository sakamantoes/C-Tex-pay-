import User from "./User.js";
import RefreshToken from "./RefreshToken.js";
import UserSession from "./UserSession.js";
import EmailVerificationToken from "./EmailVerificationToken.js";
import PasswordResetToken from "./PasswordResetToken.js";
import Merchant from "./Merchant.js";
import BusinessProfile from "./BusinessProfile.js";
import MerchantMember from "./MerchantMember.js";
import Role from "./Role.js";
import Permission from "./Permission.js";
import RolePermission from "./RolePermission.js";
import MerchantMemberRole from "./MerchantMemberRole.js";
import MerchantInvitation from "./MerchantInvitation.js";
import ApiKey from "./ApiKey.js";
import ApiKeyPermission from "./ApiKeyPermission.js";
import ApiKeyUsage from "./ApiKeyUsage.js";
import Customer from "./Customer.js";
import CustomerMetadata from "./CustomerMetadata.js";
import CustomerPaymentMethod from "./CustomerPaymentMethod.js";
import Notification from "./Notification.js";
import Payment from "./Payment.js";
import PaymentStatusHistory from "./PaymentStatusHistory.js";
import MerchantWebhookConfig from "./MerchantWebhookConfig.js";
import MerchantWebhookEvent from "./MerchantWebhookEvent.js";
import MerchantSetting from "./MerchantSetting.js";
import MerchantNotificationDelivery from "./MerchantNotificationDelivery.js";
import WebhookEvent from "./WebhookEvent.js";
import FeeConfiguration from "./FeeConfiguration.js";
import FeeRecord from "./FeeRecord.js";
import LedgerAccount from "./LedgerAccount.js";
import LedgerTransaction from "./LedgerTransaction.js";
import LedgerEntry from "./LedgerEntry.js";
// user has many refresh tokens
import Payout from "./Payout.js";
import ReconciliationRun from "./ReconciliationRun.js";
import ReconciliationDiscrepancy from "./ReconciliationDiscrepancy.js";

User.hasMany(RefreshToken, {
  foreignKey: "userId",
  as: "refreshTokens",
  onDelete: "CASCADE",
});

RefreshToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// user has many sessions

User.hasMany(UserSession, {
  foreignKey: "userId",
  as: "sessions",
  onDelete: "CASCADE",
});

UserSession.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// user has many email verification tokens
User.hasMany(EmailVerificationToken, {
  foreignKey: "userId",
  as: "emailVerificationTokens",
  onDelete: "CASCADE",
});

EmailVerificationToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// user has many password reset tokens

User.hasMany(PasswordResetToken, {
  foreignKey: "userId",
  as: "passwordResetTokens",
  onDelete: "CASCADE",
});

PasswordResetToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

//

RefreshToken.hasMany(UserSession, {
  foreignKey: "refreshToken",
  sourceKey: "token",
  as: "sessions",
});

UserSession.belongsTo(RefreshToken, {
  foreignKey: "refreshToken",
  targetKey: "token",
  as: "refreshTokenRecord",
});

// ============= MERCHANT ASSOCIATIONS =============
// User → Merchant (as owner)
User.hasMany(Merchant, {
  foreignKey: "ownerId",
  as: "ownedMerchants",
});
Merchant.belongsTo(User, {
  foreignKey: "ownerId",
  as: "owner",
});

// Merchant → BusinessProfile (1:1)
Merchant.hasOne(BusinessProfile, {
  foreignKey: "merchantId",
  as: "businessProfile",
});
BusinessProfile.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

// Merchant → MerchantMember
Merchant.hasMany(MerchantMember, {
  foreignKey: "merchantId",
  as: "members",
});
MerchantMember.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

// User → MerchantMember
User.hasMany(MerchantMember, {
  foreignKey: "userId",
  as: "merchantMemberships",
});

User.hasMany(Notification, {
  foreignKey: "userId",
  as: "notifications",
  onDelete: "CASCADE",
});
Notification.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});
MerchantMember.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Merchant.hasMany(MerchantInvitation, {
  foreignKey: "merchantId",
  as: "invitations",
});
MerchantInvitation.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Role.hasMany(MerchantInvitation, {
  foreignKey: "roleId",
  as: "invitations",
});
MerchantInvitation.belongsTo(Role, {
  foreignKey: "roleId",
  as: "role",
});

// Merchant → Role
Merchant.hasMany(Role, {
  foreignKey: "merchantId",
  as: "roles",
});
Role.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

// Role ↔ Permission (through RolePermission)
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "roleId",
  otherKey: "permissionId",
  as: "permissions",
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permissionId",
  otherKey: "roleId",
  as: "roles",
});

// MerchantMember ↔ Role (through MerchantMemberRole)
MerchantMember.belongsToMany(Role, {
  through: MerchantMemberRole,
  foreignKey: "merchantMemberId",
  otherKey: "roleId",
  as: "roles",
});
Role.belongsToMany(MerchantMember, {
  through: MerchantMemberRole,
  foreignKey: "roleId",
  otherKey: "merchantMemberId",
  as: "members",
});

// RolePermission belongs to Role and Permission
RolePermission.belongsTo(Role, {
  foreignKey: "roleId",
  as: "role",
});
RolePermission.belongsTo(Permission, {
  foreignKey: "permissionId",
  as: "permission",
});

// MerchantMemberRole belongs to MerchantMember and Role
MerchantMemberRole.belongsTo(MerchantMember, {
  foreignKey: "merchantMemberId",
  as: "merchantMember",
});
MerchantMemberRole.belongsTo(Role, {
  foreignKey: "roleId",
  as: "role",
});

// API Key Associations
Merchant.hasMany(ApiKey, {
  foreignKey: "merchantId",
  as: "apiKeys",
});
ApiKey.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

// API Key ↔ Permission (through ApiKeyPermission)
ApiKey.belongsToMany(Permission, {
  through: ApiKeyPermission,
  foreignKey: "apiKeyId",
  otherKey: "permissionId",
  as: "permissions",
});
Permission.belongsToMany(ApiKey, {
  through: ApiKeyPermission,
  foreignKey: "permissionId",
  otherKey: "apiKeyId",
  as: "apiKeys",
});

// API Key → Usage
ApiKey.hasMany(ApiKeyUsage, {
  foreignKey: "apiKeyId",
  as: "usage",
});
ApiKeyUsage.belongsTo(ApiKey, {
  foreignKey: "apiKeyId",
  as: "apiKey",
});

// Merchant → Usage (for easy querying)
Merchant.hasMany(ApiKeyUsage, {
  foreignKey: "merchantId",
  as: "apiKeyUsage",
});
ApiKeyUsage.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

// Customer associations
Merchant.hasMany(Customer, {
  foreignKey: "merchantId",
  as: "customers",
});
Customer.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Customer.hasOne(CustomerMetadata, {
  foreignKey: "customerId",
  as: "metadata",
});
CustomerMetadata.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

Customer.hasMany(CustomerPaymentMethod, {
  foreignKey: "customerId",
  as: "paymentMethods",
});
CustomerPaymentMethod.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});
// ============= PAYMENT ASSOCIATIONS =============
// Merchant → Payment
Merchant.hasMany(Payment, {
  foreignKey: "merchantId",
  as: "payments",
});
Payment.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

// Customer → Payment (optional)
Customer.hasMany(Payment, {
  foreignKey: "customerId",
  as: "payments",
});
Payment.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// Payment → PaymentStatusHistory
Payment.hasMany(PaymentStatusHistory, {
  foreignKey: "paymentId",
  as: "statusHistory",
});
PaymentStatusHistory.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});

// Merchant webhook config and event associations
Merchant.hasOne(MerchantWebhookConfig, {
  foreignKey: "merchantId",
  as: "webhookConfig",
  onDelete: "CASCADE",
});
MerchantWebhookConfig.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Merchant.hasMany(MerchantWebhookEvent, {
  foreignKey: "merchantId",
  as: "webhookEvents",
  onDelete: "CASCADE",
});
MerchantWebhookEvent.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Payment.hasMany(MerchantWebhookEvent, {
  foreignKey: "paymentId",
  as: "merchantWebhookEvents",
  onDelete: "CASCADE",
});
MerchantWebhookEvent.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});

MerchantWebhookConfig.hasMany(MerchantWebhookEvent, {
  foreignKey: "configId",
  as: "events",
  onDelete: "SET NULL",
});
MerchantWebhookEvent.belongsTo(MerchantWebhookConfig, {
  foreignKey: "configId",
  as: "config",
});

Merchant.hasOne(MerchantSetting, {
  foreignKey: "merchantId",
  as: "settings",
  onDelete: "CASCADE",
});
MerchantSetting.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Merchant.hasMany(MerchantNotificationDelivery, {
  foreignKey: "merchantId",
  as: "notificationDeliveries",
  onDelete: "CASCADE",
});
MerchantNotificationDelivery.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});
Payment.hasMany(MerchantNotificationDelivery, {
  foreignKey: "paymentId",
  as: "notificationDeliveries",
  onDelete: "CASCADE",
});
MerchantNotificationDelivery.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});

// ============= FEE ASSOCIATIONS =============
Merchant.hasMany(FeeConfiguration, {
  foreignKey: "merchantId",
  as: "feeConfigurations",
});
FeeConfiguration.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Payment.hasOne(FeeRecord, {
  foreignKey: "paymentId",
  as: "feeRecord",
});
FeeRecord.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});

Merchant.hasMany(FeeRecord, {
  foreignKey: "merchantId",
  as: "feeRecords",
});
FeeRecord.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

FeeConfiguration.hasMany(FeeRecord, {
  foreignKey: "feeConfigurationId",
  as: "feeRecords",
});
FeeRecord.belongsTo(FeeConfiguration, {
  foreignKey: "feeConfigurationId",
  as: "feeConfiguration",
});

// ============= LEDGER ASSOCIATIONS =============
Merchant.hasMany(LedgerAccount, {
  foreignKey: "merchantId",
  as: "ledgerAccounts",
});
LedgerAccount.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Merchant.hasMany(LedgerTransaction, {
  foreignKey: "merchantId",
  as: "ledgerTransactions",
});
LedgerTransaction.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Payment.hasMany(LedgerTransaction, {
  foreignKey: "paymentId",
  as: "ledgerTransactions",
});
LedgerTransaction.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});

LedgerTransaction.hasMany(LedgerEntry, {
  foreignKey: "ledgerTransactionId",
  as: "entries",
});
LedgerEntry.belongsTo(LedgerTransaction, {
  foreignKey: "ledgerTransactionId",
  as: "transaction",
});

LedgerAccount.hasMany(LedgerEntry, {
  foreignKey: "ledgerAccountId",
  as: "entries",
});
LedgerEntry.belongsTo(LedgerAccount, {
  foreignKey: "ledgerAccountId",
  as: "account",
});

// ============= PAYOUT ASSOCIATIONS =============
Merchant.hasMany(Payout, {
  foreignKey: "merchantId",
  as: "payouts",
});
Payout.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Payout.belongsTo(LedgerTransaction, {
  foreignKey: "reserveLedgerTransactionId",
  as: "reserveLedgerTransaction",
});
Payout.belongsTo(LedgerTransaction, {
  foreignKey: "settleLedgerTransactionId",
  as: "settleLedgerTransaction",
});


// ============= RECONCILIATION ASSOCIATIONS =============
ReconciliationRun.hasMany(ReconciliationDiscrepancy, {
  foreignKey: "reconciliationId",
  as: "discrepancies",
});
ReconciliationDiscrepancy.belongsTo(ReconciliationRun, {
  foreignKey: "reconciliationId",
  as: "reconciliation",
});

Merchant.hasMany(ReconciliationRun, {
  foreignKey: "merchantId",
  as: "reconciliationRuns",
});
ReconciliationRun.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Merchant.hasMany(ReconciliationDiscrepancy, {
  foreignKey: "merchantId",
  as: "reconciliationDiscrepancies",
});
ReconciliationDiscrepancy.belongsTo(Merchant, {
  foreignKey: "merchantId",
  as: "merchant",
});

Payment.hasMany(ReconciliationDiscrepancy, {
  foreignKey: "paymentId",
  as: "reconciliationDiscrepancies",
});
ReconciliationDiscrepancy.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});

Payout.hasMany(ReconciliationDiscrepancy, {
  foreignKey: "payoutId",
  as: "reconciliationDiscrepancies",
});
ReconciliationDiscrepancy.belongsTo(Payout, {
  foreignKey: "payoutId",
  as: "payout",
});

User.hasMany(ReconciliationRun, {
  foreignKey: "triggeredBy",
  as: "triggeredReconciliations",
});
ReconciliationRun.belongsTo(User, {
  foreignKey: "triggeredBy",
  as: "triggeredByUser",
});

User.hasMany(ReconciliationDiscrepancy, {
  foreignKey: "resolvedBy",
  as: "resolvedDiscrepancies",
});
ReconciliationDiscrepancy.belongsTo(User, {
  foreignKey: "resolvedBy",
  as: "resolvedByUser",
});

export {
  User,
  RefreshToken,
  UserSession,
  EmailVerificationToken,
  PasswordResetToken,
  Merchant,
  BusinessProfile,
  MerchantMember,
  Role,
  Permission,
  RolePermission,
  MerchantMemberRole,
  MerchantInvitation,
  ApiKey,
  ApiKeyPermission,
  ApiKeyUsage,
  Customer,
  CustomerMetadata,
  CustomerPaymentMethod,
  Notification,
  Payment,
  PaymentStatusHistory,
  MerchantWebhookConfig,
  MerchantWebhookEvent,
  MerchantSetting,
  MerchantNotificationDelivery,
  WebhookEvent,
  FeeConfiguration,
  FeeRecord,
  LedgerAccount,
  LedgerTransaction,
  LedgerEntry,
  Payout,
  ReconciliationRun,
  ReconciliationDiscrepancy,
};
