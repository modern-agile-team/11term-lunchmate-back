import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileImageUrlInUser1784088691889 implements MigrationInterface {
  name = 'AddProfileImageUrlInUser1784088691889';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "profile_image_url" character varying(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_image_url"`);
  }
}
