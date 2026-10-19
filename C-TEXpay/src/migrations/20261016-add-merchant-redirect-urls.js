export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("merchant_settings", "successRedirectUrl", {
    type: Sequelize.STRING(500),
    allowNull: true,
  });

  await queryInterface.addColumn("merchant_settings", "failureRedirectUrl", {
    type: Sequelize.STRING(500),
    allowNull: true,
  });

  await queryInterface.addColumn("merchant_settings", "cancelRedirectUrl", {
    type: Sequelize.STRING(500),
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("merchant_settings", "successRedirectUrl");
  await queryInterface.removeColumn("merchant_settings", "failureRedirectUrl");
  await queryInterface.removeColumn("merchant_settings", "cancelRedirectUrl");
}