import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1774243945201 implements MigrationInterface {
    name = 'InitSchema1774243945201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "capacity" TO "max_capacity"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "description" TO "introduce"`);
        await queryRunner.query(`ALTER TYPE "public"."rooms_status_enum" RENAME TO "rooms_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."rooms_status_enum" AS ENUM('OPEN', 'CLOSE')`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "status" TYPE "public"."rooms_status_enum" USING "status"::"text"::"public"."rooms_status_enum"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "status" SET DEFAULT 'OPEN'`);
        await queryRunner.query(`DROP TYPE "public"."rooms_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."rooms_status_enum_old" AS ENUM('OPEN', 'FULL', 'CLOSE')`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "status" TYPE "public"."rooms_status_enum_old" USING "status"::"text"::"public"."rooms_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "status" SET DEFAULT 'OPEN'`);
        await queryRunner.query(`DROP TYPE "public"."rooms_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."rooms_status_enum_old" RENAME TO "rooms_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "introduce" TO "description"`);
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "max_capacity" TO "capacity"`);
    }

}
