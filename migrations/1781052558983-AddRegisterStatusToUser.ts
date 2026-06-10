import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRegisterStatusToUser1781052558983 implements MigrationInterface {
    name = 'AddRegisterStatusToUser1781052558983'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_registerstatus_enum" AS ENUM('SOCIAL_PENDING', 'COMPLETE')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "registerStatus" "public"."users_registerstatus_enum" NOT NULL DEFAULT 'COMPLETE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "registerStatus"`);
        await queryRunner.query(`DROP TYPE "public"."users_registerstatus_enum"`);
    }

}
