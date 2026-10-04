import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import UserSession from "../models/UserSession.js";
import EmailVerificationToken from "../models/EmailVerificationToken.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import sequelize from "../config/database.js";
import { MerchantInvitation, Notification } from "../models/index.js";

import { sendMail } from "../service/mail.service.js";
import envConfig from "../config/constant.js";

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    envConfig.JWT_ACCESS_SECRET,
    {
      expiresIn: envConfig.JWT_ACCESS_EXPIRES_IN || "15m",
    },
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const sanitizeUser = (user) => {
  const userData = user.toJSON();
  delete userData.password;
  return userData;
};

/*
|--------------------------------------------------------------------------
| VERIFICATION EMAIL HELPERS
|--------------------------------------------------------------------------
| A single source of truth for building + sending the verification email.
| Used by both `register` and `login` (unverified branch) so the two
| flows can never drift apart.
|--------------------------------------------------------------------------
*/

const VERIFICATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;   // 5 minutes

const buildVerificationUrl = (rawToken, email) =>
  `${envConfig.FRONTEND_URL}verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;

const buildVerificationEmail = ({ firstName, verificationUrl }) => `
  <div style="font-family: Arial, sans-serif;">
    <h2>Verify your C-TEX PAY account</h2>
    <p>Hello ${firstName},</p>
    <p>
      Please verify your email address to activate your C-TEX PAY account.
    </p>
    <p>
      <a
        href="${verificationUrl}"
        style="
          display:inline-block;
          padding:12px 20px;
          background:#000;
          color:#fff;
          text-decoration:none;
          border-radius:6px;
        "
      >
        Verify Email
      </a>
    </p>
    <p>This verification link expires in 30 minutes.</p>
    <p>
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
`;

/**
 * Issue a fresh verification token for a user and email it.
 *
 * - Deletes any previous tokens for the user
 * - Creates a new one
 * - Sends the email
 *
 * @param {Object} options
 * @param {Object} options.user       - Sequelize User instance
 * @param {Object} [options.transaction] - optional Sequelize transaction
 * @returns {Promise<string>} the raw token (for logging if needed)
 */
const issueAndSendVerificationEmail = async ({ user, transaction }) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);

  const verificationUrl = buildVerificationUrl(rawToken, user.email);

  // Token write can be transactional when called from register.
  // When called standalone (from login), we run it inside its own tx
  // by passing transaction = undefined (Sequelize manages it).
  await EmailVerificationToken.destroy(
    { where: { userId: user.id } },
    transaction ? { transaction } : undefined,
  );

  await EmailVerificationToken.create(
    {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
    transaction ? { transaction } : undefined,
  );

  // Email is always outside the transaction — SMTP is not transactional.
  await sendMail({
    to: user.email,
    subject: "Verify your C-TEX PAY account",
    message: buildVerificationEmail({
      firstName: user.firstName,
      verificationUrl,
    }),
  });

  return rawToken;
};

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
| POST /api/v1/auth/register
|
| Atomic unit of work:
|   1. Create User
|   2. Create EmailVerificationToken
|   3. Create notifications for any pending invitations
|   4. Send verification email
|
| If the email send fails, the transaction rolls back — no orphan user.
|--------------------------------------------------------------------------
*/

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    /* Validate required fields */
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    /* Check existing email (read-only) */
    const existingEmail = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    /* Check phone (read-only) */
    if (phone) {
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "An account with this phone number already exists",
        });
      }
    }

    /* Password validation */
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    /* Hash password BEFORE opening a transaction (bcrypt is CPU-bound, not DB) */
    const hashedPassword = await bcrypt.hash(password, 12);

    /*
    | Managed transaction.
    | If sendMail throws, Sequelize automatically rolls back User + Token.
    */
    const user = await sequelize.transaction(async (t) => {
      const createdUser = await User.create(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone || null,
          password: hashedPassword,
          role: "USER",
          status: "PENDING",
          emailVerified: false,
          phoneVerified: false,
        },
        { transaction: t },
      );

      /*
      | Issue + send verification email inside the transaction.
      | `issueAndSendVerificationEmail` handles token create/destroy.
      */
      await issueAndSendVerificationEmail({
        user: createdUser,
        transaction: t,
      });

      /*
      | Notify the new user about any pending invitations that match
      | their email.
      */
      const pendingInvitations = await MerchantInvitation.findAll({
        where: {
          email: normalizedEmail,
          acceptedAt: null,
        },
        transaction: t,
      });

      for (const invitation of pendingInvitations) {
        await Notification.create(
          {
            userId: createdUser.id,
            type: "MERCHANT_INVITATION",
            title: "Merchant invitation",
            message: "You have a pending invitation to join a business.",
            data: {
              invitationId: invitation.id,
              merchantId: invitation.merchantId,
              roleId: invitation.roleId,
            },
          },
          { transaction: t },
        );
      }

      return createdUser;
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please verify your email.",
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
};

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
| POST /api/v1/auth/login
|
| Success path (atomic):
|   1. Reset failed attempts + update last login
|   2. Create RefreshToken
|   3. Create UserSession
|
| Unverified path:
|   - Auto-resend verification email (with cooldown to prevent spam)
|   - Return 403 with code EMAIL_NOT_VERIFIED
|--------------------------------------------------------------------------
*/

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    /* Read-only lookup */
    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* Account lock check (read-only) */
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked. Please try again later.",
      });
    }

    /* Status checks (read-only) */
    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended",
      });
    }

    if (user.status === "INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | UNVERIFIED EMAIL
    |--------------------------------------------------------------------------
    | Auto-send a fresh verification email (with cooldown).
    | The user can then click the link from their inbox without having to
    | press "Resend" manually.
    |--------------------------------------------------------------------------
    */
    if (!user.emailVerified || user.status === "PENDING") {
      let emailSent = false;
      let withinCooldown = false;

      try {
        /*
        |--------------------------------------------------------------------------
        | Cooldown check
        |--------------------------------------------------------------------------
        | If a token was created in the last 5 minutes, don't send another.
        | This protects SMTP quota when a user retries login repeatedly.
        |--------------------------------------------------------------------------
        */
        const latestToken = await EmailVerificationToken.findOne({
          where: { userId: user.id },
          order: [["createdAt", "DESC"]],
        });

        if (latestToken) {
          const ageMs =
            Date.now() - new Date(latestToken.createdAt).getTime();
          withinCooldown = ageMs < RESEND_COOLDOWN_MS;
        }

        if (!withinCooldown) {
          await issueAndSendVerificationEmail({ user });
          emailSent = true;
        }
      } catch (emailError) {
        /*
        | Email failure must NOT break the login response. The user still
        | gets the 403 and can hit "Resend" on the verify-email-sent page.
        */
        console.error(
          "Auto-resend verification email failed on login:",
          emailError,
        );
      }

      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: emailSent
          ? "Please verify your email address before signing in. We've sent a fresh verification link to your inbox."
          : withinCooldown
          ? "Please verify your email address before signing in. Check your inbox for the link we already sent."
          : "Please verify your email address before signing in. Check your inbox or request a new verification link.",
        data: {
          email: user.email,
          emailSent,
          withinCooldown,
        },
      });
    }

    /* Verify password */
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      /*
      | Single write — no transaction required.
      | Increment failed attempts and optionally lock.
      */
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: attempts };

      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await user.update(updates);

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /*
    | Success path — three writes must all succeed together:
    |   1. Reset failed attempts and set lastLoginAt
    |   2. Create RefreshToken
    |   3. Create UserSession
    */
    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);

    await sequelize.transaction(async (t) => {
      await user.update(
        {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
        { transaction: t },
      );

      await RefreshToken.create(
        {
          userId: user.id,
          token: hashedRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        { transaction: t },
      );

      await UserSession.create(
        {
          userId: user.id,
          refreshToken: hashedRefreshToken,
          ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
          userAgent: req.headers["user-agent"] || null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        { transaction: t },
      );
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: envConfig.JWT_ACCESS_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REFRESH TOKEN
|--------------------------------------------------------------------------
| POST /api/v1/auth/refresh
|--------------------------------------------------------------------------
*/

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const hashedToken = hashToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      where: { token: hashedToken },
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      await storedToken.destroy();

      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    const user = await User.findByPk(storedToken.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh token",
    });
  }
};

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
| POST /api/v1/auth/logout
|--------------------------------------------------------------------------
*/

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);

      await sequelize.transaction(async (t) => {
        await RefreshToken.destroy(
          { where: { token: hashedToken } },
          { transaction: t },
        );

        await UserSession.destroy(
          { where: { refreshToken: hashedToken } },
          { transaction: t },
        );
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
| GET /api/v1/auth/me
|--------------------------------------------------------------------------
*/

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error("Get Me Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user",
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY EMAIL
|--------------------------------------------------------------------------
| POST /api/v1/auth/verify-email
|--------------------------------------------------------------------------
*/

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const hashedToken = hashToken(token);

    const verificationToken = await EmailVerificationToken.findOne({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    if (new Date(verificationToken.expiresAt) < new Date()) {
      await verificationToken.destroy();

      return res.status(400).json({
        success: false,
        message: "Verification token has expired",
      });
    }

    const user = await User.findByPk(verificationToken.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await sequelize.transaction(async (t) => {
      await user.update(
        {
          emailVerified: true,
          status: "ACTIVE",
        },
        { transaction: t },
      );

      await verificationToken.destroy({ transaction: t });
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Your account is now active.",
    });
  } catch (error) {
    console.error("Verify Email Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify email",
    });
  }
};

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
| POST /api/v1/auth/forgot-password
|--------------------------------------------------------------------------
*/

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    /* Read-only lookup */
    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    /* Don't reveal whether the email exists */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);
    const resetUrl = `${envConfig.FRONTEND_URL}reset-password?token=${rawToken}`;

    await sequelize.transaction(async (t) => {
      await PasswordResetToken.destroy(
        { where: { userId: user.id } },
        { transaction: t },
      );

      await PasswordResetToken.create(
        {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        { transaction: t },
      );

      await sendMail({
        to: user.email,
        subject: "Reset your C-TEX PAY password",
        message: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Password Reset</h2>
            <p>Hello ${user.firstName},</p>
            <p>We received a request to reset your C-TEX PAY password.</p>
            <p>
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#000;
                  color:#fff;
                  text-decoration:none;
                  border-radius:6px;
                "
              >
                Reset Password
              </a>
            </p>
            <p>This link expires in 15 minutes.</p>
            <p>
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    });

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    /* Preserve response shape to prevent enumeration */
    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
| POST /api/v1/auth/reset-password
|--------------------------------------------------------------------------
*/

export const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const hashedToken = hashToken(token);

    const resetToken = await PasswordResetToken.findOne({
      where: { token: hashedToken },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    if (new Date(resetToken.expiresAt) < new Date()) {
      await resetToken.destroy();

      return res.status(400).json({
        success: false,
        message: "Password reset token has expired",
      });
    }

    const user = await User.findByPk(resetToken.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* Hash password OUTSIDE the transaction (CPU-bound, not DB) */
    const hashedPassword = await bcrypt.hash(password, 12);

    await sequelize.transaction(async (t) => {
      await user.update(
        {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        { transaction: t },
      );

      await resetToken.destroy({ transaction: t });

      await UserSession.destroy(
        { where: { userId: user.id } },
        { transaction: t },
      );

      await RefreshToken.destroy(
        { where: { userId: user.id } },
        { transaction: t },
      );
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login again.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
| POST /api/v1/auth/change-password
|--------------------------------------------------------------------------
*/

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password",
      });
    }

    /* Hash OUTSIDE transaction */
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await sequelize.transaction(async (t) => {
      await user.update(
        {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
        { transaction: t },
      );

      await UserSession.destroy(
        { where: { userId: user.id } },
        { transaction: t },
      );

      await RefreshToken.destroy(
        { where: { userId: user.id } },
        { transaction: t },
      );
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

/*
|--------------------------------------------------------------------------
| RESEND VERIFICATION
|--------------------------------------------------------------------------
| POST /api/v1/auth/resend-verification
|
| Manual resend from the /verify-email-sent page.
| Same helper as login's auto-resend. No cooldown enforcement here — the
| user explicitly asked for it, so we honour the request.
|--------------------------------------------------------------------------
*/

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    /* Don't reveal account existence */
    if (!user || user.emailVerified) {
      return res.status(200).json({
        success: true,
        message:
          "If the account exists and is unverified, a new link has been sent.",
      });
    }

    await issueAndSendVerificationEmail({ user });

    return res.status(200).json({
      success: true,
      message: "Verification email sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);

    /* Preserve response shape to prevent enumeration */
    return res.status(200).json({
      success: true,
      message:
        "If the account exists and is unverified, a new link has been sent.",
    });
  }
};