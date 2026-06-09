import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProviderColumnsToUser1780968420368 implements MigrationInterface {
    name = 'AddProviderColumnsToUser1780968420368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "hashed_password" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mbti"`);
        await queryRunner.query(`CREATE TYPE "public"."users_mbti_enum" AS ENUM('INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "mbti" "public"."users_mbti_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mbti"`);
        await queryRunner.query(`DROP TYPE "public"."users_mbti_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "mbti" character varying(4)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "hashed_password" SET NOT NULL`);
    }

}
