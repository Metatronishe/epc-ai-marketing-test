import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
}

@Entity('posts')
@Index(['title', 'scheduled_at_utc'], { unique: true })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  html: string;

  @Column({
    type: 'varchar',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'datetime', nullable: true })
  scheduled_at_utc: Date | null;

  @Column({ type: 'datetime', nullable: true })
  published_at_utc: Date | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  idempotency_key: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
