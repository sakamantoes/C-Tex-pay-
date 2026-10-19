export async function up(queryInterface, Sequelize) {
  const columns = await queryInterface.describeTable(
    "merchant_notification_deliveries",
  );
  if (!columns.nextAttemptAt) {
    throw new Error(
      "merchant_notification_deliveries.nextAttemptAt is required before this migration runs",
    );
  }
  if (columns.nextAttemptAt.allowNull !== true) {
    await queryInterface.changeColumn(
      "merchant_notification_deliveries",
      "nextAttemptAt",
      {
        type: Sequelize.DATE,
        allowNull: true,
      },
    );
  }
}

export async function down(queryInterface, Sequelize) {
  // NOTE: Down migration will fail if there are rows with NULL nextAttemptAt.
  // Before rolling back, decide a policy for terminal-state rows.
  await queryInterface.changeColumn(
    "merchant_notification_deliveries",
    "nextAttemptAt",
    {
      type: Sequelize.DATE,
      allowNull: false,
    }
  );
}
