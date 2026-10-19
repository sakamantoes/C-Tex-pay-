export async function up(queryInterface, Sequelize) {
  const columns = await queryInterface.describeTable("merchant_settings");
  for (const name of [
    "successRedirectUrl",
    "failureRedirectUrl",
    "cancelRedirectUrl",
  ]) {
    if (!columns[name]) {
      await queryInterface.addColumn("merchant_settings", name, {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }
  }
}

export async function down(queryInterface) {
  const columns = await queryInterface.describeTable("merchant_settings");
  for (const name of [
    "cancelRedirectUrl",
    "failureRedirectUrl",
    "successRedirectUrl",
  ]) {
    if (columns[name]) await queryInterface.removeColumn("merchant_settings", name);
  }
}
