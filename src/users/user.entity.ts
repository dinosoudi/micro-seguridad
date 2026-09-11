// src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: 0 })
  tokenVersion: number;

  // preparado para roles a futuro, sin romper nada hoy
  @Column('simple-array', { nullable: true })
  roles: string[] | null;

  @CreateDateColumn()
  createdAt: Date;
}