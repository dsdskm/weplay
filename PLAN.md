# WePlay — PLAN.md

> 조직문화 활성화 SaaS. 이 문서는 **코딩 Agent가 그대로 구현할 수 있는 수준**으로 작성된 설계서다.
> 구현 순서는 §17, 완료 판정은 §18, Agent 작업 규칙은 부록 A를 따른다.

---

## 0. 핵심 결정 요약 (ADR Lite)

| 항목 | 결정 | 이유 |
|---|---|---|
| 아키텍처 | 모듈형 모놀리스 (NestJS 1개 API + Worker 1개) | 1인 운영, 배포 단순 |
| 큐 | **pg-boss** (PostgreSQL 기반 Job Queue) | Redis/Kafka 없이 Cloud SQL 하나로 해결 |
| 인증 | 자체 JWT (Access 15분 + Refresh 14일 Rotation, httpOnly Cookie) | 외부 IdP 비용·종속 회피, 추후 SSO 추가 가능 |
| 비밀번호 | argon2id | 표준 |
| 멀티테넌시 | Shared DB + `companyId` 컬럼 스코프 | 단순, Prisma 친화 |
| 테넌트 식별 | URL 경로 `/companies/:companyId/...` + Guard 검증 | 명시적, 캐시/로그 추적 쉬움 |
| 검증 스키마 | **zod** (packages/shared에서 FE/BE 공유) | 타입 단일 소스 |
| 이메일 | 개발: Mailpit(docker) / 운영: Resend (어댑터 인터페이스) | 교체 가능 |
| 파일 | Cloud Storage Signed URL 업로드 (프로필/회사 로고) | API 부하 없음 |
| 배포 | Cloud Run (api, worker, app-web, platform-admin-web, landing) | 서버리스, 스케일 to zero |
| 스케줄 | Cloud Scheduler → worker HTTP 엔드포인트 or pg-boss schedule | 단순 |
| ID | `cuid2` 문자열 (Prisma `@default(cuid())`) | URL-safe |
| 시간 | 모든 DB 시간 UTC `timestamptz`, FE에서 Asia/Seoul 표시 | |
| 삭제 | Company/Group은 soft delete (`deletedAt`) | 감사·복구 |

---

## 1. 서비스 개요

**WePlay** — "회사 생활을 게임처럼." 구성원이 즐겁게 참여·소통·인정·경쟁·성장하는 조직문화 플랫폼.

- **Phase1(MVP)**: 조직문화 기능이 올라갈 **기반**(User / Company / Group / Membership / 승인 / 권한 / 알림 / 감사)만 구축.
- **Phase2+**: Program Engine 위에 투표·칭찬·마니또·럭키드로우·챌린지 등을 **플러그인**으로 추가, Phase7~8에서 Gamification·Competition 엔진 도입.

타깃: 50~5,000명 규모 국내 기업 / 사내 동호회·TFT·연구회 운영자.
가치 제안: "승인 기반의 신뢰 가능한 조직 그래프" + "그 위에서 바로 돌릴 수 있는 조직문화 프로그램".

---

## 2. 사용자 흐름

### 2.1 직원 (일반 사용자)
```
회원가입(이메일/비번/이름) → 이메일 인증 링크 클릭 → 로그인
→ [온보딩] 회사 코드 입력 → 회사 미리보기(이름/로고) 확인
→ (선택) 그룹 코드 입력(복수 가능) → 가입 요청 제출(메시지 선택)
→ "승인 대기" 화면 (상태: PENDING)
→ 관리자 승인 알림(인앱 + 이메일) → 홈 진입
```
- 거절 시: "거절됨" + 사유 표시, 다른 회사 코드로 재시도 가능. 같은 회사 재요청은 24시간 후 허용.
- 이미 회사 구성원이면: 그룹 코드만 입력해 그룹 가입 요청 가능 (그룹 메뉴 → "코드로 가입").

### 2.2 회사 생성자 (대표 ADMIN)
```
회원가입/로그인 → 온보딩에서 "새 회사 만들기" → 회사명/소개/도메인 입력
→ Company.status = PENDING_REVIEW (플랫폼 승인 대기)
   * env COMPANY_AUTO_APPROVE=true 면 즉시 ACTIVE (개발/초기 운영용)
→ MASTER 승인 → ACTIVE, 생성자는 ADMIN Membership(APPROVED) + `Company.primaryAdminId` 자동 지정
→ 회사 코드 발급 → 직원에게 공유 → 그룹 생성 & 그룹 코드 공유
```

### 2.3 관리자 (대표 ADMIN / 그룹 담당 ADMIN)
```
알림 "새 가입 요청" → 가입 요청 관리 → 요청 상세(이름/이메일/요청 그룹/메시지)
→ 승인(역할 지정 기본 USER, 그룹 선택 조정 가능) / 거절(사유)
→ 구성원 관리: 역할 변경, 강제 탈퇴(BLOCK 옵션)
```

### 2.4 상태 전이
```
MembershipRequest: PENDING → APPROVED | REJECTED | CANCELED(본인 취소) | EXPIRED(30일)
Membership:        APPROVED → LEFT(자발적) | REMOVED(강제) | BLOCKED(강제+재가입 차단)
                   (PENDING/REJECTED 는 Request 쪽에서 관리, Membership은 승인 시 생성)
Company:           PENDING_REVIEW → ACTIVE | REJECTED ; ACTIVE ↔ SUSPENDED
```
> 요구사항의 가입 상태(PENDING/APPROVED/REJECTED/BLOCKED)는 사용자 관점 **통합 상태**로 노출한다:
> `GET /me/companies` 응답의 `joinStatus` = Request PENDING→`PENDING`, Membership APPROVED→`APPROVED`, 최근 Request REJECTED→`REJECTED`, Membership BLOCKED→`BLOCKED`.

---

## 3. MVP 범위

### In Scope
- Auth: 회원가입, 이메일 인증, 로그인, 로그아웃, 토큰 갱신, 비밀번호 재설정
- Profile: 내 정보 조회/수정(이름, 닉네임, 부서명, 직급, 아바타, 자기소개)
- Company: 생성, 수정, 코드 생성/재발급, 공지사항 CRUD
- Group: 생성/수정/삭제(soft), 코드 생성/재발급, 그룹 멤버 목록
- Membership: 가입 요청, 승인, 거절, 강제 탈퇴/차단, 자발적 탈퇴, 역할 변경
- Invitation: 이메일 초대(링크 클릭 시 승인 없이 바로 가입) — **MVP 포함(단순)**
- Notification: 인앱 알림 + 이메일 (가입 요청/승인/거절/공지/시스템)
- Audit: 가입·승인·변경 이력 기록 및 관리자 조회
- platform-admin-web: 회사 승인/정지, 사용자 조회/정지, 플랫폼 공지, 운영 로그, 플랜(정적 목록 관리)
- landing: 정적 소개/기능/가격/FAQ/문의(폼 → API → 이메일)

### Out of Scope (MVP)
- 모든 게임/조직문화 기능 (투표, 칭찬, 포인트 등)
- 결제(Plan은 데이터 모델과 수동 지정만), SSO/SAML, 모바일 앱, 다국어(한국어 고정, i18n 구조만)
- 실시간 WebSocket (알림은 TanStack Query 30초 폴링)

---

## 4. 권한 구조

### 4.1 레벨
| 역할 | 저장 위치 | 설명 |
|---|---|---|
| **MASTER** | `User.platformRole = MASTER` | 개발자/전체 시스템 관리자. platform-admin-web 전용 |
| **ADMIN** | `Membership.role = ADMIN` | 회사별 관리자. 회사 안에 여러 명 가능 |
| └ 대표 ADMIN | `Company.primaryAdminId` | ADMIN 중 1명. 회사 전체 관리. 회사 생성자가 기본 대표 |
| └ 그룹 담당 ADMIN | `GroupMember.role = ADMIN` | **그룹당 1명으로 시작**. 해당 그룹 관리 |
| **USER** | `Membership.role = USER` | 일반 구성원(팀원) |

