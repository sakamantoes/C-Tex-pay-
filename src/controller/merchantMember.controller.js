import {
  MerchantMember,
  Role,
  MerchantMemberRole,
  User,
  MerchantInvitation,
  Notification,
} from "../models/index.js";

import sequelize from "../config/database.js";
import crypto from "crypto";
import env from "../config/constant.js";

import { sendMail } from "../service/mail.service.js";
import { createNotification } from "../service/notification.service.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Count ACTIVE owners of a merchant.
 *
 * An owner is:
 * - MerchantMember.status = ACTIVE
 * - Role.name = OWNER
 * - Role.isSystemRole = true
 */
const countActiveOwners = async (
  merchantId,
  { transaction } = {}
) => {
  return MerchantMember.count({
    where: {
      merchantId,
      status: "ACTIVE",
    },

    include: [
      {
        model: Role,
        as: "roles",
        required: true,

        through: {
          attributes: [],
        },

        where: {
          merchantId,
          name: "OWNER",
          isSystemRole: true,
        },
      },
    ],

    distinct: true,
    transaction,
  });
};

/**
 * Include definition used whenever a member is returned.
 */
const memberInclude = [
  {
    model: User,
    as: "user",

    attributes: [
      "id",
      "firstName",
      "lastName",
      "email",
      "phone",
    ],
  },

  {
    model: Role,
    as: "roles",

    through: {
      attributes: [],
    },

    attributes: [
      "id",
      "name",
      "description",
      "isSystemRole",
    ],
  },
];

/*
|--------------------------------------------------------------------------
| INVITE MEMBER
|--------------------------------------------------------------------------
| POST /merchant-members/invite
|
| Required permission:
| team.manage
|
| IMPORTANT:
|
| The email is NOT sent while the DB transaction is open.
|
| DB:
|   Create invitation
|   Create notification
|   COMMIT
|
| Then:
|   Send email
|
| Why?
|
| SMTP is an external service and cannot participate in the
| MySQL transaction. Holding a MySQL connection while waiting
| for SMTP can cause the connection to die.
|--------------------------------------------------------------------------
*/

