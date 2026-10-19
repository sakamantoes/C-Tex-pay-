/**
 * The create-business flow persists a required business profile as part of
 * merchant creation. Legacy merchants left at NOT_STARTED are therefore
 * either complete (profile exists) or already in progress (profile missing).
 * This migration repairs only NOT_STARTED rows and is intentionally
 * non-reversible so it cannot downgrade onboarding states advanced later.
 */
export async function up(queryInterface) {
  await queryInterface.sequelize.query(`
    UPDATE merchants AS m
    LEFT JOIN business_profiles AS bp ON bp.merchantId = m.id
    SET m.onboardingStatus = CASE
      WHEN bp.id IS NULL THEN 'IN_PROGRESS'
      ELSE 'COMPLETED'
    END
    WHERE m.onboardingStatus = 'NOT_STARTED'
  `);
}

export async function down() {
  // Deliberately a no-op: reversing this update could regress records whose
  // onboarding was legitimately completed after the migration ran.
}
