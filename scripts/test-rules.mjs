#!/usr/bin/env node
// 권한/소속 규칙 점검 스크립트. 실행 중인 API 서버(기본 4000)에 임시 그룹/팀/계정을 만들고 정리한다.
// 사용법: node scripts/test-rules.mjs   (API_URL, MASTER_ID, MASTER_PW 환경변수로 변경 가능)
const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const MASTER_ID = process.env.MASTER_ID ?? 'master';
const MASTER_PW = process.env.MASTER_PW ?? '1234';
const stamp = Date.now().toString(36);

let failed = 0;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
};

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, code: data?.error?.code };
}

const login = async (username, password) => (await call('POST', '/auth/login', null, { username, password })).data.accessToken;

const master = (await call('POST', '/auth/master/login', null, { username: MASTER_ID, password: MASTER_PW })).data.accessToken;
if (!master) {
  console.error('마스터 로그인 실패: API 서버와 계정을 확인하세요');
  process.exit(1);
}

const createdUsers = [];
const mkUser = async (tag) => {
  const email = `rule-${stamp}-${tag}@example.com`;
  const r = await call('POST', '/admin/users', master, { email, name: `규칙${tag}`, password: '12345678' });
  createdUsers.push(r.data.id);
  return { id: r.data.id, email, token: await login(email, '12345678') };
};

const group = (await call('POST', '/admin/groups', master, { name: `규칙검증${stamp}` })).data;
const teamA = (await call('POST', `/admin/groups/${group.id}/teams`, master, { name: '검증A' })).data;
const teamB = (await call('POST', `/admin/groups/${group.id}/teams`, master, { name: '검증B' })).data;
const group2 = (await call('POST', '/admin/groups', master, { name: `규칙검증2${stamp}` })).data;

const a = await mkUser('a');
const b = await mkUser('b');

try {
  // 1) 1계정 1팀: 두 팀 동시 지정은 거부
  let r = await call('PUT', `/admin/users/${a.id}/memberships`, master, {
    groups: [{ groupId: group.id, role: 'USER' }],
    teams: [{ teamId: teamA.id, role: 'USER' }, { teamId: teamB.id, role: 'USER' }],
  });
  check('두 팀 동시 지정은 거부', r.status === 400, `${r.status} ${r.code}`);

  // 2) 1계정 1팀: 한 팀 지정 후 두 번째 팀은 409
  r = await call('PUT', `/admin/users/${a.id}/memberships`, master, { groups: [{ groupId: group.id, role: 'USER' }], teams: [{ teamId: teamA.id, role: 'USER' }] });
  check('한 팀 지정 성공', r.status === 200, `${r.status}`);
  r = await call('PUT', `/admin/teams/${teamB.id}/primary-admin`, master, { userId: a.id });
  check('두 번째 팀 대표 지정은 거부 (1계정 1팀)', r.status === 409 && r.code === 'ONE_TEAM_ONLY', `${r.status} ${r.code}`);

  // 3) 1계정 1그룹: 다른 그룹 지정은 409
  r = await call('POST', `/admin/users/${a.id}/groupMemberships`, master, { groupId: group2.id, role: 'USER' });
  check('두 번째 그룹 지정은 거부 (1계정 1그룹)', r.status === 409 && r.code === 'ONE_GROUP_ONLY', `${r.status} ${r.code}`);

  // 4) 대표 보호: 대표 TEAM_ADMIN은 강등 불가
  await call('PUT', `/admin/users/${a.id}/team-admin`, master, { teamId: teamA.id, role: 'ADMIN' });
  r = await call('PUT', `/admin/teams/${teamA.id}/primary-admin`, master, { userId: a.id });
  check('팀 대표 지정', r.status === 200, `${r.status}`);
  r = await call('PUT', `/admin/users/${a.id}/team-admin`, master, { teamId: teamA.id, role: 'USER' });
  check('대표 TEAM_ADMIN 강등은 거부', r.status === 400 && r.code === 'PRIMARY_ADMIN_PROTECTED', `${r.status} ${r.code}`);

  // 5) 팀 코드 재발급: 팀 소속만 초기화, 그룹 소속은 유지
  const before = (await call('GET', `/admin/users/${a.id}`, master)).data;
  check('재발급 전 팀/그룹 소속 존재', before.teamMembers.length === 1 && before.groupMemberships.length === 1);
  await call('POST', `/admin/teams/${teamA.id}/join-code/rotate`, master);
  const afterTeam = (await call('GET', `/admin/users/${a.id}`, master)).data;
  check('팀 코드 재발급 시 팀 소속 초기화', afterTeam.teamMembers.length === 0);
  check('팀 코드 재발급 시 그룹 소속 유지', afterTeam.groupMemberships.length === 1);

  // 6) 그룹 코드 재발급: 그룹/팀 소속 모두 초기화
  await call('PUT', `/admin/users/${a.id}/memberships`, master, { groups: [{ groupId: group.id, role: 'USER' }], teams: [{ teamId: teamA.id, role: 'USER' }] });
  await call('POST', `/admin/groups/${group.id}/join-code/rotate`, master);
  const afterGroup = (await call('GET', `/admin/users/${a.id}`, master)).data;
  check('그룹 코드 재발급 시 그룹/팀 소속 초기화', afterGroup.groupMemberships.length === 0 && afterGroup.teamMembers.length === 0);

  // 7) 가입 거절: 사유 필수
  const groupCode = (await call('GET', `/admin/groups/${group.id}`, master)).data.joinCode;
  r = await call('POST', '/join/requests', b.token, { groupCode, teamCodes: [], teamIds: [] });
  const reqId = r.data?.request?.id;
  check('가입 요청 생성', !!reqId, `${r.status} ${r.code}`);
  if (reqId) {
    r = await call('POST', `/admin/requests/${reqId}/reject`, master, { reason: '   ' });
    check('거절 사유 공백은 거부', r.status === 400, `${r.status}`);
    r = await call('POST', `/admin/requests/${reqId}/reject`, master, { reason: '검증 사유' });
    check('거절 사유 입력 시 거절', r.status === 201, `${r.status}`);
    const mine = (await call('GET', '/me/requests', b.token)).data;
    check('신청자에게 거절 사유 노출', Array.isArray(mine) && mine.some((x) => x.reviewNote === '검증 사유'));
  }

  // 8) 비활성 계정: 로그인 후 /me만 허용
  await call('PATCH', `/admin/users/${b.id}`, master, { status: 'DEACTIVATED' });
  const bToken = await login(b.email, '12345678');
  check('비활성 계정도 로그인은 됨', !!bToken);
  check('비활성 계정은 /me 허용', (await call('GET', '/me', bToken)).status === 200);
  check('비활성 계정은 /me/groups 차단', (await call('GET', '/me/groups', bToken)).status === 403);
} finally {
  // 정리: 임시 계정과 그룹 삭제
  for (const id of createdUsers) await call('DELETE', `/admin/users/${id}`, master);
  await call('DELETE', `/admin/groups/${group.id}`, master);
  await call('DELETE', `/admin/groups/${group2.id}`, master);
}

console.log(`\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
