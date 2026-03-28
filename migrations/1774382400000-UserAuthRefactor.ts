import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAuthRefactor1774382400000 implements MigrationInterface {
  name = 'UserAuthRefactor1774382400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "name" character varying(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "name" = "nickname" WHERE "name" = ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "introduce" TO "bio"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_image_url" character varying(500)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "birth_date"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "school"`);
    await queryRunner.query(`DROP TYPE "public"."users_gender_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_gender_enum" AS ENUM('MALE', 'FEMALE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "school" character varying(100) NOT NULL DEFAULT 'UNKNOWN'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "gender" "public"."users_gender_enum" NOT NULL DEFAULT 'MALE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "birth_date" date NOT NULL DEFAULT '2000-01-01'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_image_url"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "bio" TO "introduce"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
  }
}
