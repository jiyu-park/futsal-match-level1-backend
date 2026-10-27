import 'dotenv/config';
import { Global, Module } from '@nestjs/common';
import pg from 'pg';

export const PG_POOL = 'PG_POOL';

// DATE 칸을 "2026-11-01" 같은 글자 그대로 받는다 (시간대 때문에 하루가 밀리는 것을 막음)
pg.types.setTypeParser(1082, (value: string) => value);

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          // Render 외부 주소는 SSL이 필요하다
          ssl: { rejectUnauthorized: false },
          max: 5,
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DbModule {}
