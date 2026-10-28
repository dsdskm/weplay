# WePlay

## 계정 유형 (Account Type)

| 계정 유형 | 저장 위치 | 설명 |
| --- | --- | --- |
| `MASTER` | `User.platformRole` | 시스템 관리자. 모든 그룹/팀 수정 |
| `ADMIN` | `GroupMembership.role` / `TeamMember.role` | 아래 둘 중 하나 이상. 목록에서는 자동 표시 |
| ↳ `GROUP_ADMIN` | `GroupMembership.role = ADMIN` | 그룹 정보 관리. 여러 명 가능, 대표 1명 필수 |
| ↳ `TEAM_ADMIN` | `TeamMember.role = ADMIN` | 팀 정보 관리. 여러 명 가능, 대표 1명 필수 |
| `USER` | `User.platformRole = USER` | 일반 구성원. 그룹/팀 소속은 선택 |

- 계정은 그룹 1개, 팀 1개까지만 소속 가능
- 팀은 그룹에 속해야 함 (그룹 없이 팀만 있을 수 없음). GROUP_ADMIN은 팀 소속이 선택
- 대표는 강등·제외·삭제 전에 먼저 바꿔야 함. 대표 계정을 삭제하면 남은 ADMIN 중 가장 먼저 지정된 사람이 자동 대표가 됨

## 화면과 권한

| 기능 | MASTER (system-web) | GROUP_ADMIN (user-web) | TEAM_ADMIN (user-web) | USER (user-web) |
| --- | --- | --- | --- | --- |
| 그룹 생성·코드·삭제 | ✅ | ❌ | ❌ | ❌ |
| 그룹 이름·소개 수정 | ✅ | ✅ | ❌ | ❌ |
| 팀 생성·삭제 | ✅ | ✅ 그룹 전체 | ❌ | ❌ |
| 팀 이름·소개 수정 | ✅ | ✅ 전체 팀 | ✅ 담당 팀 | ❌ |
| 계정 생성·수정·삭제·상태 | ✅ | ❌ | ❌ | ❌ |
| 계정 소속(그룹/팀) 일괄 지정 | ✅ | ❌ | ❌ | ❌ |
| 감사 로그 조회 | ✅ | ❌ | ❌ | ❌ |
| 가입 요청 승인/거절 | ✅ (상세) | ✅ 그룹 전체 | ✅ 담당 팀 요청 | ❌ |
| 팀 설정 (공개, 승인 방식, 코드 사용, 재발급) | ✅ | ✅ 전체 팀 | ✅ 담당 팀 | ❌ |
| 팀 구성원 역할 (팀 ADMIN 지정) | ✅ | ✅ 전체 팀 | ✅ 담당 팀 | ❌ |
| 팀 구성원 목록 보기 | ✅ | ✅ | ✅ | 팀 구성원만 |
| 팀 가입 코드 입력 | — | ✅ | ✅ | ✅ (승인 대기·거절 사유 표시, 요청 취소) |

- user-web 관리 메뉴(가입 요청, 팀 관리)는 그룹 ADMIN 또는 담당 팀이 있는 TEAM_ADMIN에게만 보임
- MASTER는 그룹 구성원이 아니므로 user-web의 그룹 화면을 쓰지 않고 system-web에서 관리
- 대표 GROUP_ADMIN/TEAM_ADMIN이 없으면 system-web 목록과 상세에 "대표 미지정" 배지가 표시됨
- 테스트: `packages/shared`에서 `pnpm test`, API 서버 실행 후 `node scripts/test-rules.mjs` (권한/소속 규칙 점검, 임시 데이터는 자동 정리)

## 가입 흐름

- 팀 코드 입력 → 상태 표시: 가입됨 / 승인 대기 중 / 거절됨(사유) / 없음
- 승인 대기 중인 요청은 팀 목록과 승인 대기 화면에서 "요청 취소" 가능
- 요청이 승인되기 전에는 팀 구성원 목록을 볼 수 없음 (팀 ADMIN, 그룹 ADMIN 제외)
- 거절 시 사유 필수. 거절된 팀은 "거절됨: 사유"로 표시되고 다시 요청할 수 있음

## 상태 (Status)

| 구분 | 값 | 위치 |
| --- | --- | --- |
| 계정 | `ACTIVE`, `DEACTIVATED` | `User.status` (정지와 비활성은 `DEACTIVATED`로 통합, 로그인 후 안내 화면만 표시) |
| 그룹 소속 | `APPROVED`, `LEFT`, `REMOVED`, `BLOCKED` | `GroupMembership.status` |
| 그룹 | `ACTIVE`, `SUSPENDED` | `Group.status` |
| 가입 요청 | `PENDING`, `APPROVED`, `REJECTED`, `CANCELED`, `EXPIRED` | `GroupMembershipRequest.status` |

## 코드 재발급 시 초기화

- 그룹 코드 재발급: 그룹의 모든 계정에서 그룹/팀 소속과 대표 지정을 초기화
- 팀 코드 재발급: 팀의 모든 계정에서 팀 소속과 팀 대표 지정을 초기화 (그룹 소속은 유지)

## 미구현

- 비밀번호 찾기: `POST /auth/password-reset`은 빈 구현 (메일 발송 서비스 연결 후 구현)