- 그룹 담당 ADMIN은 반드시 회사 역할도 ADMIN이어야 한다 (담당 지정 시 USER면 자동 ADMIN 승격, 담당 해제 시 다른 담당 그룹이 없으면 USER로 강등할지 선택).
- 한 ADMIN이 여러 그룹 담당 가능. 그룹당 1명 제약은 부분 unique 인덱스로 강제 → 추후 복수 담당 허용 시 인덱스만 제거.
- 담당 ADMIN이 없는 그룹은 대표 ADMIN이 관리.

### 4.2 권한 매트릭스 (Company 스코프)

| Permission | 대표 ADMIN | ADMIN | USER |
|---|:-:|:-:|:-:|
| company:read / member:read / group:read | ✅ | ✅ | ✅ |
| company:update / company:code:rotate | ✅ | ✅ | |
| notice:write | ✅ | ✅ | |
| request:review (회사 가입) | ✅ | ✅ | |
| invitation:create | ✅ | ✅ | |
| audit:read | ✅ | ✅ | |
| group:create (생성자가 담당 ADMIN) | ✅ | ✅ | |
| group:update / code:rotate / 그룹 멤버 관리 | ✅ (전체) | 담당 그룹 | |
| request:review (그룹 가입) | ✅ (전체) | 담당 그룹 | |
| group:delete / 담당 ADMIN 변경 | ✅ | | |
| member:role:update (USER↔ADMIN) | ✅ | | |
| member:remove/block | ✅ (전체) | ✅ (USER만) | |
| primary-admin:transfer / company:delete | ✅ | | |

규칙
- 대표 ADMIN은 회사당 정확히 1명. 이전: `POST /companies/:id/primary-admin` {userId} (대상은 ADMIN이어야 함). MASTER도 강제 지정 가능(`/admin/companies/:id/primary-admin`).
- 대표 ADMIN은 강등·강퇴·자발적 탈퇴 불가 (이전 후 가능). 자기 자신 역할 변경/강퇴 불가.
- 회사에는 항상 ADMIN ≥ 1명 유지.
- MASTER는 `/admin/*` API만 사용. app-web 회사 API에는 일반 규칙 적용(우회 금지 → 감사 명확성).

### 4.3 구현
- `packages/shared/src/permissions.ts` 에 `Permission` enum과 `ROLE_PERMISSIONS: Record<CompanyRole, Permission[]>` + `PRIMARY_ADMIN_PERMISSIONS` 정의 (FE 메뉴 노출에도 사용).
- NestJS: `@RequireCompanyPermission('group:create')` 데코레이터 + `CompanyMemberGuard`
  1. JWT에서 userId
  2. 라우트 `:companyId`로 `Membership(status=APPROVED)` + `company.primaryAdminId` 조회 → `req.membership`(isPrimaryAdmin 포함) 주입
  3. 권한 체크, 그룹 담당 권한은 서비스 레이어에서 `assertGroupManageable(membership, groupId)`
- `MasterGuard`: `platformRole === MASTER`.

---

## 5. DB 설계

### 5.1 ERD (개념)
```
User 1─N Membership N─1 Company 1─N Group 1─N GroupMember N─1 User
User 1─N MembershipRequest N─1 Company
MembershipRequest 1─N MembershipRequestGroup N─1 Group
Company 1─N Invitation ; Company 1─N CompanyNotice
User 1─N Notification ; AuditLog(companyId nullable, actorId, target)
User 1─N RefreshToken ; User 1─N EmailToken(verify/reset)
Plan 1─N Company ; PlatformNotice ; ContactInquiry
```

### 5.2 설계 원칙
- 모든 테넌트 테이블에 `companyId` + 인덱스. Repository 레벨에서 항상 `where: { companyId }` 강제.
- 코드(회사/그룹)는 8자리 대문자 영숫자(혼동문자 0,O,1,I,L 제외) — `ABCD-EF23` 포맷 표시, 저장은 하이픈 없이. 전역 unique. 재발급 시 이전 코드는 즉시 무효.
- 회사 코드 / 그룹 코드 테이블 분리 안 함: `Company.joinCode`, `Group.joinCode` 컬럼 + `joinCodeRotatedAt`.
- 그룹 코드 단독 입력 허용: 그룹 코드로 회사를 역추적 → 회사 미가입이면 회사+그룹 동시 요청 생성.
- `memberCount`는 실시간 count 쿼리(MVP 규모에선 충분). 성능 이슈 시 비정규화.
- AuditLog는 append-only, `before`/`after` JSONB.
- Notification은 `type` + `payload JSONB` + `readAt`.
- Membership unique: `(userId, companyId)`. 재가입 시 기존 row 상태 갱신(LEFT/REMOVED → APPROVED). BLOCKED는 재요청 차단.

---

## 6. Prisma Schema 설계

