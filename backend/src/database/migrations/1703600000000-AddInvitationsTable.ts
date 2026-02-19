import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationsTable1703600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL UNIQUE,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'EMPLOYEE',
        "employee_number" varchar(50),
        "token" varchar(255),
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "expires_at" TIMESTAMP,
        "invited_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
  }
}
