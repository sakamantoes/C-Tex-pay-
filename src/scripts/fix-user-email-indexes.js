import "dotenv/config";
import sequelize from "../config/database.js";

const TABLE_NAME = "users";
const COLUMN_NAME = "email";

const quoteIdentifier = (identifier) => {
  return `\`${identifier.replace(/`/g, "``")}\``;
};

const fixUserEmailIndexes = async () => {
  try {
    await sequelize.authenticate();

    console.log("Database connection successful.");
    console.log("Checking users.email indexes...");

    const [indexes] = await sequelize.query(
      `SHOW INDEX FROM ${quoteIdentifier(TABLE_NAME)}`
    );

    const emailIndexes = indexes.filter(
      (index) => index.Column_name === COLUMN_NAME
    );

    console.table(
      emailIndexes.map((index) => ({
        Key_name: index.Key_name,
        Non_unique: index.Non_unique,
        Column_name: index.Column_name,
        Seq_in_index: index.Seq_in_index,
      }))
    );

    /*
     * Find single-column indexes specifically on users.email.
     *
     * We do not blindly remove composite indexes because they may
     * be legitimate indexes used by the application.
     */
    const [allIndexes] = await sequelize.query(
      `SHOW INDEX FROM ${quoteIdentifier(TABLE_NAME)}`
    );

    const indexNames = [
      ...new Set(allIndexes.map((index) => index.Key_name)),
    ];

    const singleColumnEmailIndexes = [];

    for (const indexName of indexNames) {
      const columnsForIndex = allIndexes
        .filter((index) => index.Key_name === indexName)
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index);

      if (
        columnsForIndex.length === 1 &&
        columnsForIndex[0].Column_name === COLUMN_NAME &&
        indexName !== "PRIMARY"
      ) {
        singleColumnEmailIndexes.push(columnsForIndex[0]);
      }
    }

    console.log(
      `Found ${singleColumnEmailIndexes.length} single-column email indexes.`
    );

    /*
     * Keep ONE unique email index.
     * Remove redundant email indexes.
     */
    const uniqueEmailIndexes = singleColumnEmailIndexes.filter(
      (index) => Number(index.Non_unique) === 0
    );

    if (uniqueEmailIndexes.length > 1) {
      console.log(
        `Found ${uniqueEmailIndexes.length} unique indexes on users.email.`
      );

      // Keep the first one.
      const indexToKeep = uniqueEmailIndexes[0];

      console.log(`Keeping index: ${indexToKeep.Key_name}`);

      for (const index of uniqueEmailIndexes.slice(1)) {
        console.log(`Dropping duplicate index: ${index.Key_name}`);

        await sequelize.query(
          `ALTER TABLE ${quoteIdentifier(TABLE_NAME)}
           DROP INDEX ${quoteIdentifier(index.Key_name)}`
        );
      }
    }

    /*
     * Refresh indexes after removing duplicates.
     */
    const [updatedIndexes] = await sequelize.query(
      `SHOW INDEX FROM ${quoteIdentifier(TABLE_NAME)}`
    );

    const remainingEmailIndexes = updatedIndexes.filter(
      (index) =>
        index.Column_name === COLUMN_NAME &&
        Number(index.Non_unique) === 0
    );

    /*
     * If there is no unique email index, create one.
     */
    if (remainingEmailIndexes.length === 0) {
      console.log("No unique index found for users.email.");
      console.log("Creating users_email_unique...");

      await sequelize.query(
        `ALTER TABLE ${quoteIdentifier(TABLE_NAME)}
         ADD UNIQUE INDEX ${quoteIdentifier("users_email_unique")} (${quoteIdentifier(COLUMN_NAME)})`
      );

      console.log("Unique email index created successfully.");
    } else {
      console.log(
        `Unique email index already exists: ${remainingEmailIndexes[0].Key_name}`
      );
    }

    console.log("Checking total number of indexes...");

    const [finalIndexes] = await sequelize.query(
      `SHOW INDEX FROM ${quoteIdentifier(TABLE_NAME)}`
    );

    const finalIndexNames = [
      ...new Set(finalIndexes.map((index) => index.Key_name)),
    ];

    console.log(
      `users table currently has ${finalIndexNames.length} indexes.`
    );

    console.log("User email index repair completed successfully.");
  } catch (error) {
    console.error("Failed to repair users.email indexes:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

fixUserEmailIndexes();