`packages/db/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ───────── Enums ─────────
enum PlatformRole { USER MASTER }
enum UserStatus { ACTIVE SUSPENDED DELETED }
enum CompanyStatus { PENDING_REVIEW ACTIVE REJECTED SUSPENDED }
enum CompanyRole { ADMIN USER }
enum MembershipStatus { APPROVED LEFT REMOVED BLOCKED }
enum GroupRole { ADMIN MEMBER } // 그룹 담당 ADMIN은 그룹당 1명 (부분 unique 인덱스)
enum GroupVisibility { PUBLIC PRIVATE } // PUBLIC: 회사 구성원 누구나 목록에서 보임
enum RequestStatus { PENDING APPROVED REJECTED CANCELED EXPIRED }
enum RequestType { COMPANY_JOIN GROUP_JOIN }
enum InvitationStatus { PENDING ACCEPTED REVOKED EXPIRED }
enum EmailTokenType { VERIFY_EMAIL RESET_PASSWORD }
enum NotificationType {
  JOIN_REQUEST_CREATED
  JOIN_REQUEST_APPROVED
  JOIN_REQUEST_REJECTED
  MEMBER_REMOVED
  ROLE_CHANGED
  COMPANY_NOTICE
  COMPANY_APPROVED
  COMPANY_REJECTED
  SYSTEM
}

// ───────── User / Auth ─────────
model User {
  id              String       @id @default(cuid())
  email           String       @unique
  passwordHash    String
  name            String
  nickname        String?
  avatarUrl       String?
  bio             String?
  emailVerifiedAt DateTime?
  platformRole    PlatformRole @default(USER)
  status          UserStatus   @default(ACTIVE)
  lastLoginAt     DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  memberships        Membership[]
  groupMembers       GroupMember[]
  requests           MembershipRequest[] @relation("RequestUser")
  reviewedRequests   MembershipRequest[] @relation("RequestReviewer")
  notifications      Notification[]
  refreshTokens      RefreshToken[]
  emailTokens        EmailToken[]
  invitationsSent    Invitation[]        @relation("InvitationInviter")
}

model RefreshToken {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique   // sha256
  familyId   String              // rotation 재사용 탐지용
  expiresAt  DateTime
  revokedAt  DateTime?
  userAgent  String?
  ip         String?
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([familyId])
}

model EmailToken {
  id        String         @id @default(cuid())
  userId    String
  type      EmailTokenType
  tokenHash String         @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime       @default(now())
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, type])
}

// ───────── Plan ─────────
model Plan {
  id          String    @id @default(cuid())
  key         String    @unique   // FREE, TEAM, BUSINESS
  name        String
  maxMembers  Int
  maxGroups   Int
  features    Json      @default("{}") // { "plugins": ["vote", ...] }
  priceMonthly Int      @default(0)     // KRW
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  companies   Company[]
}

// ───────── Company ─────────
model Company {
  id                String        @id @default(cuid())
  name              String
  slug              String        @unique
  description       String?
  logoUrl           String?
  domain            String?       // 선택: 이메일 도메인 힌트
  joinCode          String        @unique
  joinCodeRotatedAt DateTime      @default(now())
  joinCodeEnabled   Boolean       @default(true)
  requireApproval   Boolean       @default(true)
  status            CompanyStatus @default(PENDING_REVIEW)
  planId            String?
  createdById       String
  primaryAdminId    String?       // 대표 ADMIN (Membership.role=ADMIN 인 userId)
  reviewedAt        DateTime?
  reviewNote        String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  deletedAt         DateTime?

  plan        Plan?               @relation(fields: [planId], references: [id])
  memberships Membership[]
  groups      Group[]
  requests    MembershipRequest[]
  invitations Invitation[]
  notices     CompanyNotice[]
  @@index([status])
}

model Membership {
  id         String           @id @default(cuid())
  userId     String
  companyId  String
  role       CompanyRole      @default(USER)
  status     MembershipStatus @default(APPROVED)
  title      String?          // 직급
  department String?          // 표시용 부서명(자유 텍스트)
  joinedAt   DateTime         @default(now())
  leftAt     DateTime?
  updatedAt  DateTime         @updatedAt
  user       User             @relation(fields: [userId], references: [id])
  company    Company          @relation(fields: [companyId], references: [id])
  @@unique([userId, companyId])
  @@index([companyId, status, role])
}

// ───────── Group ─────────
model Group {
  id                String          @id @default(cuid())
  companyId         String
  name              String
  description       String?
  coverUrl          String?
  visibility        GroupVisibility @default(PUBLIC)
  joinCode          String          @unique
  joinCodeRotatedAt DateTime        @default(now())
  joinCodeEnabled   Boolean         @default(true)
  requireApproval   Boolean         @default(true)
  createdById       String
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  deletedAt         DateTime?
  company           Company         @relation(fields: [companyId], references: [id])
  members           GroupMember[]
  requestGroups     MembershipRequestGroup[]
  @@unique([companyId, name])
  @@index([companyId, deletedAt])
}

model GroupMember {
  id        String    @id @default(cuid())
  groupId   String
  userId    String
  companyId String    // 스코프 쿼리 최적화용 비정규화
  role      GroupRole @default(MEMBER)
  joinedAt  DateTime  @default(now())
  group     Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id])
  @@unique([groupId, userId])
  @@index([companyId, userId])
}
// 그룹 탈퇴/강퇴 시 GroupMember row 삭제 + AuditLog 기록 (이력은 AuditLog가 담당)
// 회사 Membership이 APPROVED가 아니게 되면 해당 회사의 GroupMember 전부 삭제

// ───────── Request / Invitation ─────────
model MembershipRequest {
  id           String        @id @default(cuid())
  type         RequestType
  userId       String
  companyId    String
  status       RequestStatus @default(PENDING)
  message      String?
  reviewerId   String?
  reviewNote   String?       // 거절 사유
  reviewedAt   DateTime?
  expiresAt    DateTime      // createdAt + 30d
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  user         User          @relation("RequestUser", fields: [userId], references: [id])
  reviewer     User?         @relation("RequestReviewer", fields: [reviewerId], references: [id])
  company      Company       @relation(fields: [companyId], references: [id])
  groups       MembershipRequestGroup[]
  @@index([companyId, status, createdAt])
  @@index([userId, status])
}
// 동시 PENDING 방지: 서비스 레이어 + 부분 unique 인덱스 (raw SQL migration)
// CREATE UNIQUE INDEX uniq_group_admin ON "GroupMember"("groupId") WHERE role='ADMIN';
// CREATE UNIQUE INDEX uniq_pending_company_req ON "MembershipRequest"("userId","companyId") WHERE status='PENDING' AND type='COMPANY_JOIN';

model MembershipRequestGroup {
  requestId String
  groupId   String
  approved  Boolean? // 승인 시 그룹별 승인 여부(관리자가 일부만 승인 가능)
  request   MembershipRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  group     Group             @relation(fields: [groupId], references: [id])
  @@id([requestId, groupId])
}

model Invitation {
  id         String           @id @default(cuid())
  companyId  String
  email      String
  role       CompanyRole      @default(USER)
  groupIds   String[]         @default([])
  tokenHash  String           @unique
  status     InvitationStatus @default(PENDING)
  inviterId  String
  expiresAt  DateTime         // +7d
  acceptedAt DateTime?
  createdAt  DateTime         @default(now())
  company    Company          @relation(fields: [companyId], references: [id])
  inviter    User             @relation("InvitationInviter", fields: [inviterId], references: [id])
  @@index([companyId, status])
  @@index([email])
}

// ───────── Notice / Notification ─────────
model CompanyNotice {
  id        String    @id @default(cuid())
  companyId String
  authorId  String
  title     String
  body      String    // markdown
  pinned    Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  company   Company   @relation(fields: [companyId], references: [id])
  @@index([companyId, pinned, createdAt])
}

model PlatformNotice {
  id          String    @id @default(cuid())
  title       String
  body        String
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  companyId String?
  type      NotificationType
  title     String
  body      String?
  link      String?          // app-web 내부 경로
  payload   Json             @default("{}")
  readAt    DateTime?
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt, createdAt])
}

// ───────── Audit ─────────
model AuditLog {
  id         String   @id @default(cuid())
  companyId  String?  // null = platform 레벨
  actorId    String?  // null = system
  action     String   // e.g. "membership.request.approved"
  targetType String   // "User" | "Company" | "Group" | "Membership" | ...
  targetId   String
  before     Json?
  after      Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())
  @@index([companyId, createdAt])
  @@index([targetType, targetId])
  @@index([actorId, createdAt])
}

// ───────── Landing ─────────
model ContactInquiry {
  id          String   @id @default(cuid())
  name        String
  email       String
  companyName String?
  message     String
  handled     Boolean  @default(false)
  createdAt   DateTime @default(now())
}

// ───────── Plugin 기반 (Phase1에서 테이블만 생성) ─────────
model CompanyPlugin {
  id        String   @id @default(cuid())
  companyId String
  pluginKey String   // "vote", "cheers", "manitto" ...
  enabled   Boolean  @default(false)
  config    Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([companyId, pluginKey])
}

model OutboxEvent {
  id          String    @id @default(cuid())
  type        String    // "membership.approved"
  companyId   String?
  payload     Json
  createdAt   DateTime  @default(now())
  processedAt DateTime?
  @@index([processedAt, createdAt])
}
```

AuditLog action 표준 목록 (`packages/shared/src/audit-actions.ts`):
`auth.signup, auth.login, auth.password_reset, user.profile.updated, company.created, company.updated, company.code.rotated, company.approved, company.rejected, company.suspended, company.primary_admin.changed, group.created, group.updated, group.deleted, group.code.rotated, group.admin.changed, membership.request.created, membership.request.approved, membership.request.rejected, membership.request.canceled, membership.role.changed, membership.left, membership.removed, membership.blocked, group.member.added, group.member.removed, invitation.created, invitation.accepted, invitation.revoked, notice.created, notice.updated, notice.deleted`

---

## 7. API 설계

- Base: `/api/v1`, JSON, camelCase. 인증: `Authorization: Bearer <access>` (FE는 BFF 없이 직접 호출, refresh는 httpOnly cookie `wp_rt`, path `/api/v1/auth`).
- 에러 포맷: `{ "error": { "code": "MEMBERSHIP_ALREADY_PENDING", "message": "...", "details": {} } }` — code 목록은 `packages/shared/src/error-codes.ts`.
- 페이지네이션: cursor 기반 `?cursor=&limit=20` → `{ items, nextCursor }`.
- Rate limit: `@nestjs/throttler` — auth 엔드포인트 10req/분/IP, 코드 조회 20req/분/user (코드 brute-force 방지).
- OpenAPI: `@nestjs/swagger` → `/api/docs` (dev only).

