import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPostCategories1775619600000 implements MigrationInterface {
  name = 'SeedPostCategories1775619600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "post_categories" ("name")
      VALUES
        ('맛집'),
        ('후기'),
        ('토론'),
        ('모집'),
        ('정보'),
        ('잡담')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "post_categories"
      WHERE "name" IN ('맛집', '후기', '토론', '모집', '정보', '잡담')
    `);
  }
}
