import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export class BaseTableEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Exclude()
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  deletedAt: Date;
}
