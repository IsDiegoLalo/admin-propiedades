import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Habilitar extensión para gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('properties', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('type', 20).notNullable();
    table.text('address').notNullable();
    table.decimal('price_per_day_usd', 12, 2).notNullable();
    table.string('currency', 10).notNullable().defaultTo('USD');
    table.integer('max_guests').notNullable();
    table.decimal('cancellation_penalty_pct', 5, 2).notNullable().defaultTo(0);
    table.specificType('services', 'TEXT[]').notNullable().defaultTo('{}');
    table.boolean('deleted').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // CHECK constraints
  await knex.raw(`
    ALTER TABLE properties
      ADD CONSTRAINT chk_property_type CHECK (type IN ('house', 'apartment')),
      ADD CONSTRAINT chk_price_positive CHECK (price_per_day_usd > 0),
      ADD CONSTRAINT chk_max_guests_positive CHECK (max_guests > 0),
      ADD CONSTRAINT chk_penalty_range CHECK (cancellation_penalty_pct >= 0 AND cancellation_penalty_pct <= 100)
  `);

  await knex.schema.createTable('property_currency_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    table.string('currency', 10).notNullable();
    table.decimal('rate', 18, 6).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['property_id', 'currency']);
  });

  await knex.raw(`
    ALTER TABLE property_currency_rates
      ADD CONSTRAINT chk_rate_positive CHECK (rate > 0)
  `);

  await knex.schema.createTable('rooms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('type', 100).notNullable();
    table.integer('beds').notNullable();
    table.text('description').notNullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE rooms
      ADD CONSTRAINT chk_beds_positive CHECK (beds > 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rooms');
  await knex.schema.dropTableIfExists('property_currency_rates');
  await knex.schema.dropTableIfExists('properties');
}
