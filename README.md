# WePlay

조직문화 플랫폼. 그룹·팀 단위로 칭찬, 게임, 공지 같은 활동을 합니다.

## 구성

| 앱 | 포트 | 용도 |
| --- | --- | --- |
| `apps/server` | 4000 | NestJS API (`/api/v1`) |
| `apps/user-web` | 3000 | 구성원·관리자 화면 |
| `apps/system-web` | 3001 | MASTER 콘솔 |
| `apps/official-web` | 3002 | 공개 홍보 사이트 |
| `packages/db` | - | Prisma 스키마·마이그레이션 (PostgreSQL) |
| `packages/shared` | - | 공통 타입·규칙·게임 정의 |

## 준비

- Node.js 22 이상, pnpm, Docker
- DB 컨테이너: `scripts/db-start.sh` (컨테이너 `weplay-db`, 사용자 `kkh`, DB `weplay`, 포트 5432)

## 실행

```bash
pnpm install
cp .env.example .env            # 값 채우기
bash scripts/db-start.sh        # DB 기동
pnpm dev                        # 마이그레이션 후 전체 앱 실행
```

## 환경 변수 (주요)

| 키 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `JWT_SECRET`, `JWT_TTL` | 토큰 서명·만료 |
| `CORS_ORIGINS` | 허용 출처(쉼표 구분). 3000·3001·3002 포함 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google 로그인 |
| `AUTH_DEV_LOGIN` | 개발용 로그인. **운영에서는 false** |
| `SEED_MASTER_USERNAME`, `SEED_MASTER_PASSWORD` | 초기 MASTER 계정 |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | 사진·영상 저장 폴더와 최대 크기 |
| `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` | 회식 장소 검색 |
| `ANTHROPIC_API_KEY`, `AI_TEXT_MODEL` | AI 텍스트 판정·퀴즈. 없으면 기본 문제 사용 |
| `IMAGE_API_URL`, `IMAGE_API_KEY`, `IMAGE_MODEL` | AI 이미지 생성·판정(OpenAI 호환). 없으면 비활성 |
| `NEXT_PUBLIC_API_URL` | 웹 앱이 호출할 API 주소 |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 지도 |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AD_SLOT_ENABLED` | official-web 링크와 광고 슬롯 표시 |

## 데이터

- 백업: `bash scripts/db-backup.sh` → `scripts/db/<이름>.sql` (업로드 파일이 있으면 `.uploads.tar.gz`도 함께)
- 복원: `bash scripts/db-restore.sh <백업 이름>` (확장자 생략 가능, 인자가 없으면 가장 최근 백업)
- 그룹·계정 삭제: `scripts/group-team/delete.sh`, `scripts/account/delete.sh` (관련 테이블을 순서대로 지웁니다)
- 샘플 데이터: `scripts/feature/generate.sh`, 기능별 `scripts/feature/<기능>/generate-contents.sh`

## 테스트

```bash
pnpm test          # 전체 (단위 + API 스모크)
pnpm test:unit     # 공통 규칙 단위 테스트
pnpm test:api      # API 스모크 (서버 실행 필요)
pnpm test:db       # DB 백업·복원 포함
node scripts/test-rules.mjs   # 그룹·팀 권한 규칙
```

## 빌드·점검

```bash
pnpm typecheck
pnpm build
```

## 참고 문서

- [기능 목록](docs/FEATURE.md)
- [할 일](docs/TODO.md)
- [권한 규칙](docs/ROLES.md)
- [게임 설계](docs/GAME.md)
