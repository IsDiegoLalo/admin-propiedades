import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('property_id').notNullable().index();
    table.string('guest_name', 255).notNullable();
    table.specificType('score', 'SMALLINT').notNullable();
    table.text('comment').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE reviews
      ADD CONSTRAINT chk_score_range CHECK (score >= 1 AND score <= 5)
  `);

  await knex.raw(`
    CREATE INDEX idx_reviews_property_created ON reviews (property_id, created_at DESC)
  `);

  await knex.schema.createTable('property_ratings', (table) => {
    table.uuid('property_id').primary();
    table.decimal('star_rating', 3, 1).nullable();
    table.integer('review_count').notNullable().defaultTo(0);
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('property_ratings');
  await knex.schema.dropTableIfExists('reviews');
}
