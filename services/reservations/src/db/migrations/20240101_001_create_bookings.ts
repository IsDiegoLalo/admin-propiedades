import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw(`CREATE TYPE booking_type   AS ENUM ('refundable', 'non_refundable')`);
  await knex.raw(`CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled')`);
  await knex.raw(`CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'refunded', 'partial_refund')`);

  await knex.schema.createTable('bookings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('property_id').notNullable();
    table.string('guest_name', 255).notNullable();
    table.date('check_in').notNullable();
    table.date('check_out').notNullable();
    table.decimal('total_amount_usd', 12, 2).notNullable();
    table.specificType('booking_type', 'booking_type').notNullable();
    table.decimal('cancellation_penalty_pct', 5, 2).notNullable().defaultTo(0);
    table.specificType('booking_status', 'booking_status').notNullable().defaultTo('confirmed');
    table.specificType('payment_status', 'payment_status').notNullable().defaultTo('paid');
    table.timestamp('cancelled_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE bookings
      ADD CONSTRAINT chk_checkout_after_checkin CHECK (check_out > check_in),
      ADD CONSTRAINT chk_amount_positive CHECK (total_amount_usd > 0)
  `);

  await knex.raw(`
    CREATE INDEX idx_bookings_property_dates
      ON bookings (property_id, check_in, check_out)
      WHERE booking_status = 'confirmed'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bookings');
  await knex.raw('DROP TYPE IF EXISTS payment_status');
  await knex.raw('DROP TYPE IF EXISTS booking_status');
  await knex.raw('DROP TYPE IF EXISTS booking_type');
}
