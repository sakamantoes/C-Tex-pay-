const PAYMENTS_TABLE = "payments";
const PAYMENT_LINKS_TABLE = "payment_links";
const PAYMENT_LINK_INDEX = "payments_payment_link_id";
const PAYMENT_LINK_CONSTRAINT = "payments_payment_link_id_fkey";

function normalizeType(type) {
  return String(type || "")
    .toUpperCase()
    .replace(/\s+BINARY\b/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function getTableName(table) {
  return typeof table === "string" ? table : table?.tableName;
}

export async function up(queryInterface, Sequelize) {
  const tableNames = (await queryInterface.showAllTables()).map(getTableName);
  if (!tableNames.includes(PAYMENTS_TABLE)) {
    throw new Error(`Required table ${PAYMENTS_TABLE} does not exist`);
  }
  if (!tableNames.includes(PAYMENT_LINKS_TABLE)) {
    throw new Error(`Required table ${PAYMENT_LINKS_TABLE} does not exist`);
  }

  const paymentLinkColumns = await queryInterface.describeTable(PAYMENT_LINKS_TABLE);
  const paymentLinkIdColumn = paymentLinkColumns.id;
  if (!paymentLinkIdColumn || normalizeType(paymentLinkIdColumn.type) !== "CHAR(36)") {
    throw new Error("payment_links.id must be CHAR(36) before this migration runs");
  }

  let paymentColumns = await queryInterface.describeTable(PAYMENTS_TABLE);
  if (!paymentColumns.paymentLinkId) {
    await queryInterface.addColumn(PAYMENTS_TABLE, "paymentLinkId", {
      type: Sequelize.UUID,
      allowNull: true,
      comment: "Set when the payment originated from a Payment Link",
    });
    paymentColumns = await queryInterface.describeTable(PAYMENTS_TABLE);
  }

  const paymentLinkId = paymentColumns.paymentLinkId;
  if (normalizeType(paymentLinkId.type) !== "CHAR(36)" || paymentLinkId.allowNull !== true) {
    throw new Error("payments.paymentLinkId exists but is not nullable CHAR(36); refusing to alter it automatically");
  }

  const indexes = await queryInterface.showIndex(PAYMENTS_TABLE);
  const hasPaymentLinkIndex = indexes.some((index) =>
    (index.fields || []).length === 1 && index.fields[0].attribute === "paymentLinkId",
  );
  if (!hasPaymentLinkIndex) {
    await queryInterface.addIndex(PAYMENTS_TABLE, ["paymentLinkId"], {
      name: PAYMENT_LINK_INDEX,
    });
  }

  if (typeof queryInterface.getForeignKeyReferencesForTable === "function") {
    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable(PAYMENTS_TABLE);
    const hasPaymentLinkForeignKey = foreignKeys.some((foreignKey) =>
      foreignKey.columnName === "paymentLinkId" &&
      foreignKey.referencedTableName === PAYMENT_LINKS_TABLE &&
      foreignKey.referencedColumnName === "id",
    );
    if (!hasPaymentLinkForeignKey) {
      await queryInterface.addConstraint(PAYMENTS_TABLE, {
        fields: ["paymentLinkId"],
        type: "foreign key",
        name: PAYMENT_LINK_CONSTRAINT,
        references: { table: PAYMENT_LINKS_TABLE, field: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  }
}

export async function down(queryInterface) {
  const tableNames = (await queryInterface.showAllTables()).map(getTableName);
  if (!tableNames.includes(PAYMENTS_TABLE)) return;

  const paymentColumns = await queryInterface.describeTable(PAYMENTS_TABLE);
  if (!paymentColumns.paymentLinkId) return;

  const indexes = await queryInterface.showIndex(PAYMENTS_TABLE);
  const paymentLinkIndexes = indexes.filter((index) =>
    (index.fields || []).length === 1 && index.fields[0].attribute === "paymentLinkId",
  );
  for (const index of paymentLinkIndexes) {
    await queryInterface.removeIndex(PAYMENTS_TABLE, index.name);
  }

  if (typeof queryInterface.getForeignKeyReferencesForTable === "function") {
    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable(PAYMENTS_TABLE);
    const paymentLinkForeignKeys = foreignKeys.filter((foreignKey) =>
      foreignKey.columnName === "paymentLinkId" &&
      foreignKey.referencedTableName === PAYMENT_LINKS_TABLE &&
      foreignKey.referencedColumnName === "id",
    );
    for (const foreignKey of paymentLinkForeignKeys) {
      await queryInterface.removeConstraint(PAYMENTS_TABLE, foreignKey.constraintName);
    }
  }

  await queryInterface.removeColumn(PAYMENTS_TABLE, "paymentLinkId");
}
