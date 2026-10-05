export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn(
    "merchant_notification_deliveries",
    "nextAttemptAt",
    {
      type: Sequelize.DATE,
      allowNull: true,
    }
  );
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