export const inviteMember = async (req, res) => {
  try {
    const { email, roleId } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Basic validation
    |--------------------------------------------------------------------------
    */

    if (!email?.trim() || !roleId) {
      return res.status(400).json({
        success: false,
        message: "Email and role ID are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const merchantId = req.merchant.id;

    /*
    |--------------------------------------------------------------------------
    | Data we need after transaction
    |--------------------------------------------------------------------------
    */

    let invitation;
    let invitationUrl;
    let businessName;
    let roleName;

    /*
    |--------------------------------------------------------------------------
    | DATABASE TRANSACTION
    |--------------------------------------------------------------------------
    |
    | Only database operations happen here.
    |
    | If anything inside this callback throws:
    |
    | Sequelize automatically rolls back.
    |
    */

    await sequelize.transaction(async (transaction) => {
      /*
      |--------------------------------------------------------------------------
      | Verify role belongs to merchant
      |--------------------------------------------------------------------------
      */

      const role = await Role.findOne({
        where: {
          id: roleId,
          merchantId,
        },

        transaction,
      });

      if (!role) {
        const error = new Error("Role not found");
        error.statusCode = 404;
        throw error;
      }

      roleName = role.name;

      /*
      |--------------------------------------------------------------------------
      | Get business name
      |--------------------------------------------------------------------------
      */

      businessName =
        req.merchant.businessProfile?.businessName ||
        "a C-TEX PAY business";

      /*
      |--------------------------------------------------------------------------
      | Check existing user
      |--------------------------------------------------------------------------
      */

      const invitedUser = await User.findOne({
        where: {
          email: normalizedEmail,
        },

        transaction,
      });

      /*
      |--------------------------------------------------------------------------
      | Check existing membership
      |--------------------------------------------------------------------------
      */

      if (invitedUser) {
        const existingMember =
          await MerchantMember.findOne({
            where: {
              merchantId,
              userId: invitedUser.id,
            },

            transaction,
          });

        /*
        | Existing ACTIVE/PENDING member cannot be invited again.
        | REMOVED members can be invited again.
        */

        if (
          existingMember &&
          existingMember.status !== "REMOVED"
        ) {
          const error = new Error(
            "User is already a member of this merchant"
          );

          error.statusCode = 409;

          throw error;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent duplicate pending invitations
      |--------------------------------------------------------------------------
      */

      const existingInvitation =
        await MerchantInvitation.findOne({
          where: {
            merchantId,
            email: normalizedEmail,
            acceptedAt: null,
          },

          transaction,
        });

      if (existingInvitation) {
        const error = new Error(
          "A pending invitation already exists for this email"
        );

        error.statusCode = 409;

        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | Generate invitation token
      |--------------------------------------------------------------------------
      */

      const rawToken = crypto
        .randomBytes(32)
        .toString("hex");

      const hashedToken = hashToken(rawToken);

      /*
      |--------------------------------------------------------------------------
      | Create invitation
      |--------------------------------------------------------------------------
      */

      invitation = await MerchantInvitation.create(
        {
          merchantId,
          roleId,

          email: normalizedEmail,

          token: hashedToken,

          expiresAt: new Date(
            Date.now() +
              7 * 24 * 60 * 60 * 1000
          ),
        },

        {
          transaction,
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Create notification for existing user
      |--------------------------------------------------------------------------
      */

      if (invitedUser) {
        await createNotification(
          {
            userId: invitedUser.id,

            type: "MERCHANT_INVITATION",

            title: "Merchant invitation",

            message: `You have been invited to join ${businessName} as ${role.name}.`,

            data: {
              invitationId: invitation.id,
              merchantId,
              roleId,
            },
          },

          {
            transaction,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Build invitation URL
      |--------------------------------------------------------------------------
      */

      const baseUrl = (
        env.FRONTEND_URL ||
        "http://localhost:5173"
      ).replace(/\/$/, "");

      invitationUrl =
        `${baseUrl}/accept-invitation` +
        `?token=${rawToken}`;
    });

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | The DB transaction has already committed here.
    |
    | We now send the email.
    |
    | This prevents SMTP from holding a MySQL connection open.
    |--------------------------------------------------------------------------
    */

    try {
      await sendMail({
        to: normalizedEmail,

        subject: `Invitation to join ${businessName}`,

        message: `
          <div style="font-family: Arial, sans-serif;">
            <h2>
              You have been invited to join a business on C-TEX PAY
            </h2>

            <p>
              You have been invited to join
              <strong>${businessName}</strong>
              as
              <strong>${roleName}</strong>.
            </p>

            <p>
              <a href="${invitationUrl}">
                Accept invitation
              </a>
            </p>

            <p>
              This invitation expires in 7 days.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      /*
      |--------------------------------------------------------------------------
      | EMAIL FAILED
      |--------------------------------------------------------------------------
      |
      | We DO NOT rollback the DB transaction here.
      |
      | Why?
      |
      | The transaction has already committed.
      |
      | Also, an email cannot be rolled back.
      |
      | The invitation exists and can be resent.
      |--------------------------------------------------------------------------
      */

      console.error(
        "Invitation email failed:",
        emailError
      );

      return res.status(202).json({
        success: true,

        message:
          "Invitation was created, but the email could not be sent. Please retry the invitation email.",

        data: {
          invitationId: invitation.id,
          expiresAt: invitation.expiresAt,
          emailSent: false,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message: "Invitation sent successfully",

      data: {
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
        emailSent: true,
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Managed transaction already rolled back automatically.
    |--------------------------------------------------------------------------
    */

    console.error(
      "Invite member error:",
      error
    );

    const statusCode =
      error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,

      message:
        error.message ||
        "Failed to invite member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ACCEPT MEMBER INVITATION
|--------------------------------------------------------------------------
| POST /merchant-members/invitations/accept
| POST /merchant-members/invitations/:id/accept
|
| Requires:
| protect
|--------------------------------------------------------------------------
*/

export const acceptMemberInvitation = async (
  req,
  res
) => {
  try {
    const { token } = req.body || {};

    if (!req.params.id && !token) {
      return res.status(400).json({
        success: false,
        message:
          "Invitation token or ID is required",
      });
    }

    const result =
      await sequelize.transaction(
        async (transaction) => {
          const where = req.params.id
            ? {
                id: req.params.id,
              }
            : {
                token: hashToken(token),
              };

          /*
          |--------------------------------------------------------------------------
          | Find and lock invitation
          |--------------------------------------------------------------------------
          */

          const invitation =
            await MerchantInvitation.findOne({
              where,

              transaction,

              lock: transaction.LOCK.UPDATE,
            });

          /*
          |--------------------------------------------------------------------------
          | Validate invitation
          |--------------------------------------------------------------------------
          */

          if (
            !invitation ||
            invitation.acceptedAt ||
            new Date(invitation.expiresAt) <=
              new Date()
          ) {
            const error = new Error(
              "Invitation is invalid or expired"
            );

            error.statusCode = 400;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Ensure invitation belongs to logged-in user
          |--------------------------------------------------------------------------
          */

          if (
            req.user.email.toLowerCase() !==
            invitation.email.toLowerCase()
          ) {
            const error = new Error(
              "This invitation was sent to a different email address"
            );

            error.statusCode = 403;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Find existing membership
          |--------------------------------------------------------------------------
          */

          let member =
            await MerchantMember.findOne({
              where: {
                merchantId:
                  invitation.merchantId,

                userId: req.user.id,
              },

              transaction,

              lock: transaction.LOCK.UPDATE,
            });

          /*
          |--------------------------------------------------------------------------
          | Prevent duplicate active membership
          |--------------------------------------------------------------------------
          */

          if (
            member &&
            member.status !== "REMOVED"
          ) {
            const error = new Error(
              "You are already a member of this merchant"
            );

            error.statusCode = 409;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Reactivate removed membership
          |--------------------------------------------------------------------------
          */

          if (member) {
            await member.update(
              {
                status: "ACTIVE",
                joinedAt: new Date(),
              },

              {
                transaction,
              }
            );
          } else {
            /*
            |--------------------------------------------------------------------------
            | Create membership
            |--------------------------------------------------------------------------
            */

            member =
              await MerchantMember.create(
                {
                  merchantId:
                    invitation.merchantId,

                  userId: req.user.id,

                  status: "ACTIVE",

                  joinedAt: new Date(),
                },

                {
                  transaction,
                }
              );
          }

          /*
          |--------------------------------------------------------------------------
          | Assign invitation role
          |--------------------------------------------------------------------------
          */

          await MerchantMemberRole.findOrCreate(
            {
              where: {
                merchantMemberId: member.id,
                roleId: invitation.roleId,
              },

              defaults: {
                merchantMemberId: member.id,
                roleId: invitation.roleId,
              },

              transaction,
            }
          );

          /*
          |--------------------------------------------------------------------------
          | Mark invitation accepted
          |--------------------------------------------------------------------------
          */

          await invitation.update(
            {
              acceptedAt: new Date(),
            },

            {
              transaction,
            }
          );

          /*
          |--------------------------------------------------------------------------
          | Mark matching invitation notification as read
          |--------------------------------------------------------------------------
          */

          const invitationNotifications =
            await Notification.findAll({
              where: {
                userId: req.user.id,

                type: "MERCHANT_INVITATION",
              },

              transaction,
            });

          for (const notification of
            invitationNotifications) {
            if (
              notification.data?.invitationId ===
              invitation.id
            ) {
              await notification.update(
                {
                  readAt: new Date(),
                },

                {
                  transaction,
                }
              );
            }
          }

          /*
          |--------------------------------------------------------------------------
          | Return data from transaction
          |--------------------------------------------------------------------------
          */

          return {
            memberId: member.id,

            merchantId:
              invitation.merchantId,

            roleId: invitation.roleId,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Transaction committed successfully
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      message:
        "Invitation accepted successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Accept member invitation error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Failed to accept invitation",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET MY NOTIFICATIONS
|--------------------------------------------------------------------------
| GET /merchant-members/notifications
|--------------------------------------------------------------------------
*/

export const getMyNotifications = async (
  req,
  res
) => {
  try {
    const notifications =
      await Notification.findAll({
        where: {
          userId: req.user.id,
        },

        order: [["createdAt", "DESC"]],

        limit: 50,
      });

    return res.status(200).json({
      success: true,

      data: {
        notifications,

        unreadCount:
          notifications.filter(
            (notification) =>
              !notification.readAt
          ).length,
      },
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get notifications",
    });
  }
};

/*
|--------------------------------------------------------------------------
| MARK NOTIFICATION READ
|--------------------------------------------------------------------------
| PATCH /merchant-members/notifications/:id/read
|--------------------------------------------------------------------------
*/

export const markNotificationRead = async (
  req,
  res
) => {
  try {
    const notification =
      await Notification.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found",
      });
    }

    await notification.update({
      readAt: new Date(),
    });

    return res.status(200).json({
      success: true,

      message:
        "Notification marked as read",

      data: {
        notification,
      },
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update notification",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET MEMBERS
|--------------------------------------------------------------------------
| GET /merchant-members
|
| REMOVED members are excluded.
|--------------------------------------------------------------------------
*/

export const getMembers = async (
  req,
  res
) => {
  try {
    const merchantId = req.merchant.id;

    const members =
      await MerchantMember.findAll({
        where: {
          merchantId,
          status: "ACTIVE",
        },

        include: memberInclude,

        order: [["joinedAt", "DESC"]],
      });

    return res.status(200).json({
      success: true,

      data: {
        members,
        count: members.length,
      },
    });
  } catch (error) {
    console.error(
      "Get members error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get members",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE MEMBER
|--------------------------------------------------------------------------
| GET /merchant-members/:id
|--------------------------------------------------------------------------
*/

export const getMember = async (
  req,
  res
) => {
  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    const member =
      await MerchantMember.findOne({
        where: {
          id: memberId,
          merchantId,
          status: "ACTIVE",
        },

        include: memberInclude,
      });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        member,
      },
    });
  } catch (error) {
    console.error(
      "Get member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ASSIGN ROLE TO MEMBER
|--------------------------------------------------------------------------
| POST /merchant-members/:id/roles
| POST /merchant-members/:id/roles/:roleId
|
| Required permission:
| team.manage
|--------------------------------------------------------------------------
*/

export const assignRoleToMember = async (
  req,
  res
) => {
  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    const roleId =
      req.params.roleId ||
      req.body.roleId;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "Role ID is required",
      });
    }

    const updatedMember =
      await sequelize.transaction(
        async (transaction) => {
          /*
          |--------------------------------------------------------------------------
          | Find active member
          |--------------------------------------------------------------------------
          */

          const member =
            await MerchantMember.findOne({
              where: {
                id: memberId,
                merchantId,
                status: "ACTIVE",
              },

              transaction,

              lock: transaction.LOCK.UPDATE,
            });

          if (!member) {
            const error = new Error(
              "Active member not found"
            );

            error.statusCode = 404;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Verify role belongs to merchant
          |--------------------------------------------------------------------------
          */

          const role = await Role.findOne({
            where: {
              id: roleId,
              merchantId,
            },

            transaction,
          });

          if (!role) {
            const error = new Error(
              "Role not found"
            );

            error.statusCode = 404;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Prevent duplicate role
          |--------------------------------------------------------------------------
          */

          const existingAssignment =
            await MerchantMemberRole.findOne({
              where: {
                merchantMemberId: memberId,
                roleId,
              },

              transaction,
            });

          if (existingAssignment) {
            const error = new Error(
              "Role is already assigned to this member"
            );

            error.statusCode = 409;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Assign role
          |--------------------------------------------------------------------------
          */

          await MerchantMemberRole.create(
            {
              merchantMemberId: memberId,
              roleId,
            },

            {
              transaction,
            }
          );

          /*
          |--------------------------------------------------------------------------
          | Return member after assignment
          |--------------------------------------------------------------------------
          |
          | We don't need to perform the relationship reload
          | while holding the transaction open.
          |
          */

          return member;
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Reload relationships AFTER transaction
    |--------------------------------------------------------------------------
    */

    const member =
      await MerchantMember.findByPk(
        updatedMember.id,
        {
          include: memberInclude,
        }
      );

    return res.status(200).json({
      success: true,

      message:
        "Role assigned to member successfully",

      data: {
        member,
      },
    });
  } catch (error) {
    console.error(
      "Assign role to member error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Failed to assign role to member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE ROLE FROM MEMBER
|--------------------------------------------------------------------------
| DELETE /merchant-members/:id/roles/:roleId
|
| Required permission:
| team.manage
|--------------------------------------------------------------------------
*/

export const removeRoleFromMember = async (
  req,
  res
) => {
  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;
    const roleId = req.params.roleId;

    await sequelize.transaction(
      async (transaction) => {
        /*
        |--------------------------------------------------------------------------
        | Find active member
        |--------------------------------------------------------------------------
        */

        const member =
          await MerchantMember.findOne({
            where: {
              id: memberId,
              merchantId,
              status: "ACTIVE",
            },

            transaction,

            lock: transaction.LOCK.UPDATE,
          });

        if (!member) {
          const error = new Error(
            "Active member not found"
          );

          error.statusCode = 404;

          throw error;
        }

        /*
        |--------------------------------------------------------------------------
        | Verify role
        |--------------------------------------------------------------------------
        */

        const role = await Role.findOne({
          where: {
            id: roleId,
            merchantId,
          },

          transaction,
        });

        if (!role) {
          const error = new Error(
            "Role not found"
          );

          error.statusCode = 404;

          throw error;
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent removal of final OWNER
        |--------------------------------------------------------------------------
        */

        if (
          role.isSystemRole &&
          role.name === "OWNER"
        ) {
          const ownerCount =
            await countActiveOwners(
              merchantId,
              {
                transaction,
              }
            );

          if (ownerCount <= 1) {
            const error = new Error(
              "Cannot remove the only OWNER role from the last owner"
            );

            error.statusCode = 403;

            throw error;
          }
        }

        /*
        |--------------------------------------------------------------------------
        | Find assignment
        |--------------------------------------------------------------------------
        */

        const assignment =
          await MerchantMemberRole.findOne({
            where: {
              merchantMemberId: memberId,
              roleId,
            },

            transaction,
          });

        if (!assignment) {
          const error = new Error(
            "Role is not assigned to this member"
          );

          error.statusCode = 404;

          throw error;
        }

        /*
        |--------------------------------------------------------------------------
        | Remove role
        |--------------------------------------------------------------------------
        */

        await assignment.destroy({
          transaction,
        });
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Transaction committed
    |--------------------------------------------------------------------------
    */

    const updatedMember =
      await MerchantMember.findByPk(
        memberId,
        {
          include: memberInclude,
        }
      );

    return res.status(200).json({
      success: true,

      message:
        "Role removed from member successfully",

      data: {
        member: updatedMember,
      },
    });
  } catch (error) {
    console.error(
      "Remove role from member error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Failed to remove role from member",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE NOTIFICATION
|--------------------------------------------------------------------------
| DELETE /merchant-members/notifications/:id
|
| Only the owner of a notification (userId matches) can delete it.
|--------------------------------------------------------------------------
*/

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.destroy();

    return res.status(200).json({
      success: true,
      message: "Notification deleted",
      data: { id: req.params.id },
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE ALL NOTIFICATIONS
|--------------------------------------------------------------------------
| DELETE /merchant-members/notifications
|
| Deletes ALL notifications for the authenticated user.
| Scoped by userId — cannot affect other users.
|--------------------------------------------------------------------------
*/

export const deleteAllNotifications = async (req, res) => {
  try {
    const deleted = await Notification.destroy({
      where: {
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "All notifications deleted",
      data: { deleted },
    });
  } catch (error) {
    console.error("Delete all notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notifications",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE MEMBER
|--------------------------------------------------------------------------
| DELETE /merchant-members/:id
|
| Required permission:
| team.manage
|
| Behavior:
|
| 1. Find ACTIVE membership.
| 2. Lock membership.
| 3. Check whether member is OWNER.
| 4. Prevent removing final OWNER.
| 5. Delete ALL role assignments.
| 6. Mark membership REMOVED.
| 7. Commit atomically.
|--------------------------------------------------------------------------
*/

export const removeMember = async (
  req,
  res
) => {
  try {
    const merchantId = req.merchant.id;
    const memberId = req.params.id;

    /*
    |--------------------------------------------------------------------------
    | Entire removal operation is atomic.
    |--------------------------------------------------------------------------
    */

    const result =
      await sequelize.transaction(
        async (transaction) => {
          /*
          |--------------------------------------------------------------------------
          | Find active member and lock row
          |--------------------------------------------------------------------------
          */

          const member =
            await MerchantMember.findOne({
              where: {
                id: memberId,
                merchantId,
                status: "ACTIVE",
              },

              include: [
                {
                  model: Role,

                  as: "roles",

                  through: {
                    attributes: [],
                  },

                  attributes: [
                    "id",
                    "name",
                    "isSystemRole",
                  ],
                },
              ],

              transaction,

              lock: transaction.LOCK.UPDATE,
            });

          if (!member) {
            const error = new Error(
              "Active member not found"
            );

            error.statusCode = 404;

            throw error;
          }

          /*
          |--------------------------------------------------------------------------
          | Determine whether member is OWNER
          |--------------------------------------------------------------------------
          */

          const isOwner =
            member.roles.some(
              (role) =>
                role.name === "OWNER" &&
                role.isSystemRole === true
            );

          /*
          |--------------------------------------------------------------------------
          | Prevent removing final OWNER
          |--------------------------------------------------------------------------
          */

          if (isOwner) {
            const ownerCount =
              await countActiveOwners(
                merchantId,
                {
                  transaction,
                }
              );

            if (ownerCount <= 1) {
              const error = new Error(
                "Cannot remove the only owner of the merchant"
              );

              error.statusCode = 403;

              throw error;
            }
          }

          /*
          |--------------------------------------------------------------------------
          | Remove ALL role assignments
          |--------------------------------------------------------------------------
          */

          await MerchantMemberRole.destroy({
            where: {
              merchantMemberId: memberId,
            },

            transaction,
          });

          /*
          |--------------------------------------------------------------------------
          | Soft remove membership
          |--------------------------------------------------------------------------
          */

          await member.update(
            {
              status: "REMOVED",
            },

            {
              transaction,
            }
          );

          /*
          |--------------------------------------------------------------------------
          | Return result
          |--------------------------------------------------------------------------
          */

          return {
            memberId,

            status: "REMOVED",

            isOwner,

            rolesRemoved: true,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Transaction committed successfully.
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      message: result.isOwner
        ? "Owner removed successfully"
        : "Member removed successfully",

      data: {
        memberId: result.memberId,

        status: result.status,

        rolesRemoved:
          result.rolesRemoved,
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Managed transaction automatically rolled back.
    |--------------------------------------------------------------------------
    */

    console.error(
      "Remove member error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Failed to remove member",
    });
  }
};