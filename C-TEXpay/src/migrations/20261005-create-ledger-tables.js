export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("ledger_accounts", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: Sequelize.ENUM(
        "MERCHANT_AVAILABLE",
        "MERCHANT_PENDING",
        "CTEX_FEE_REVENUE",
        "CTEX_PROVIDER_EXPENSE",
        "CLEARING"
      ),
      allowNull: false,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "ledger_accounts",
    ["merchantId", "type", "currency"],
    {
      name: "ledger_accounts_merchant_type_currency",
      unique: true,
    }
  );
  await queryInterface.addIndex("ledger_accounts", ["type", "currency"]);
  await queryInterface.addIndex("ledger_accounts", ["merchantId"]);

  await queryInterface.createTable("ledger_transactions", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    reference: { type: Sequelize.STRING(150), allowNull: false },
    type: {
      type: Sequelize.ENUM(
        "PAYMENT_SETTLEMENT",
        "PROVIDER_COST",
        "REFUND",
        "REVERSAL",
        "ADJUSTMENT",
        "PAYOUT"
      ),
      allowNull: false,
    },
    merchantId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "merchants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: Sequelize.ENUM("POSTED", "REVERSED"),
      allowNull: false,
      defaultValue: "POSTED",
    },
    paymentId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "payments", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    metadata: { type: Sequelize.JSON, allowNull: true },
    postedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "ledger_transactions",
    ["reference", "currency"],
    {
      name: "ledger_transactions_reference_currency_unique",
      unique: true,
    }
  );
  await queryInterface.addIndex("ledger_transactions", ["merchantId"]);
  await queryInterface.addIndex("ledger_transactions", ["type"]);
  await queryInterface.addIndex("ledger_transactions", ["paymentId"]);
  await queryInterface.addIndex("ledger_transactions", ["postedAt"]);

  await queryInterface.createTable("ledger_entries", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    ledgerTransactionId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "ledger_transactions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    ledgerAccountId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "ledger_accounts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    direction: {
      type: Sequelize.ENUM("DEBIT", "CREDIT"),
      allowNull: false,
    },
    amount: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
    },
    currency: {
      type: Sequelize.ENUM("NGN"),
      allowNull: false,
      defaultValue: "NGN",
    },
    metadata: { type: Sequelize.JSON, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex("ledger_entries", ["ledgerTransactionId"]);
  await queryInterface.addIndex("ledger_entries", ["ledgerAccountId"]);
  await queryInterface.addIndex("ledger_entries", ["currency"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("ledger_entries");
  await queryInterface.dropTable("ledger_transactions");
  await queryInterface.dropTable("ledger_accounts");
}