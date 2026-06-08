import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProviderColumnsToUser1780899885138 implements MigrationInterface {
    name = 'AddProviderColumnsToUser1780899885138'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_provider_enum" AS ENUM('local', 'google', 'kakao')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "provider" "public"."users_provider_enum" NOT NULL DEFAULT 'local'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "providerId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "providerAccessToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "providerRefreshToken" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "providerRefreshToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "providerAccessToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "providerId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider"`);
        await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
    }

}