### Auth
| Method | Path | 설명 |
|---|---|---|
| POST | /auth/signup | {email,password,name} → 인증 메일 발송 |
| POST | /auth/verify-email | {token} |
| POST | /auth/resend-verification | {email} |
| POST | /auth/login | {email,password} → {accessToken, user} + set cookie. 미인증 시 `EMAIL_NOT_VERIFIED` |
| POST | /auth/refresh | cookie → 새 access + rotate refresh |
| POST | /auth/logout | refresh revoke + cookie clear |
| POST | /auth/password/forgot | {email} (존재 여부 노출 금지, 항상 200) |
| POST | /auth/password/reset | {token,newPassword} → 모든 refresh revoke |
| POST | /auth/password/change | {currentPassword,newPassword} (로그인 필요) |

### Me / Profile
| GET | /me | 내 정보 + platformRole |
| PATCH | /me | {name,nickname,bio,avatarUrl} |
| POST | /me/avatar/upload-url | GCS signed URL 발급 |
| GET | /me/companies | 소속/대기 회사 목록 + joinStatus + role |
| GET | /me/requests | 내 가입 요청 목록 |
| DELETE | /me/requests/:id | 요청 취소 |
| GET | /me/notifications | ?unreadOnly= |
| GET | /me/notifications/unread-count | |
| POST | /me/notifications/:id/read · /me/notifications/read-all | |

### Join (코드 기반)
| POST | /join/lookup | {code} → {kind:'COMPANY'|'GROUP', company:{id,name,logoUrl}, group?:{id,name}} |
| POST | /join/requests | {companyCode?, groupCodes?:string[], message?} → MembershipRequest |
| GET | /invitations/:token | 초대 미리보기 |
| POST | /invitations/:token/accept | 로그인 사용자, 이메일 일치 시 즉시 가입 |

### Companies
| POST | /companies | 회사 생성 (생성자 ADMIN + 대표 ADMIN) |
| GET | /companies/:companyId | 회사 정보 |
| PATCH | /companies/:companyId | company:update |
| POST | /companies/:companyId/join-code/rotate | 재발급 |
| PATCH | /companies/:companyId/join-code | {enabled} |
| POST | /companies/:companyId/primary-admin | {userId} 대표 ADMIN 이전 |
| GET | /companies/:companyId/home | 홈 화면 집계 (내 정보/회사/공지 3개/내 그룹/최근 알림) |

### Notices
| GET/POST | /companies/:companyId/notices | |
| GET/PATCH/DELETE | /companies/:companyId/notices/:noticeId | |

### Groups
| GET | /companies/:companyId/groups | ?mine=true, 멤버 수 포함 |
| POST | /companies/:companyId/groups | ADMIN 생성, 생성자가 담당 ADMIN (대표 ADMIN은 {adminUserId}로 지정 가능) |
| PUT | /companies/:companyId/groups/:groupId/admin | {userId} 담당 ADMIN 변경 (대표 ADMIN) |
| GET/PATCH/DELETE | /companies/:companyId/groups/:groupId | |
| POST | /companies/:companyId/groups/:groupId/join-code/rotate | |
| GET | /companies/:companyId/groups/:groupId/members | |
| DELETE | /companies/:companyId/groups/:groupId/members/:userId | 그룹 강퇴 |
| POST | /companies/:companyId/groups/:groupId/leave | 그룹 자발적 탈퇴 |
| POST | /companies/:companyId/groups/:groupId/members | {userIds} 관리자가 회사 구성원을 직접 추가 |

### Membership Requests (관리)
| GET | /companies/:companyId/requests | ?status=PENDING&type= |
| GET | /companies/:companyId/requests/:requestId | |
| POST | /companies/:companyId/requests/:requestId/approve | {role?, groupIds?} (트랜잭션) |
| POST | /companies/:companyId/requests/:requestId/reject | {reason} |
| POST | /companies/:companyId/requests/bulk-approve | {requestIds} |

### Members
| GET | /companies/:companyId/members | ?q=&role=&groupId=&cursor= |
| GET | /companies/:companyId/members/:userId | 프로필 + 소속 그룹 |
| PATCH | /companies/:companyId/members/:userId | {role,title,department} |
| POST | /companies/:companyId/members/:userId/remove | {block:boolean, reason} |
| POST | /companies/:companyId/members/:userId/unblock | |
| POST | /companies/:companyId/leave | 자발적 탈퇴 |

### Invitations (관리)
| GET/POST | /companies/:companyId/invitations | {emails[], role, groupIds[]} |
| POST | /companies/:companyId/invitations/:id/revoke | |

### Audit
| GET | /companies/:companyId/audit-logs | ?action=&actorId=&targetType=&from=&to= |

### Platform Admin (`/admin/*`, MASTER)
| GET | /admin/dashboard | 사용자/회사/요청 수 |
| GET | /admin/companies | ?status= |
| GET | /admin/companies/:id | |
| POST | /admin/companies/:id/approve · /reject · /suspend · /resume | |
| PATCH | /admin/companies/:id/plan | {planId} |
| POST | /admin/companies/:id/primary-admin | {userId} 대표 ADMIN 강제 지정 |
| GET | /admin/users · /admin/users/:id | |
| POST | /admin/users/:id/suspend · /resume | |
| GET/POST/PATCH/DELETE | /admin/notices | 플랫폼 공지 (발행 시 전체 SYSTEM 알림 job) |
| GET | /admin/audit-logs | 전체 운영 로그 |
| GET/POST/PATCH | /admin/plans | |
| GET | /admin/inquiries · POST /admin/inquiries/:id/handle | |
| GET | /admin/system/health | DB/큐 상태, job 실패 수 |

### Public
| POST | /public/contact | landing 문의 |
| GET | /public/plans | 가격표 |
| GET | /health | Cloud Run health |

### 핵심 트랜잭션: 승인
```
approve(requestId, reviewer, {role, groupIds}):
  tx:
    req = lock request (SELECT ... FOR UPDATE), status must be PENDING
    if req.type == COMPANY_JOIN:
       check plan maxMembers
       upsert Membership(userId, companyId) → status APPROVED, role, joinedAt=now
    else assert Membership APPROVED exists
    for g in (groupIds ?? req.groups): create GroupMember (skipDuplicates); mark MembershipRequestGroup.approved
    update req → APPROVED, reviewer, reviewedAt
    insert AuditLog(membership.request.approved)
    insert OutboxEvent(membership.request.approved)
  after commit: pg-boss send('notification.dispatch', ...)  (worker가 OutboxEvent도 폴링하여 누락 방지)
```

### 가입 요청 생성 규칙
- 회사 status ≠ ACTIVE → `COMPANY_NOT_ACTIVE`
- 코드 disabled → `JOIN_CODE_DISABLED`
- Membership BLOCKED → `MEMBERSHIP_BLOCKED`
- 이미 APPROVED 멤버 + 회사코드만 → `ALREADY_MEMBER`
- 이미 멤버 + 그룹코드 → `GROUP_JOIN` 요청 (그룹 `requireApproval=false`면 즉시 가입)
- 회사 `requireApproval=false`면 즉시 승인 처리(같은 approve 로직, reviewer=system)
- 가입 요청 생성 시 알림 대상: 회사 ADMIN 전원 (+ 그룹 요청이면 해당 그룹 담당 ADMIN)

---

## 8. app-web 설계

