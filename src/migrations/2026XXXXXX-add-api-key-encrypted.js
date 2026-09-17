export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("api_keys", "keyEncrypted", {
    type: Sequelize.TEXT,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("api_keys", "keyEncrypted");
}
