export async function up(queryInterface, Sequelize) {
  const columns = await queryInterface.describeTable("api_keys");
  if (!columns.keyEncrypted) {
    await queryInterface.addColumn("api_keys", "keyEncrypted", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
}

export async function down(queryInterface) {
  const columns = await queryInterface.describeTable("api_keys");
  if (columns.keyEncrypted) {
    await queryInterface.removeColumn("api_keys", "keyEncrypted");
  }
}
