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
| `STORAGE_DRIVER` | 기본 `gcs`. 개발·테스트에서만 `local`로 명시해 로컬 저장 |
| `GCS_BUCKET` | 비공개 업로드 버킷. 기본 `weplay-bucket-op` |
| `GOOGLE_APPLICATION_CREDENTIALS` | 서버 전용 ADC 서비스 계정 JSON의 절대 경로. 런타임 서비스 계정 사용 시 불필요 |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | 레거시 로컬 파일 폴더(서버 작업 디렉터리 기준 `./uploads`)와 업로드 최대 크기(기본 30MB) |
| `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` | 회식 장소 검색 |
| `ANTHROPIC_API_KEY`, `AI_TEXT_MODEL` | AI 텍스트 판정·퀴즈. 없으면 기본 문제 사용 |
| `IMAGE_API_URL`, `IMAGE_API_KEY`, `IMAGE_MODEL` | AI 이미지 생성·판정(OpenAI 호환). 없으면 비활성 |
| `MAIL_DRIVER` | `gmail` 또는 `noop`(기본값, 발송 없이 로그만 남김) |
| `MAIL_USER`, `MAIL_PASSWORD` | Gmail 계정과 앱 비밀번호 (2단계 인증 필요). 일반 로그인 비밀번호는 사용 불가 |
| `MAIL_FROM` | 발신 표시 주소. 보통 `MAIL_USER`와 같게 둠 (Gmail은 다른 주소로 보내면 거부될 수 있음) |
| `APP_URL` | 재설정 링크의 웹 주소 (없으면 `NEXT_PUBLIC_APP_URL`, 그다음 `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | 웹 앱이 호출할 API 주소 |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 지도 |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AD_SLOT_ENABLED` | official-web 링크와 광고 슬롯 표시 |

## 데이터

- 백업: `bash scripts/db-backup.sh` → `scripts/db/latest.sql` (덮어쓰기, 업로드 파일이 있으면 `latest.uploads.tar.gz`도 함께)
- 복원: `bash scripts/db-restore.sh` (`scripts/db/latest.sql` 로 복원, 복원 전 현재 DB는 `pre-restore-<시각>.sql` 로 자동 백업)
- 그룹·계정 삭제: `scripts/group-team/delete.sh`, `scripts/account/delete.sh` (관련 테이블을 순서대로 지웁니다)
- 샘플 데이터: `scripts/feature/generate.sh`, 기능별 `scripts/feature/<기능>/generate-contents.sh`

## 업로드 저장소

모든 업로드는 서버를 거칩니다. 기본 저장소는 비공개 GCS 버킷 `weplay-bucket-op`이며,
공식 `@google-cloud/storage` SDK가 Application Default Credentials(ADC)를 사용합니다.
브라우저에는 자격 증명이나 GCS 업로드 URL을 전달하지 않습니다. 버킷 공개 설정이나 버킷 CORS는 필요하지 않습니다.
웹 출처는 기존 서버 `CORS_ORIGINS`에 등록합니다.

1. 서버 서비스 계정에 **해당 버킷 범위**의 `storage.objects.create`와 `storage.objects.get` 권한을 부여합니다.
	 커스텀 역할로 두 권한만 부여하거나 `roles/storage.objectCreator`와 `roles/storage.objectViewer`를 함께 사용할 수 있습니다.
	 SDK는 객체 메타데이터 조회와 읽기에 `storage.objects.get`을 사용하며 삭제·덮어쓰기·버킷 관리 권한은 필요하지 않습니다.
2. 버킷의 uniform bucket-level access와 public access prevention을 활성화하고 `allUsers`/`allAuthenticatedUsers` 권한을 부여하지 않습니다.
3. 운영에서는 실행 환경에 이 서비스 계정을 연결해 ADC를 사용합니다. 로컬에서는
	 `gcloud auth application-default login`을 실행하고 해당 개발자 계정에 위 버킷 권한을 부여하거나,
	 저장소 밖에 보관한 서비스 계정 키의 절대 경로를 서버의 `GOOGLE_APPLICATION_CREDENTIALS`로 지정합니다.
	 키 파일과 자격 증명은 git에 추가하거나 `NEXT_PUBLIC_*` 환경 변수로 노출하지 않습니다.
4. 서버를 `STORAGE_DRIVER=gcs`, `GCS_BUCKET=weplay-bucket-op`으로 실행합니다. 키 경로를 지정했다면 실제 서버 프로세스에서 읽을 수 있어야 합니다.

응답 URL은 기존과 같은 `/uploads/<32자리 hex>.<ext>`입니다. 서버의 공개 GET/HEAD 라우트가
JWT 없이 GCS 객체를 스트리밍하고 영상 byte-range 요청을 지원합니다. 버킷은 비공개지만 **URL을 아는 사용자는 파일을 읽을 수 있습니다**.
문서는 `Content-Disposition: attachment`, 모든 응답은 `X-Content-Type-Options: nosniff`로 제공합니다.

- 기존 `POST /api/v1/groups/:groupId/uploads`는 그룹 멤버 권한과 사진 미션의 `allowVideo` 설정을 유지합니다.
- 기존 `POST /api/v1/admin/uploads`는 MASTER의 이미지 업로드를 유지합니다.
- 새 `POST /api/v1/groups/:groupId/uploads/attachments`와 `POST /api/v1/admin/uploads/attachments`는 각각 그룹 멤버와 MASTER만 사용합니다.
	`multipart/form-data`의 `file` 필드를 받고 `{ url, name, size, mimeType, mediaType }`를 반환합니다.
	`mediaType`은 `IMAGE`, `VIDEO`, `FILE` 중 하나이며 첨부에는 사진 미션의 `allowVideo` 설정을 적용하지 않습니다.
- 허용 형식: JPG/JPEG, PNG, GIF, WEBP, MP4, WEBM, MOV, PDF, TXT, CSV, ZIP, DOC/DOCX, XLS/XLSX, PPT/PPTX, HWP/HWPX.
	확장자와 MIME을 함께 검사하며 SVG, 스크립트, 실행 파일 및 매크로 전용 Office 확장자는 허용하지 않습니다.
	HTML/HTM(`text/html`)은 MASTER 첨부 업로드에서만 추가로 허용하며, 일반 회원 업로드에서는 거절합니다.
	약관 문서는 PDF, TXT, HTML/HTM을 지원합니다. HTML도 다운로드 파일로 제공하며 CSP sandbox로 서비스 출처에서의 실행을 제한합니다.
	파일 검사와 악성코드 검역은 별도이며 ZIP/문서 내부 콘텐츠의 무해함을 보증하지 않습니다.
- GCS 쓰기 실패 시 503 오류를 반환하며 로컬 저장으로 조용히 전환하지 않습니다. 서버 로그에는 자격 증명 대신 저장 작업·드라이버·오류 코드를 남깁니다.
- GCS에서 객체가 404인 경우에만 `UPLOAD_DIR`의 기존 파일을 읽습니다. 인증·권한·네트워크 오류는 로컬 읽기로 숨기지 않습니다.
	레거시 파일은 자동 이관되지 않으므로 이관 전까지 해당 디렉터리를 유지해야 합니다. AI 사진 읽기와 생성 결과도 같은 저장소를 사용합니다.
- 오프라인 개발·테스트에서는 명시적으로 `STORAGE_DRIVER=local`을 설정합니다. 이때만 신규 파일을 로컬에 저장합니다.

기존 DB 백업·복원 스크립트의 업로드 tar 파일은 **로컬 파일만** 다룹니다. GCS 객체를 백업·복원하지 않으며,
SQL 복원만으로 파일이 복원되지 않습니다. 버킷의 soft delete/버전 관리/보존 정책 및 별도 객체 백업을 구성하고 DB와 함께 복구를 점검해야 합니다.

## 테스트

```bash
pnpm test          # 전체 (단위 + API 스모크)
pnpm test:unit     # 공통 규칙 단위 테스트
pnpm test:api      # API 스모크 (서버 실행 필요)
pnpm test:db       # DB 백업·복원 포함
node scripts/test-rules.mjs   # 그룹·팀 권한 규칙
node --test scripts/test/uploads.test.cjs  # 로컬 + mock GCS 업로드/조회/권한 (실제 버킷·ADC 불필요)
node --test scripts/test/modals.test.cjs   # 배경 클릭으로 닫히지 않는 모달 동작
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
