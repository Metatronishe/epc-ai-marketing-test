import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum Stage1Status {
  PENDING = 'pending',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('stage1_posts')
export class Stage1Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ref_post_id: string;

  @Column()
  channel: string; // "web", "email", "both"

  @Column({
    type: 'varchar',
    enum: Stage1Status,
    default: Stage1Status.PENDING,
  })
  status: Stage1Status;

  @Column('simple-json')
  payload: any;

  @CreateDateColumn()
  published_at: Date;
}
