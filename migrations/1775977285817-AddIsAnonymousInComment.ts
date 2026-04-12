import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAnonymousInComment1775977285817 implements MigrationInterface {
    name = 'AddIsAnonymousInComment1775977285817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" ADD "is_anonymous" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "is_anonymous"`);
    }

}