### 8.1 레이아웃
- **Mobile-first** 반응형. 데스크톱: 좌측 사이드바 / 모바일: 하단 탭바(홈·그룹·구성원·알림·프로필).
- 상단: 회사 스위처(여러 회사 소속 대비), 알림 벨(unread badge), 아바타 메뉴.
- 관리자 메뉴는 사이드바 하단 "관리" 섹션 (권한 있는 경우만 표시, 서버에서도 재검증).
- 톤: 밝고 게임스러운 UI — 브랜드 컬러 Violet(#7C3AED) + Accent Amber, 둥근 카드(rounded-2xl), 이모지/일러스트 빈 상태. 다크모드 지원(next-themes).

### 8.2 화면 목록
| 화면 | 주요 요소 |
|---|---|
| 로그인/회원가입/비번찾기/재설정/이메일인증 | 카드형 폼, zod + react-hook-form |
| 온보딩 `/onboarding` | 2갈래 카드: "코드로 참여하기" / "새 회사 만들기" |
| 코드 입력 `/onboarding/join` | 8자리 OTP 스타일 입력 → lookup 미리보기 → 그룹 코드 추가(칩) → 메시지 → 제출 |
| 승인 대기 `/onboarding/pending` | 상태 일러스트, 요청 내역, 취소 버튼, 30초 폴링 |
| 회사 생성 `/onboarding/create-company` | 이름/소개/로고 → 검토 대기 안내 |
| 홈 `/c/[companyId]` | 인사 카드(이름·역할·가입일), 회사 카드(소개), 공지 3개, 내 그룹 카드 그리드(설명·멤버수), 최근 알림, "곧 만나요" 프로그램 티저(Phase2 자리) |
| 그룹 목록/상세 | 탭: 내 그룹 / 전체 그룹, 상세: 소개·담당 ADMIN·멤버 목록·(담당 ADMIN) 코드 표시 |
| 구성원 | 검색/역할 필터/그룹 필터, 카드·리스트 토글, 멤버 상세 시트 |
| 프로필 | 내 정보 수정, 아바타 업로드, 비밀번호 변경, 소속 회사/그룹, 탈퇴 |
| 알림 | 목록, 읽음 처리, 타입별 아이콘 |
| [관리] 회사 관리 | 기본정보, 회사 코드(복사/재발급/활성화), 승인 필요 여부, 공지 관리 |
| [관리] 그룹 관리 | 테이블 + 생성/수정 다이얼로그, 코드 재발급, 삭제 확인 |
| [관리] 가입 요청 | 탭(대기/처리완료), 일괄 승인, 승인 시 역할·그룹 조정 다이얼로그, 거절 사유 |
| [관리] 구성원 관리 | 역할 변경, 강퇴/차단, 초대 보내기, 차단 목록 |
| [관리] 감사 로그 | 필터 테이블 |

### 8.3 진입 라우팅 규칙 (middleware + 서버 컴포넌트)
```
비로그인 → /login
로그인 & 이메일 미인증 → /verify-email
로그인 & APPROVED 회사 0개:
   PENDING 요청 있음 → /onboarding/pending
   없음 → /onboarding
APPROVED 회사 1개 이상 → /c/[lastCompanyId] (localStorage + cookie `wp_last_company`)
```

### 8.4 FE 기술 규칙
- 인증: access token은 메모리(zustand) 보관, 401 시 `/auth/refresh` 자동 재시도(단일 in-flight). 페이지 로드 시 refresh 호출로 세션 복구.
- Route protection: Next middleware는 refresh cookie 존재 여부만 체크(가벼운 가드). 실제 권한은 API.
  - refresh cookie는 API 도메인에 설정되므로 **app-web과 api를 같은 상위 도메인**(app.weplay.kr / api.weplay.kr, cookie domain `.weplay.kr`, SameSite=Lax)으로 배치.
- 데이터: TanStack Query, 쿼리키 팩토리 `packages/api-client/src/query-keys.ts`.
- API 클라이언트: `packages/api-client` (fetch 래퍼 + zod 응답 타입 + 엔드포인트 함수).
- UI: `packages/ui` (shadcn 컴포넌트 공유), Tailwind preset 공유.

---

## 9. platform-admin-web 설계

- 별도 Next.js 앱, 도메인 `admin.weplay.kr`. 로그인은 같은 `/auth/login` 사용 후 `platformRole !== MASTER`이면 차단 화면.
- (권장) Cloud Run 앞 IAP 또는 IP allowlist는 추후. MVP는 역할 체크 + 2차 확인 없음.
- 레이아웃: 데스크톱 전용 관리자 테이블 UI (shadcn DataTable + TanStack Table).

| 메뉴 | 기능 |
|---|---|
| 대시보드 | 사용자 수, 회사 수(상태별), 대기 회사, 최근 7일 가입 추이, job 실패 수 |
| 고객사 관리 | 회사 목록/검색/상태 필터, 상세(멤버 수, 그룹 수, 플랜, 생성자) |
| 회사 승인 | PENDING_REVIEW 큐, 승인/거절(사유) |
| 사용자 관리 | 검색, 상세(소속 회사), 정지/해제 |
| 공지 관리 | 플랫폼 공지 CRUD, 발행 |
| 운영 로그 | AuditLog 전체 검색 |
| 플랜 관리 | Plan CRUD, 회사별 플랜 지정 |
| 문의 | landing 문의 목록, 처리 표시 |
| 시스템 | health, pg-boss 큐 상태(대기/실패), 실패 job 재시도 |

MASTER 생성: `pnpm --filter api seed:master --email=... ` 스크립트 (env `SEED_MASTER_EMAIL`, `SEED_MASTER_PASSWORD`).

---

## 10. NestJS 모듈 설계

```
apps/api/src
├─ main.ts                 # helmet, cookie-parser, CORS(app/admin/landing origin), ValidationPipe(zod)
├─ app.module.ts
├─ config/                 # @nestjs/config + zod env 검증
├─ common/
│  ├─ guards/              # JwtAuthGuard(global, @Public 예외), CompanyMemberGuard, MasterGuard
│  ├─ decorators/          # @Public, @CurrentUser, @CurrentMembership, @RequireCompanyPermission
│  ├─ filters/             # AppExceptionFilter (AppError(code) → 표준 에러 포맷, Prisma 에러 매핑)
│  ├─ pipes/               # ZodValidationPipe (nestjs-zod 사용 가능)
│  ├─ interceptors/        # RequestContext(ip, ua, requestId) → AsyncLocalStorage
│  └─ utils/               # join-code generator, cursor pagination, crypto(hash token)
├─ infra/
│  ├─ prisma/              # PrismaService (packages/db client)
│  ├─ queue/               # QueueService (pg-boss producer)
│  ├─ mail/                # MailService interface: MailpitAdapter(SMTP) | ResendAdapter
│  ├─ storage/             # GcsService (signed URL)
│  └─ events/              # DomainEventBus (@nestjs/event-emitter) + Outbox writer
├─ modules/
│  ├─ auth/                # signup, login, refresh rotation, verify, reset
│  ├─ users/               # /me, profile
│  ├─ companies/           # company CRUD, join code, notices(sub), home aggregate
│  ├─ groups/              # group CRUD, group members
│  ├─ memberships/         # members list, role change, remove/block, leave
│  ├─ membership-requests/ # join lookup, create request, approve/reject
│  ├─ invitations/
│  ├─ notifications/       # in-app list/read + NotificationService.create (enqueue)
│  ├─ audits/              # AuditService.log(), 조회
│  ├─ platform-admin/      # /admin/* 컨트롤러 (다른 모듈 서비스 재사용)
│  ├─ public/              # contact, plans
│  └─ plugins/             # PluginRegistry (Phase1: 레지스트리 + CompanyPlugin 조회만)
└─ health/
```

모듈 의존 규칙
- `modules/*`는 서로의 **Service만** import (Controller/Repository 직접 접근 금지).
- 횡단 관심사(audit, notification)는 **도메인 이벤트**로 연결: `MembershipRequestsService`는 `events.emit('membership.request.approved', payload)` → `AuditListener`, `NotificationListener`가 처리. 단, AuditLog는 정합성을 위해 **같은 트랜잭션 내에서 기록**(`AuditService.log(tx, ...)`), 알림은 커밋 후 큐잉.
- 각 모듈 구조: `*.controller.ts / *.service.ts / dto/*.ts(zod) / *.spec.ts`.

### Worker (`apps/worker`)
- NestJS standalone application(`createApplicationContext`) + 최소 HTTP(health, Cloud Run 요구) — `packages/db`, 공통 infra 코드 공유를 위해 `packages/server-core`로 mail/queue/prisma 추출.
- pg-boss 큐
  | Queue | 내용 |
  |---|---|
  | `notification.dispatch` | Notification row 생성 + 이메일 필요 시 `mail.send` enqueue |
  | `mail.send` | 템플릿 렌더(React Email) → MailService, retry 5회 exponential |
  | `outbox.relay` | 1분 주기: processedAt null인 OutboxEvent → 해당 큐로 전달 |
  | `requests.expire` | 매일 03:00 KST: PENDING & expiresAt<now → EXPIRED + 알림 |
  | `invitations.expire` | 매일 03:10 KST |
  | `tokens.cleanup` | 매일 04:00 KST: 만료 RefreshToken/EmailToken 삭제 |
  | `platform.notice.broadcast` | 플랫폼 공지 → 전체 사용자 SYSTEM 알림 (배치 1000) |
- pg-boss `schedule()` 사용 (Cloud Scheduler 불필요). Worker Cloud Run은 `min-instances=1`, CPU always allocated.

이메일 템플릿 (`packages/emails`, React Email): verify-email, reset-password, join-request-created(관리자), join-approved, join-rejected, invitation, company-approved/rejected, company-notice.

---

## 11. 모노레포 구조

```
weplay/
├─ apps/
│  ├─ api/                    # NestJS (port 4000)
│  ├─ worker/                 # NestJS standalone + pg-boss (port 4100 health)
│  ├─ app-web/                # Next.js (port 3000)
│  ├─ platform-admin-web/     # Next.js (port 3001)
│  └─ landing/                # Next.js static export 가능 (port 3002)
├─ packages/
│  ├─ db/                     # prisma schema, migrations, seed, generated client export
│  ├─ shared/                 # zod schemas(DTO), enums, permissions, error-codes, audit-actions, join-code util
│  ├─ server-core/            # prisma/queue/mail/storage providers (api·worker 공유 Nest 모듈)
│  ├─ emails/                 # React Email 템플릿
│  ├─ api-client/             # FE용 fetch 클라이언트 + query keys
│  ├─ ui/                     # shadcn 컴포넌트, tailwind preset, 아이콘
│  └─ config/                 # eslint, tsconfig(base/nest/next), prettier
├─ infra/
│  ├─ docker/                 # 각 앱 Dockerfile (turbo prune 기반 multi-stage)
│  ├─ docker-compose.yml      # postgres:16, mailpit, (fake-gcs-server 선택)
│  └─ gcp/                    # 배포 스크립트(gcloud), cloudbuild.yaml
├─ .github/workflows/         # ci.yml(lint/typecheck/test/build), deploy.yml
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
├─ .env.example
└─ PLAN.md
```

버전 기준: Node 22 LTS, pnpm 9, TypeScript 5.x, NestJS 11, Next.js 15 (App Router), React 19, Prisma 6, Tailwind 4, TanStack Query 5, PostgreSQL 16.

turbo tasks: `build`, `dev`, `lint`, `typecheck`, `test`, `db:generate`(build 선행 의존), `db:migrate`.

루트 스크립트:
```
pnpm dev            # docker compose up -d && turbo dev
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # 샘플 데이터 (MASTER, LG전자 데모 회사, 그룹 4개, 유저 10명)
pnpm test / lint / typecheck / build
```

---

## 12. Next.js 라우팅 구조

### app-web (`apps/app-web/src/app`)
```
(auth)/
  login/page.tsx
  signup/page.tsx
  verify-email/page.tsx            # ?token= 처리 + 재발송
  forgot-password/page.tsx
  reset-password/page.tsx          # ?token=
invite/[token]/page.tsx            # 초대 수락
onboarding/
  page.tsx                         # 참여/생성 선택
  join/page.tsx
  pending/page.tsx
  create-company/page.tsx
c/[companyId]/
  layout.tsx                       # 사이드바/탭바, 회사 컨텍스트 provider, 멤버십 검증
  page.tsx                         # 홈
  groups/page.tsx
  groups/[groupId]/page.tsx
  members/page.tsx
  members/[userId]/page.tsx
  notifications/page.tsx
  profile/page.tsx
  admin/
    layout.tsx                     # 권한 체크 (ADMIN)
    company/page.tsx
    notices/page.tsx
    groups/page.tsx
    requests/page.tsx
    members/page.tsx
    invitations/page.tsx
    audit-logs/page.tsx
page.tsx                           # 진입 분기(§8.3)
middleware.ts
```
- 대부분 Client Component + TanStack Query (토큰이 메모리에 있으므로). 레이아웃/정적 셸만 Server Component.

### platform-admin-web
```
login/page.tsx
(dashboard)/
  layout.tsx
  page.tsx
  companies/page.tsx · companies/[id]/page.tsx · companies/review/page.tsx
  users/page.tsx · users/[id]/page.tsx
  notices/page.tsx
  audit-logs/page.tsx
  plans/page.tsx
  inquiries/page.tsx
  system/page.tsx
```

### landing
```
page.tsx (Hero / 기능 / 동작 방식 / 로드맵 티저 / CTA)
features/page.tsx
pricing/page.tsx   # /public/plans 빌드 타임 fetch (실패 시 정적 fallback)
faq/page.tsx
contact/page.tsx   # 폼 → /public/contact
```

#### landing 껍데기 (M0.5에서 먼저 구축)
- API 의존 없는 **정적 페이지**로 먼저 완성 (`output: 'export'` 가능). 가격은 `src/content/plans.ts` 정적 데이터, 문의는 M18 전까지 `mailto:` 링크.
- 공통: `layout.tsx`(Header: 로고·기능·가격·FAQ·문의·[로그인]/[무료로 시작하기] → `APP_WEB_URL`), Footer(회사정보·약관·개인정보처리방침 placeholder), SEO metadata/OG 이미지, `sitemap.ts`, `robots.ts`.
- 홈 섹션 구성 (콘텐츠는 `src/content/*.ts`에 분리해 문구만 교체 가능하게):
  1. Hero — "회사 생활을 게임처럼, WePlay" + 서브카피 + CTA 2개 + 앱 목업 이미지 자리
  2. Problem — 형식적인 사내 행사/낮은 참여율 문제 3가지
  3. Features — 칭찬·투표·마니또·럭키드로우·챌린지·랭킹 카드 6개 (Phase2+ 기능은 "Coming Soon" 뱃지)
  4. How it works — 회사 생성 → 코드 공유 → 승인 → 함께 플레이 4단계
  5. Gamification 티저 — 레벨/배지/시즌/회사 대항전
  6. Pricing 요약 — FREE / TEAM / BUSINESS 3단
  7. FAQ 요약 5개 + CTA 배너
- 디자인: app-web과 동일 브랜드(Violet #7C3AED + Amber), `packages/ui` 사용, 모바일 반응형, 다크모드.
- 완료 기준: `pnpm --filter landing build` 성공, 5개 페이지 렌더, Lighthouse 성능/SEO 90+.

---

## 13. GCP 아키텍처

```
          Cloud DNS (weplay.kr)
               │
   ┌───────────┼────────────────────────────┐
   ▼           ▼              ▼              ▼
weplay.kr   app.weplay.kr  admin.weplay.kr  api.weplay.kr
(landing)   (app-web)      (platform-admin) (api)
 Cloud Run   Cloud Run      Cloud Run        Cloud Run ──┐
                                                         │ Cloud SQL Connector (unix socket)
                                     worker Cloud Run ───┤
                                     (min=1, internal)   ▼
                                                   Cloud SQL PostgreSQL 16
                                                   (db-g1-small → 성장 시 상향, 자동 백업 + PITR)
api/worker ─→ Cloud Storage (weplay-uploads, public-read CDN path for avatars/logos)
api/worker ─→ Secret Manager (DATABASE_URL, JWT secrets, RESEND_API_KEY) — Cloud Run env 시크릿 마운트
Logging/Monitoring: Cloud Logging (pino JSON 로그) + Uptime check + Error Reporting
```
- 도메인 매핑: Cloud Run domain mapping 또는 Global HTTPS LB(+ Cloud CDN for landing). MVP는 domain mapping.
- 리전: `asia-northeast3`(서울).
- 환경: `dev`(로컬 docker) / `staging` / `prod` — GCP 프로젝트 2개(weplay-staging, weplay-prod).
- CI/CD: GitHub Actions → Workload Identity Federation → Artifact Registry 이미지 push → `gcloud run deploy`. 마이그레이션은 Cloud Run **Job** `api-migrate`(`prisma migrate deploy`)를 배포 전 실행.
- 예상 비용(초기): Cloud SQL ~$30, Cloud Run 5개 거의 무료~$20, 합계 월 $50 내외.

### 환경변수 (.env.example)
```
DATABASE_URL=postgresql://weplay:weplay@localhost:5432/weplay
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL_DAYS=14
COOKIE_DOMAIN=localhost
APP_WEB_URL=http://localhost:3000
ADMIN_WEB_URL=http://localhost:3001
LANDING_URL=http://localhost:3002
API_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
MAIL_DRIVER=smtp            # smtp | resend
SMTP_HOST=localhost
SMTP_PORT=1025
RESEND_API_KEY=
MAIL_FROM="WePlay <no-reply@weplay.kr>"
GCS_BUCKET=
STORAGE_DRIVER=local        # local | gcs
COMPANY_AUTO_APPROVE=true
SEED_MASTER_EMAIL=master@weplay.local
SEED_MASTER_PASSWORD=
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 14. 향후 플러그인 구조

### 14.1 원칙
- 모든 조직문화 기능 = **Program**. Program은 `companyId` + **대상(scope)** = 회사 전체 | 특정 Group(들) 위에서 동작.
- 각 기능은 **Plugin 모듈**: 코어(Company/Group/Membership)에 의존하지만 코어는 플러그인을 모른다.
- 플러그인 간 통신은 **도메인 이벤트**만 사용 (e.g., `vote.closed` → Gamification이 포인트 지급).

### 14.2 백엔드 Plugin 인터페이스 (`apps/api/src/modules/plugins/plugin.types.ts`, Phase1에 타입만 정의)
```ts
export interface WePlayPluginManifest {
  key: string;                  // 'vote' | 'cheers' | 'manitto' | 'lucky-draw' | 'challenge' ...
  name: string;
  version: string;
  programType?: string;         // Program Engine 사용 시 타입
  permissions: string[];        // 'vote:create', 'vote:cast' ...
  defaultRolePermissions: Partial<Record<CompanyRole, string[]>>;
  configSchema: ZodSchema;      // CompanyPlugin.config 검증
  emits: string[];              // 발행 이벤트
  subscribes: string[];         // 구독 이벤트
  requiredPlan?: string[];      // Plan.features.plugins 와 매칭
}
export interface WePlayPlugin {
  manifest: WePlayPluginManifest;
  module: Type<any>;            // Nest 모듈 (컨트롤러 prefix: /companies/:companyId/p/:pluginKey)
}
```
- `PluginRegistry`: 부팅 시 `plugins/index.ts`의 배열을 등록 → `PluginEnabledGuard`가 `CompanyPlugin.enabled` + 플랜 체크.
- 각 플러그인은 자체 Prisma 모델을 가짐(스키마 파일 분리: Prisma `prismaSchemaFolder` — `packages/db/prisma/schema/*.prisma`, Phase1부터 폴더 구조 사용 권장: `core.prisma`, `plugin-*.prisma`).

### 14.3 Program Engine (Phase2)
```prisma
enum ProgramStatus { DRAFT SCHEDULED OPEN CLOSED ARCHIVED }
model Program {
  id String @id @default(cuid())
  companyId String
  pluginKey String            // 'vote'
  title String
  description String?
  status ProgramStatus @default(DRAFT)
  scopeType String            // COMPANY | GROUPS
  scopeGroupIds String[]
  startsAt DateTime?
  endsAt DateTime?
  config Json                 // 플러그인별 설정
  createdById String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model ProgramParticipant { id String @id @default(cuid()); programId String; userId String; role String; joinedAt DateTime @default(now()); data Json @default("{}"); @@unique([programId, userId]) }
model ProgramResult { id String @id @default(cuid()); programId String; rank Int?; subjectType String; subjectId String; score Float?; data Json; createdAt DateTime @default(now()) }
```
- 공통 라이프사이클: worker가 `startsAt/endsAt`에 OPEN/CLOSED 전이 → `program.opened/closed` 이벤트.
- 공통 UI: app-web `c/[companyId]/programs`, `programs/[programId]` 가 `pluginKey`별 렌더러 컴포넌트(`packages/plugins-ui/<key>`) 로드.
- 플러그인 로드맵 매핑: Vote/Survey(P3) → Cheers/Recognition(P4) → Manitto(P5) → Lucky Draw(P6) — 모두 Program + 플러그인 테이블.

---

## 15. Gamification Engine 설계 (Phase7, 설계만)

- **Ledger 기반**: 포인트/XP는 절대 직접 수정하지 않고 append-only 원장에 기록. 잔액은 집계 테이블에 캐시.
```prisma
model PointLedger { id String @id @default(cuid()); companyId String; userId String; currency String /* POINT|XP */; amount Int; reason String; sourceType String; sourceId String; seasonId String?; idempotencyKey String @unique; createdAt DateTime @default(now()); @@index([companyId, userId, currency]) }
model UserStat   { companyId String; userId String; points Int @default(0); xp Int @default(0); level Int @default(1); updatedAt DateTime @updatedAt; @@id([companyId, userId]) }
model LevelRule  { companyId String?; level Int; minXp Int; @@id([level]) }  // companyId null = 기본 곡선
model Badge      { id String @id; companyId String?; key String; name String; iconUrl String; criteria Json }
model UserBadge  { userId String; badgeId String; companyId String; awardedAt DateTime @default(now()); @@id([userId, badgeId]) }
model Achievement{ id String @id; key String; criteria Json /* {event:'cheers.sent', count:10} */; rewardPoints Int; badgeId String? }
model Title      { id String @id; key String; name String; criteria Json }
model Season     { id String @id; companyId String?; name String; startsAt DateTime; endsAt DateTime; status String }
model Reward     { id String @id; companyId String; name String; costPoints Int; stock Int? }
```
- **Rule Engine**: `GamificationRule { event, condition(JSON Logic), effects[{type:'POINT'|'XP'|'BADGE', amount}] }`. 도메인 이벤트 구독 → worker `gamification.apply` 큐에서 처리 → idempotencyKey = `${event.id}:${ruleId}`.
- 레벨: `level = max(level where minXp <= xp)`, 기본 곡선 `minXp = 50 * (level-1)^2`.
- 시즌: 시즌별 XP는 `seasonId`로 원장 필터, 시즌 종료 시 `SeasonSnapshot` 저장 후 칭호/배지 지급.
- 회사가 규칙·보상을 설정, 플랫폼이 기본값 제공.

---

## 16. 회사 대항전 설계 (Phase8, 설계만)

- **Competition Engine**: 랭킹 = 원장 집계의 스냅샷. 실시간 계산 대신 worker가 5분 주기로 `RankingSnapshot` 갱신.
```prisma
model Competition { id String @id; scope String /* INTRA_COMPANY | INTER_COMPANY */; type String /* INDIVIDUAL|GROUP|DEPARTMENT|COMPANY */; seasonId String?; metric String /* xp|points|custom */; startsAt DateTime; endsAt DateTime; status String }
model CompetitionEntry { id String @id; competitionId String; entryType String /* USER|GROUP|COMPANY */; entryId String; companyId String; @@unique([competitionId, entryType, entryId]) }
model RankingSnapshot { id String @id; competitionId String; entryId String; score Float; rank Int; computedAt DateTime; @@index([competitionId, rank]) }
model League { id String @id; name String; tier Int; seasonId String } // 브론즈~다이아, 시즌 종료 시 승강
model LeagueMember { leagueId String; entryType String; entryId String; @@id([leagueId, entryType, entryId]) }
```
- **공정성**: 그룹/회사 점수는 합계가 아닌 **1인당 평균 또는 참여율 가중**(규모 차이 보정): `score = avg(member_score) * participation_rate^0.5`.
- **회사 대항전(INTER_COMPANY)**: 플랫폼 주최(MASTER가 생성), 회사는 opt-in(`CompanyPlugin 'competition'`). 회사 간 개인정보 노출 금지 — 타사에는 회사명·점수·순위만 공개.
- 팀 대항전 = INTRA_COMPANY + GROUP 엔트리. 시즌전/리그전 = Season + League 승강.

---

## 17. 개발 우선순위 (Agent 실행 순서)

각 단계 완료 시 `pnpm lint && pnpm typecheck && pnpm test` 통과 + 커밋 1개 이상.

| # | 단계 | 산출물 |
|---|---|---|
| M0 | 모노레포 부트스트랩 | pnpm workspace, turbo, packages/config, 5개 앱 빈 골격 실행, docker-compose(postgres, mailpit), .env.example, CI(ci.yml) |
| M0.5 | landing 껍데기 | §12 "landing 껍데기" 전체 (정적, API 무의존, packages/ui 최소 셋업 포함) |
| M1 | DB | packages/db: §6 스키마(폴더 분리), 초기 마이그레이션 + 부분 unique 인덱스 raw SQL(uniq_group_admin, uniq_pending_company_req), seed 스크립트 |
| M2 | shared | enums, zod DTO, permissions, error-codes, audit-actions, join-code util(+테스트) |
| M3 | API 코어 | config 검증, Prisma/Queue/Mail/Storage infra, 예외 필터, Guards/Decorators, RequestContext, health, swagger |
| M4 | Auth | signup/verify/login/refresh rotation/logout/forgot/reset/change + e2e 테스트 |
| M5 | Users | /me, 프로필 수정, 아바타 업로드 URL |
| M6 | Companies | 생성(생성자 ADMIN·대표 ADMIN 자동), 조회/수정, 코드 재발급, 공지 CRUD, auto-approve 플래그 |
| M7 | Groups | CRUD, 코드, 그룹 멤버 관리 |
| M8 | Join & Requests | lookup, 요청 생성 규칙, 승인 트랜잭션, 거절, 일괄 승인, 취소 + e2e |
| M9 | Memberships | 목록/검색, 역할 변경, 강퇴/차단/해제, 자발적 탈퇴, 대표 ADMIN 이전 |
| M10 | Notifications & Audit | 이벤트 리스너, 알림 API, 감사 로그 기록·조회 |
| M11 | Worker | pg-boss 큐 전체(§10), React Email 템플릿, 스케줄 작업 |
| M12 | Invitations | 생성/수락/취소 + 메일 |
| M13 | packages/ui · api-client | shadcn 셋업, 테마, fetch 클라이언트(토큰 refresh), query keys |
| M14 | app-web 인증/온보딩 | §12 (auth), onboarding, 진입 분기 |
| M15 | app-web 직원 화면 | 홈, 그룹, 구성원, 프로필, 알림 |
| M16 | app-web 관리자 화면 | 회사/공지/그룹/요청/구성원/초대/감사 |
| M17 | platform-admin-web | §9 전체 |
| M18 | landing 연동 | 문의 폼 → /public/contact, 가격 → /public/plans 연동 |
| M19 | 배포 | Dockerfile(turbo prune), cloudbuild/GitHub Actions deploy, migrate Job, 시크릿 연결 문서(infra/gcp/README.md) |
| M20 | E2E | Playwright: §18 시나리오 자동화 |

---

## 18. MVP 완료 기준 (Definition of Done)

### 기능 시나리오 (Playwright E2E로 자동 검증, `apps/app-web/e2e/mvp.spec.ts`)
1. **회원가입**: 신규 이메일 가입 → Mailpit API로 인증 메일 조회 → 링크 접속 → 인증 완료.
2. **로그인**: 로그인 성공, 새로고침 후 세션 유지(refresh), 로그아웃 후 보호 페이지 접근 시 /login.
3. **회사 생성**: 사용자 A가 "LG전자" 생성 → (auto-approve off일 때) platform-admin에서 MASTER 승인 → A는 대표 ADMIN.
4. **그룹 생성**: A가 "로봇제어팀", "AI연구회" 생성 → 그룹 코드 발급 확인.
5. **가입 요청**: 사용자 B가 회사 코드 + 그룹 코드 2개로 요청 → /onboarding/pending 표시, A에게 인앱 알림 + 메일.
6. **관리자 승인**: A가 요청 승인 → B에게 승인 알림, AuditLog `membership.request.approved` 존재.
7. **소속**: B의 홈에 회사 정보·공지·내 그룹 2개(멤버 수 2) 표시, 역할 USER.
8. **구성원 조회**: B가 회사 구성원 목록에서 A 확인, 그룹 상세에서 같은 그룹 구성원 확인.

### 추가 검증
- 거절 플로우: 사용자 C 요청 → 거절(사유) → C에게 사유 표시.
- 권한: USER가 관리자 API 호출 시 403, 타 회사 `companyId` 접근 시 403 (테넌트 격리 e2e 테스트).
- 코드 재발급 후 구 코드 lookup → `JOIN_CODE_INVALID`.
- 강제 탈퇴(block) 후 재요청 → `MEMBERSHIP_BLOCKED`.
- 비밀번호 재설정 후 기존 refresh 토큰 무효.
- 만료 작업: expiresAt 과거로 만든 요청 → `requests.expire` 실행 후 EXPIRED.

### 품질 기준
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` 전부 통과 (CI green).
- API 서비스 유닛 테스트: auth, membership-requests(승인 트랜잭션), permissions 매트릭스 — 커버리지 핵심 서비스 80%+.
- 모든 상태 변경 API가 AuditLog를 남김.
- `docker compose up && pnpm db:migrate && pnpm db:seed && pnpm dev`로 로컬 전체 기동 (README에 명시).
- staging Cloud Run에 5개 앱 배포 및 위 시나리오 수동 1회 통과.

---

## 부록 A. 코딩 Agent 작업 규칙

1. §17 순서대로 진행. 한 마일스톤 완료 시 테스트 통과 후 커밋 (`feat(api): M4 auth ...`).
2. 스키마/계약 변경이 필요하면 **이 PLAN.md를 먼저 수정**하고 이유를 커밋 메시지에 남긴다.
3. DTO·enum·에러코드는 반드시 `packages/shared`에 정의하고 FE/BE가 공유. 중복 정의 금지.
4. 모든 회사 스코프 쿼리에 `companyId` 조건 필수. Guard를 우회하는 서비스 메서드 금지.
5. 상태 변경은 서비스 레이어 트랜잭션(`prisma.$transaction`) + 같은 tx에서 AuditLog 기록.
6. 알림/메일은 API에서 직접 보내지 않고 큐(pg-boss)로 위임.
7. 비밀번호·토큰 원문을 로그/DB에 저장 금지 (토큰은 sha256 해시 저장).
8. 게임 기능(Phase2+) 코드는 작성하지 않는다. 단, §14의 `plugin.types.ts`, `CompanyPlugin`, `OutboxEvent`, 홈 "프로그램 티저" 자리만 만든다.
9. UI 문구는 한국어. 문자열은 `apps/*/src/messages/ko.ts`에 모아 추후 i18n 대비.
10. 불확실한 요구사항은 이 문서의 기본값을 따르고, `docs/decisions.md`에 기록한다.
