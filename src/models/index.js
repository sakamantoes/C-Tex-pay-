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
import ApiKey from "./ApiKey.js";
import ApiKeyPermission from "./ApiKeyPermission.js";
import ApiKeyUsage from "./ApiKeyUsage.js";

// user has many refresh tokens

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
MerchantMember.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
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
  ApiKey,
  ApiKeyPermission,
  ApiKeyUsage,
};
