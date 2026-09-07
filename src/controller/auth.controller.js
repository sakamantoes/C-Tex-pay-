import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import UserSession from "../models/UserSession.js";
import EmailVerificationToken from "../models/EmailVerificationToken.js";
import PasswordResetToken from "../models/PasswordResetToken.js";

import { sendMail } from "../service/mail.service.js";
import env from "../config/constant.js";

//helper functions

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m",
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

// register
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    //validate required fields

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    //check if email already exists
    const existingEmail = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    //check phone number
    if (phone) {
      const existingPhone = await User.findOne({
        where: {
          phone,
        },
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "An account with this phone number already exists",
        });
      }
    }

    //validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash password
    |--------------------------------------------------------------------------
    */

    const hashedPassword = await bcrypt.hash(password, 12);

    /*
    |--------------------------------------------------------------------------
    | Create user
    |--------------------------------------------------------------------------
    */

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone || null,
      password: hashedPassword,
      role: "USER",
      status: "PENDING",
      emailVerified: false,
      phoneVerified: false,
    });

    /*
    |--------------------------------------------------------------------------
    | Generate email verification token
    |--------------------------------------------------------------------------
    */

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedVerificationToken = hashToken(rawToken);

    await EmailVerificationToken.create({
      userId: user.id,
      token: hashedVerificationToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    /*
    |--------------------------------------------------------------------------
    | Verification URL
    |--------------------------------------------------------------------------
    */

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    /*
    |--------------------------------------------------------------------------
    | Send verification email
    |--------------------------------------------------------------------------
    */

    await sendMail({
      to: normalizedEmail,
      subject: "Verify your C-TEX PAY account",
      message: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Welcome to C-TEX PAY</h2>

          <p>Hello ${user.firstName},</p>

          <p>
            Thank you for creating your C-TEX PAY account.
            Please verify your email address to continue.
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

          <p>
            This verification link expires in 30 minutes.
          </p>

          <p>
            If you did not create this account, you can safely ignore
            this email.
          </p>
        </div>
      `,
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

    /*
    |--------------------------------------------------------------------------
    | Find user
    |--------------------------------------------------------------------------
    */

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check account lock
    |--------------------------------------------------------------------------
    */

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked. Please try again later.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check account status
    |--------------------------------------------------------------------------
    */

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
    | Verify password
    |--------------------------------------------------------------------------
    */

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;

      const updates = {
        failedLoginAttempts: attempts,
      };

      /*
      | Lock account after 5 failed attempts
      */

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
    |--------------------------------------------------------------------------
    | Reset failed login attempts
    |--------------------------------------------------------------------------
    */

    await user.update({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    /*
    |--------------------------------------------------------------------------
    | Generate tokens
    |--------------------------------------------------------------------------
    */

    const accessToken = generateAccessToken(user);

    const rawRefreshToken = generateRefreshToken();

    const hashedRefreshToken = hashToken(rawRefreshToken);

    /*
    |--------------------------------------------------------------------------
    | Create refresh token
    |--------------------------------------------------------------------------
    */

    await RefreshToken.create({
      userId: user.id,
      token: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    /*
    |--------------------------------------------------------------------------
    | Create session
    |--------------------------------------------------------------------------
    */

    await UserSession.create({
      userId: user.id,
      refreshToken: hashedRefreshToken,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        user: sanitizeUser(user),

        accessToken,

        refreshToken: rawRefreshToken,

        expiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m",
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
      where: {
        token: hashedToken,
      },
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check expiration
    |--------------------------------------------------------------------------
    */

    if (new Date(storedToken.expiresAt) < new Date()) {
      await storedToken.destroy();

      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get user
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Generate new access token
    |--------------------------------------------------------------------------
    */

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
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

      await RefreshToken.destroy({
        where: {
          token: hashedToken,
        },
      });

      await UserSession.destroy({
        where: {
          refreshToken: hashedToken,
        },
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
| Requires auth middleware
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
      data: {
        user: sanitizeUser(user),
      },
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
      where: {
        token: hashedToken,
      },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check expiration
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Verify email
    |--------------------------------------------------------------------------
    */

    await user.update({
      emailVerified: true,
      status: "ACTIVE",
    });

    /*
    |--------------------------------------------------------------------------
    | Delete used token
    |--------------------------------------------------------------------------
    */

    await verificationToken.destroy();

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

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT:
    | Do not reveal whether the email exists.
    |--------------------------------------------------------------------------
    */

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete previous reset tokens
    |--------------------------------------------------------------------------
    */

    await PasswordResetToken.destroy({
      where: {
        userId: user.id,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Generate reset token
    |--------------------------------------------------------------------------
    */

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = hashToken(rawToken);

    await PasswordResetToken.create({
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    /*
    |--------------------------------------------------------------------------
    | Reset URL
    |--------------------------------------------------------------------------
    */

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    /*
    |--------------------------------------------------------------------------
    | Send email
    |--------------------------------------------------------------------------
    */

    await sendMail({
      to: user.email,
      subject: "Reset your C-TEX PAY password",
      message: `
        <div style="font-family: Arial, sans-serif;">

          <h2>Password Reset</h2>

          <p>
            Hello ${user.firstName},
          </p>

          <p>
            We received a request to reset your C-TEX PAY password.
          </p>

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

          <p>
            This link expires in 15 minutes.
          </p>

          <p>
            If you did not request this, you can safely ignore this email.
          </p>

        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    /*
    |--------------------------------------------------------------------------
    | Don't expose internal email/database errors
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Hash incoming reset token
    |--------------------------------------------------------------------------
    */

    const hashedToken = hashToken(token);

    const resetToken = await PasswordResetToken.findOne({
      where: {
        token: hashedToken,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check expiration
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Hash new password
    |--------------------------------------------------------------------------
    */

    const hashedPassword = await bcrypt.hash(password, 12);

    /*
    |--------------------------------------------------------------------------
    | Update password
    |--------------------------------------------------------------------------
    */

    await user.update({
      password: hashedPassword,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    /*
    |--------------------------------------------------------------------------
    | Delete reset token
    |--------------------------------------------------------------------------
    */

    await resetToken.destroy();

    /*
    |--------------------------------------------------------------------------
    | Revoke existing sessions
    |--------------------------------------------------------------------------
    */

    await UserSession.destroy({
      where: {
        userId: user.id,
      },
    });

    await RefreshToken.destroy({
      where: {
        userId: user.id,
      },
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
| Requires auth middleware
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

    /*
    |--------------------------------------------------------------------------
    | Get authenticated user
    |--------------------------------------------------------------------------
    */

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify current password
    |--------------------------------------------------------------------------
    */

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent same password
    |--------------------------------------------------------------------------
    */

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Hash new password
    |--------------------------------------------------------------------------
    */

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    /*
    |--------------------------------------------------------------------------
    | Update password
    |--------------------------------------------------------------------------
    */

    await user.update({
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    /*
    |--------------------------------------------------------------------------
    | Revoke sessions
    |--------------------------------------------------------------------------
    */

    await UserSession.destroy({
      where: {
        userId: user.id,
      },
    });

    await RefreshToken.destroy({
      where: {
        userId: user.id,
      },
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
