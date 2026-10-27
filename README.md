# 서울 풋살 모임 - 백엔드 (NestJS + PostgreSQL)

## 실행 방법 (내 컴퓨터)
```bash
npm install
cp .env.example .env   # 그리고 .env에 DB 주소와 관리자 비밀번호를 채운다
npm run start
```
서버 주소: http://localhost:3001 · 상태 확인: http://localhost:3001/health

처음 켜면 테이블(`stadiums`, `posts`)이 만들어지고, 비어 있으면 경기장 13곳과 가상 모집글 10개가 들어갑니다.

## 환경 값 (`.env`, GitHub에 올라가지 않음)
| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | Render PostgreSQL의 External Database URL |
| `ADMIN_PASSWORD` | 경기장 등록·수정·삭제용 관리자 비밀번호 |
| `FRONTEND_URL` | 접속을 허용할 프론트엔드 주소 (쉼표로 여러 개) |
| `PORT` | 서버 포트 (기본 3001) |

## API
| API | 역할 |
|---|---|
| `GET /health` | 서버와 DB 연결 상태 |
| `GET /stadiums` | 경기장 목록 (모집글 개수 포함) |
| `POST /stadiums` | 경기장 등록 (헤더 `x-admin-password` 필요) |
| `PATCH /stadiums/:id` | 경기장 수정 (관리자 비밀번호) |
| `DELETE /stadiums/:id` | 경기장 삭제 (관리자 비밀번호, 모집글이 있으면 거절) |
| `GET /posts` | 모집글 목록 (날짜 가까운 순) |
| `GET /posts/:id` | 모집글 상세 |
| `POST /posts` | 모집글 등록 (4자리 비밀번호 포함) |
| `PATCH /posts/:id` | 모집글 수정 (본문 `password` 필요) |
| `DELETE /posts/:id` | 모집글 삭제 (본문 `password` 필요) |
| `POST /posts/:id/check-password` | 글 비밀번호가 맞는지만 확인 |

규칙(필수 칸, 오늘 이후 날짜, 인원 1 이상, 참가비 0 이상, 선택지, 존재하는 경기장, 비밀번호)은 모두 백엔드가 검사하고 칸별 쉬운 한국어 오류(`errors`)를 돌려줍니다.

## 경기장 데이터 출처
이름과 주소를 아래 공식·예약 안내 페이지에서 확인했습니다. 시설 상황은 바뀔 수 있으니 경기장 화면에서 수정할 수 있습니다.
- 서울시설공단: 서울월드컵경기장, 고척스카이돔 (sisul.or.kr)
- 서울시 우리동네 체육시설: 잠실종합운동장 풋살경기장 (sports.seoul.go.kr)
- 노원구시설관리공단: 불암산·초안산스포츠타운 (reservation.nowonsc.kr)
- 성동구도시관리공단: 응봉풋살장 (sports.happysd.or.kr) — 지번 주소
- 플랩풋볼 구장 정보 페이지: KBS 스포츠월드, 화곡 스트리트 풋살파크, 신정FC 풋살장, 영등포 더에프필드, 송파 천마 풋살파크, 잠실 랩스풋볼, 서경대 풋살파크

모집글·작성자·연락처는 모두 가상입니다. 가상 글의 비밀번호는 `1234`입니다.

## ⏳ 무료 서버 안내
이 백엔드는 Render **무료 서버**에 올라가 있어서, 한동안 접속이 없으면 잠들어 있다가 **첫 접속이 30초~1분 정도 느릴 수 있습니다.** 화면이 비어 있거나 오류가 보이면 잠시 기다렸다가 새로고침해 주세요. 먼저 `/health` 주소를 열어 깨워 두면 편합니다.

## Render에 올리기
1. Render에서 **New → Web Service**로 이 저장소를 연결합니다. (DB는 이미 만든 PostgreSQL을 그대로 씁니다.)
2. 아래처럼 입력합니다.

| 항목 | 값 |
|---|---|
| Language | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |
| Instance Type | Free |

3. **Environment**에 아래 값을 넣습니다. (값은 저장소에 올라가 있지 않습니다.)

| 이름 | 뜻 | 예시 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 주소. Render DB 화면의 Internal(같은 Render 안) 또는 External 주소 | `postgresql://사용자:비밀번호@호스트/DB이름` |
| `ADMIN_PASSWORD` | 경기장 등록·수정·삭제용 관리자 비밀번호 | 직접 정한 긴 문자열 |
| `FRONTEND_URL` | 접속을 허용할 프론트엔드(Vercel) 주소. 끝에 `/`를 붙이지 않습니다. | `https://내프로젝트.vercel.app` |
| `NODE_VERSION` | Node 버전 | `22` |

`PORT`는 Render가 알아서 넣어 주므로 직접 넣지 않습니다.

4. 배포가 끝나면 `https://내서비스.onrender.com/health`를 열어 `"database":"연결됨"`이 보이는지 확인합니다.

## 관련 저장소
- 프론트엔드: futsal-match-level1-frontend
- 기획서: [기획서.md](기획서.md)
