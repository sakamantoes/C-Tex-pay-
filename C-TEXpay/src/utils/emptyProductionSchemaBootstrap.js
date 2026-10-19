const EXPECTED_DATABASE_NAME = "u474959577_ctext_pay";

export function assertEmptySchemaBootstrapTarget({
  confirmation,
  configuredDatabase,
  connectedDatabase,
}) {
  if (confirmation !== "true") {
    throw new Error(
      "Set ALLOW_EMPTY_PRODUCTION_SCHEMA_BOOTSTRAP=true to confirm this one-time operation",
    );
  }
  if (
    configuredDatabase !== EXPECTED_DATABASE_NAME ||
    connectedDatabase !== EXPECTED_DATABASE_NAME
  ) {
    throw new Error(
      `Bootstrap is restricted to database ${EXPECTED_DATABASE_NAME}`,
    );
  }
}

export function getTableName(table) {
  return typeof table === "string" ? table : table?.tableName;
}

export async function assertDatabaseHasNoTables(queryInterface) {
  const tables = (await queryInterface.showAllTables()).map(getTableName);
  if (tables.length > 0) {
    throw new Error(
      `Refusing bootstrap: database is not empty (${tables.length} existing table(s))`,
    );
  }
}

function physicalField(model, field) {
  if (typeof field === "string") {
    return model.rawAttributes[field]?.field || field;
  }
  const attribute = field?.attribute || field?.name || field?.field;
  return model.rawAttributes[attribute]?.field || attribute;
}

function sameFields(actual, expected) {
  const normalize = (fields) => fields.map((field) => String(field).toLowerCase()).sort();
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}

function referenceTableName(reference) {
  const table = reference?.model;
  if (typeof table === "string") return table;
  if (typeof table?.getTableName === "function") {
    return getTableName(table.getTableName());
  }
  return getTableName(table);
}

export async function verifyRegisteredModelSchema(queryInterface, models) {
  const tables = new Set(
    (await queryInterface.showAllTables()).map((table) =>
      String(getTableName(table)).toLowerCase(),
    ),
  );
  const issues = [];

  for (const model of models) {
    const tableName = getTableName(model.getTableName());
    if (!tables.has(String(tableName).toLowerCase())) {
      issues.push(`missing table ${tableName}`);
      continue;
    }

    const columns = await queryInterface.describeTable(tableName);
    const columnNames = new Set(Object.keys(columns).map((name) => name.toLowerCase()));
    for (const [attributeName, attribute] of Object.entries(model.rawAttributes)) {
      const field = String(attribute.field || attributeName);
      if (!columnNames.has(field.toLowerCase())) {
        issues.push(`missing column ${tableName}.${field}`);
      }
    }

    const actualIndexes = await queryInterface.showIndex(tableName);
    for (const index of model.options.indexes || []) {
      const expectedFields = (index.fields || []).map((field) => physicalField(model, field));
      const exists = actualIndexes.some((actual) => {
        const actualFields = (actual.fields || []).map(
          (field) => field.attribute || field.name || field,
        );
        const actualUnique = Boolean(actual.unique || actual.primary);
        return (
          sameFields(actualFields, expectedFields) &&
          actualUnique === Boolean(index.unique)
        );
      });
      if (!exists) {
        issues.push(`missing index on ${tableName} (${expectedFields.join(", ")})`);
      }
    }

    if (typeof queryInterface.getForeignKeyReferencesForTable !== "function") {
      throw new Error("Database adapter cannot verify foreign key constraints");
    }
    const actualForeignKeys = await queryInterface.getForeignKeyReferencesForTable(tableName);
    for (const [attributeName, attribute] of Object.entries(model.rawAttributes)) {
      if (!attribute.references) continue;
      const field = attribute.field || attributeName;
      const targetTable = referenceTableName(attribute.references);
      const targetColumn = attribute.references.key || "id";
      const exists = actualForeignKeys.some((foreignKey) =>
        String(foreignKey.columnName).toLowerCase() === String(field).toLowerCase() &&
        String(foreignKey.referencedTableName).toLowerCase() === String(targetTable).toLowerCase() &&
        String(foreignKey.referencedColumnName).toLowerCase() === String(targetColumn).toLowerCase(),
      );
      if (!exists) {
        issues.push(`missing foreign key ${tableName}.${field} -> ${targetTable}.${targetColumn}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(`Schema verification failed: ${issues.join("; ")}`);
  }
  return { modelCount: models.length, tableCount: tables.size };
}

export { EXPECTED_DATABASE_NAME };
