import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from './db.module.js';
import { addDays, todayInSeoul } from '../common/validation.js';
import { buildMapUrl } from '../stadiums/stadiums.service.js';
import { STADIUM_SEED, POST_SEED } from './seed-data.js';

// 서버를 켤 때 테이블을 만들고, 비어 있으면 처음 보여 줄 데이터를 채운다
@Injectable()
export class SetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SetupService.name);

  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationBootstrap() {
    await this.createTables();
    await this.seedStadiums();
    await this.seedPosts();
  }

  private async createTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS stadiums (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        district    VARCHAR(30)  NOT NULL,
        address     VARCHAR(200) NOT NULL,
        map_url     TEXT         NOT NULL,
        floor_type  VARCHAR(30),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        UNIQUE (name, address)
      );
      CREATE TABLE IF NOT EXISTS posts (
        id             SERIAL PRIMARY KEY,
        stadium_id     INTEGER      NOT NULL REFERENCES stadiums(id) ON DELETE RESTRICT,
        sport          VARCHAR(20)  NOT NULL,
        title          VARCHAR(100) NOT NULL,
        play_date      DATE         NOT NULL,
        play_time      TIME         NOT NULL,
        capacity       INTEGER      NOT NULL CHECK (capacity >= 1),
        author_name    VARCHAR(30)  NOT NULL,
        contact        VARCHAR(200) NOT NULL,
        skill_level    VARCHAR(20)  NOT NULL,
        fee            INTEGER      NOT NULL CHECK (fee >= 0),
        description    TEXT,
        password_hash  VARCHAR(100) NOT NULL,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
    `);
  }

  private async seedStadiums() {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM stadiums');
    if (rows[0].count > 0) return;
    for (const s of STADIUM_SEED) {
      await this.pool.query(
        'INSERT INTO stadiums (name, district, address, map_url) VALUES ($1,$2,$3,$4)',
        [s.name, s.district, s.address, buildMapUrl(s.address)],
      );
    }
    this.logger.log(`경기장 ${STADIUM_SEED.length}곳을 넣었어요.`);
  }

  private async seedPosts() {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM posts');
    if (rows[0].count > 0) return;
    const hash = await bcrypt.hash('1234', 10); // 가상 글의 비밀번호는 모두 1234
    const today = todayInSeoul();
    for (const p of POST_SEED) {
      const stadium = await this.pool.query('SELECT id FROM stadiums WHERE name = $1', [p.stadium]);
      if (!stadium.rowCount) continue;
      await this.pool.query(
        `INSERT INTO posts (stadium_id, sport, title, play_date, play_time, capacity,
                            author_name, contact, skill_level, fee, description, password_hash)
         VALUES ($1,'풋살',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [stadium.rows[0].id, p.title, addDays(today, p.daysFromNow), p.time, p.capacity,
         p.author, p.contact, p.level, p.fee, p.description, hash],
      );
    }
    this.logger.log(`가상 모집글 ${POST_SEED.length}개를 넣었어요.`);
  }
}
