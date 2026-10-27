import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import {
  FieldErrors,
  isRealDate,
  text,
  throwIfErrors,
  todayInSeoul,
  toWholeNumber,
} from '../common/validation.js';

export const SPORTS = ['풋살'];
export const SKILL_LEVELS = ['입문', '중급', '상급', '상관없음'];

const SELECT_POST = `
  SELECT p.id, p.stadium_id, p.sport, p.title, p.play_date,
         to_char(p.play_time, 'HH24:MI') AS play_time,
         p.capacity, p.author_name, p.contact, p.skill_level, p.fee,
         p.description, p.created_at,
         s.name AS stadium_name, s.district AS stadium_district,
         s.address AS stadium_address, s.map_url AS stadium_map_url
    FROM posts p JOIN stadiums s ON s.id = p.stadium_id`;

@Injectable()
export class PostsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async list() {
    const { rows } = await this.pool.query(
      `${SELECT_POST} ORDER BY p.play_date, p.play_time, p.id`,
    );
    return rows;
  }

  async get(id: number) {
    const { rows } = await this.pool.query(`${SELECT_POST} WHERE p.id = $1`, [id]);
    if (!rows.length) throw new NotFoundException('찾을 수 없는 글입니다.');
    return rows[0];
  }

  // 등록과 수정에서 같은 규칙을 쓴다
  private async validate(body: any) {
    const errors: FieldErrors = {};

    const stadiumId = toWholeNumber(body?.stadium_id);
    if (stadiumId === null) {
      errors.stadium_id = '경기장을 골라 주세요.';
    } else {
      const found = await this.pool.query('SELECT 1 FROM stadiums WHERE id = $1', [stadiumId]);
      if (!found.rowCount) errors.stadium_id = '없는 경기장이에요. 목록에서 다시 골라 주세요.';
    }

    const sport = text(body?.sport);
    if (!sport) errors.sport = '종목을 골라 주세요.';
    else if (!SPORTS.includes(sport)) errors.sport = `종목은 ${SPORTS.join(', ')} 중에서 골라 주세요.`;

    const title = text(body?.title);
    if (!title) errors.title = '제목을 적어 주세요.';
    else if (title.length > 100) errors.title = '제목은 100자 이내로 적어 주세요.';

    const playDate = text(body?.play_date);
    if (!playDate) errors.play_date = '경기 날짜를 골라 주세요.';
    else if (!isRealDate(playDate)) errors.play_date = '날짜 형식이 맞지 않아요. 달력에서 골라 주세요.';
    else if (playDate < todayInSeoul()) errors.play_date = '경기 날짜는 오늘 이후로 골라 주세요.';

    const playTime = text(body?.play_time);
    if (!playTime) errors.play_time = '시작 시간을 골라 주세요.';
    else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(playTime)) errors.play_time = '시간 형식이 맞지 않아요. (예: 19:30)';

    const capacity = toWholeNumber(body?.capacity);
    if (text(String(body?.capacity ?? '')) === '') errors.capacity = '모집 인원을 적어 주세요.';
    else if (capacity === null) errors.capacity = '모집 인원은 숫자로 적어 주세요.';
    else if (capacity < 1) errors.capacity = '모집 인원은 1명 이상으로 적어 주세요.';
    else if (capacity > 100000) errors.capacity = '모집 인원이 너무 많아요. 다시 확인해 주세요.';

    const authorName = text(body?.author_name);
    if (!authorName) errors.author_name = '작성자 이름을 적어 주세요.';
    else if (authorName.length > 30) errors.author_name = '작성자 이름은 30자 이내로 적어 주세요.';

    const contact = text(body?.contact);
    if (!contact) errors.contact = '연락 방법을 적어 주세요. (예: 오픈채팅 링크)';
    else if (contact.length > 200) errors.contact = '연락 방법은 200자 이내로 적어 주세요.';

    const skillLevel = text(body?.skill_level);
    if (!skillLevel) errors.skill_level = '실력 수준을 골라 주세요.';
    else if (!SKILL_LEVELS.includes(skillLevel)) errors.skill_level = `실력 수준은 ${SKILL_LEVELS.join(', ')} 중에서 골라 주세요.`;

    const fee = toWholeNumber(body?.fee);
    if (text(String(body?.fee ?? '')) === '') errors.fee = '참가비를 적어 주세요. 무료면 0을 적어 주세요.';
    else if (fee === null) errors.fee = '참가비는 숫자로 적어 주세요. 무료면 0을 적어 주세요.';
    else if (fee > 10000000) errors.fee = '참가비가 너무 커요. 다시 확인해 주세요.';

    const description = text(body?.description);
    if (description.length > 2000) errors.description = '설명은 2000자 이내로 적어 주세요.';

    return { errors, values: { stadiumId, sport, title, playDate, playTime, capacity, authorName, contact, skillLevel, fee, description } };
  }

  private checkPassword(body: any, errors: FieldErrors, required: boolean) {
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) errors.password = '비밀번호를 적어 주세요. (숫자 4자리)';
    else if (!/^\d{4}$/.test(password)) errors.password = '비밀번호는 숫자 4자리로 적어 주세요.';
    return password;
  }

  async create(body: any) {
    const { errors, values: v } = await this.validate(body);
    const password = this.checkPassword(body, errors, true);
    throwIfErrors(errors);
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await this.pool.query(
      `INSERT INTO posts (stadium_id, sport, title, play_date, play_time, capacity,
                          author_name, contact, skill_level, fee, description, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [v.stadiumId, v.sport, v.title, v.playDate, v.playTime, v.capacity,
       v.authorName, v.contact, v.skillLevel, v.fee, v.description || null, hash],
    );
    return this.get(rows[0].id);
  }

  async update(id: number, body: any) {
    await this.verifyPassword(id, body);
    const { errors, values: v } = await this.validate(body);
    throwIfErrors(errors);
    await this.pool.query(
      `UPDATE posts SET stadium_id=$1, sport=$2, title=$3, play_date=$4, play_time=$5,
              capacity=$6, author_name=$7, contact=$8, skill_level=$9, fee=$10, description=$11
        WHERE id=$12`,
      [v.stadiumId, v.sport, v.title, v.playDate, v.playTime, v.capacity,
       v.authorName, v.contact, v.skillLevel, v.fee, v.description || null, id],
    );
    return this.get(id);
  }

  async remove(id: number, body: any) {
    await this.verifyPassword(id, body);
    await this.pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return { deleted: true };
  }

  // 수정·삭제 전에 글을 쓸 때 정한 비밀번호가 맞는지 확인한다
  async verifyPassword(id: number, body: any) {
    const { rows } = await this.pool.query('SELECT password_hash FROM posts WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('찾을 수 없는 글입니다.');
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) throwIfErrors({ password: '비밀번호를 적어 주세요. (숫자 4자리)' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) throw new ForbiddenException('비밀번호가 맞지 않습니다.');
  }
}
