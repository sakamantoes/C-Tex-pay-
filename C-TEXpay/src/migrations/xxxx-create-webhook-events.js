export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("webhook_events", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    provider: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    eventType: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    eventKey: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    payload: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    processedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    "webhook_events",
    ["provider", "eventKey"],
    {
      unique: true,
      name: "webhook_events_provider_eventkey_unique",
    }
  );

  await queryInterface.addIndex("webhook_events", ["provider", "eventType"]);
  await queryInterface.addIndex("webhook_events", ["processedAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("webhook_events");
}