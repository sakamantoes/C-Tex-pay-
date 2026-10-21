export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("payouts");

  if (!table.providerFeeReported) {
    await queryInterface.addColumn("payouts", "providerFeeReported", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: "feeAmount",
    });
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("payouts");

  if (table.providerFeeReported) {
    await queryInterface.removeColumn("payouts", "providerFeeReported");
  }
}