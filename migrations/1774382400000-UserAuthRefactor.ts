import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAuthRefactor1774382400000 implements MigrationInterface {
  name = 'UserAuthRefactor1774382400000';

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
