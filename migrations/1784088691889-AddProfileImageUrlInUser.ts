import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileImageUrlInUser1784088691889 implements MigrationInterface {
    name = 'AddProfileImageUrlInUser1784088691889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "registerStatus" TO "profile_image_url"`);
        await queryRunner.query(`ALTER TYPE "public"."users_registerstatus_enum" RENAME TO "users_profile_image_url_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_image_url"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "profile_image_url" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_image_url"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "profile_image_url" "public"."users_profile_image_url_enum" NOT NULL DEFAULT 'COMPLETE'`);
        await queryRunner.query(`ALTER TYPE "public"."users_profile_image_url_enum" RENAME TO "users_registerstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "profile_image_url" TO "registerStatus"`);
    }

}
