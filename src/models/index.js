import User from "./User.js";
import RefreshToken from "./RefreshToken.js";
import UserSession from "./UserSession.js";
import EmailVerificationToken from "./EmailVerificationToken.js";
import PasswordResetToken from "./PasswordResetToken.js";


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


export {
  User,
  RefreshToken,
  UserSession,
  EmailVerificationToken,
  PasswordResetToken,
};

