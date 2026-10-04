export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("merchant_settings", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    notifyPaymentSuccessInApp: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notifyPaymentSuccessEmail: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notificationEmail: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex("merchant_settings", ["merchantId"], { unique: true });

  await queryInterface.createTable("merchant_notification_deliveries", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    paymentId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "payments", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    eventKey: { type: Sequelize.STRING(150), allowNull: false, unique: true },
    recipientEmail: { type: Sequelize.STRING(255), allowNull: false },
    payload: { type: Sequelize.JSON, allowNull: false },
    status: {
      type: Sequelize.ENUM("PENDING", "PROCESSING", "RETRYING", "SENT", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    attemptCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    nextAttemptAt: { type: Sequelize.DATE, allowNull: false },
    processingStartedAt: { type: Sequelize.DATE, allowNull: true },
    lastAttemptAt: { type: Sequelize.DATE, allowNull: true },
    sentAt: { type: Sequelize.DATE, allowNull: true },
    lastError: { type: Sequelize.STRING(500), allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex("merchant_notification_deliveries", ["status", "nextAttemptAt"]);
  await queryInterface.addIndex("merchant_notification_deliveries", ["merchantId", "createdAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("merchant_notification_deliveries");
  await queryInterface.dropTable("merchant_settings");
}
