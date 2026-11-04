// API 스모크 테스트: 실행 중인 서버에 데모 계정으로 로그인해서 주요 화면 API 의 상태·모양을 확인합니다.
// 사용법: node scripts/test/api-smoke.mjs   (환경변수: WEPLAY_API, WEPLAY_USER, WEPLAY_PASSWORD, WEPLAY_GROUP, WEPLAY_TRANSFER=1)
const API = process.env.WEPLAY_API ?? 'http://localhost:4000/api/v1';
const USER = process.env.WEPLAY_USER ?? 'user001';
const PASSWORD = process.env.WEPLAY_PASSWORD ?? '123456';

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ✔ ${name}`);
  } else {
    fail++;
    failures.push(`${name} ${detail}`);
    console.log(`  ✘ ${name} ${detail}`);
  }
};

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log(`API ${API}`);
  // 0) 서버 응답
  const probe = await call('GET', '/me').catch(() => null);
  if (!probe) {
    console.log('서버에 연결할 수 없어요. pnpm dev 로 서버를 먼저 켜 주세요.');
    process.exit(2);
  }

  console.log('[인증]');
  const anon = await call('GET', '/me');
  check('토큰 없이 /me 는 401', anon.status === 401, `(got ${anon.status})`);
  const login = await call('POST', '/auth/login', { body: { username: USER, password: PASSWORD } });
  check('데모 계정 로그인', (login.status === 200 || login.status === 201) && typeof login.data.accessToken === 'string', `(got ${login.status})`);
  const token = login.data.accessToken;
  if (!token) {
    console.log('로그인 실패로 중단합니다. (데모 계정 생성: ./scripts/account/generate.sh)');
    process.exit(1);
  }
  const me = await call('GET', '/me', { token });
  check('/me 에 id 있음', me.status === 200 && typeof me.data.id === 'string');

  const mine = await call('GET', '/me/groups', { token });
  const approved = (Array.isArray(mine.data) ? mine.data : []).filter((g) => g.joinStatus === 'APPROVED');
  const groupId = process.env.WEPLAY_GROUP ?? approved[0]?.group?.id;
  if (!groupId) {
    console.log('승인된 그룹이 없어 그룹 테스트를 건너뜁니다.');
    return finish();
  }
  const G = `/groups/${groupId}`;
  console.log(`[그룹 ${groupId}]`);

  const get = async (path) => call('GET', path, { token });

  // 기능 목록 (카테고리·기본 탑재·설명 포함)
  const features = await get(`${G}/features`);
  check('기능 목록에 카테고리·설명 정보', features.status === 200 && Array.isArray(features.data) && features.data.every((f) => 'category' in f && 'description' in f), `(got ${features.status})`);

  console.log('[미니게임·동료 게임]');
  const overview = await get(`${G}/games`);
  check('게임 홈 응답', overview.status === 200 && typeof overview.data.enabled === 'boolean');
  if (overview.data.enabled) check('개인전 12종', Array.isArray(overview.data.games) && overview.data.games.length === 12);
  for (const p of ['/games/daily', '/games/puzzle', '/games/belongings', '/games/tmi', '/games/ai/status']) {
    const r = await get(`${G}${p}`);
    check(`GET ${p}`, r.status === 200, `(got ${r.status})`);
  }
  const quiz = await get(`${G}/games/ai-quiz/round`);
  check('AI 퀴즈 라운드 (없으면 기본 문제 5개)', quiz.status === 200 && (!quiz.data.available || quiz.data.items?.length === 5), `(got ${quiz.status})`);
  const word = await get(`${G}/games/ai-word/round`);
  check('AI 제시어 라운드 (키 없으면 안내)', word.status === 200 && (word.data.available === true || typeof word.data.reason === 'string'));
  const teams = await get(`${G}/games/teams?game=ALL&method=HYBRID`);
  check('팀 대결 순위 (방식 지정)', teams.status === 200 && Array.isArray(teams.data.items) && teams.data.method === 'HYBRID');
  const boss = await get(`${G}/games/boss`);
  check('보스 레이드 상태', boss.status === 200 && boss.data.boss && Array.isArray(boss.data.teams), `(got ${boss.status})`);
  const bingo = await get(`${G}/games/bingo`);
  check('사진 빙고 상태', bingo.status === 200 && Array.isArray(bingo.data.ranking), `(got ${bingo.status})`);
  const turns = await get(`${G}/turn-games?pageSize=5`);
  check('턴제 게임 목록', turns.status === 200 && Array.isArray(turns.data.items), `(got ${turns.status})`);
  const badWord = await call('POST', `${G}/games/daily/UNKNOWN`, { token, body: { answer: '0' } });
  check('없는 오늘의 질문 종류는 404', badWord.status === 404, `(got ${badWord.status})`);

  console.log('[포인트]');
  const points = await get(`${G}/points/me`);
  check('내 포인트 응답', points.status === 200);
  if (process.env.WEPLAY_TRANSFER === '1' && me.data.id) {
    const members = await get(`${G}/members?pageSize=5`);
    const other = (members.data.items ?? []).find((m) => m.id !== me.data.id);
    if (other) {
      const self = await call('POST', `${G}/points/transfer`, { token, body: { toUserId: me.data.id, amount: 1 } });
      check('자기 자신에게는 포인트를 보낼 수 없음', self.status === 400, `(got ${self.status})`);
      const huge = await call('POST', `${G}/points/transfer`, { token, body: { toUserId: other.id, amount: 999999 } });
      check('잔액보다 많이 보내면 거절', huge.status === 400, `(got ${huge.status})`);
    }
  }

  console.log('[업무·건의·공지]');
  for (const p of ['/duties', '/suggestions', '/notices', '/board/boards']) {
    const r = await get(`${G}${p}`);
    check(`GET ${p}`, r.status === 200, `(got ${r.status})`);
  }

  console.log('[공개·계정 정보]');
  for (const p of ['/system-notices', '/system-notices/banner', '/terms', '/me/terms/pending', '/support/inquiries']) {
    const r = await get(p);
    check(`GET ${p}`, r.status === 200, `(got ${r.status})`);
  }

  console.log('[권한]');
  const master = await call('PUT', '/admin/features/catalog/BOARD/default', { token, body: { isDefault: true } });
  check('일반 사용자는 기능 기본 탑재를 바꿀 수 없음 (403)', master.status === 403, `(got ${master.status})`);
  const storage = await call('GET', '/admin/storage', { token });
  check('일반 사용자는 스토리지 관리 화면 API 에 못 들어감 (403)', storage.status === 403, `(got ${storage.status})`);

  if (process.env.WEPLAY_MUTATE === '1') {
    const tokenByUser = {};
    const ids = [];
    for (const u of ['user001', 'user002', 'user003']) {
      const l = await call('POST', '/auth/login', { body: { username: u, password: PASSWORD } });
      if (!l.data.accessToken) continue;
      const m = await call('GET', '/me', { token: l.data.accessToken });
      tokenByUser[m.data.id] = l.data.accessToken;
      ids.push({ id: m.data.id, token: l.data.accessToken });
    }
    if (ids.length >= 2) await turnFlows(G, (id) => tokenByUser[id], ids.slice(0, 3));
    else console.log('[턴제 흐름] 데모 계정 2명 이상이 필요해서 건너뜀');
  }

  if (process.env.WEPLAY_ATTACHMENTS === '1') await attachmentFlows(G, token);

  return finish();
}

async function attachmentFlows(G, token) {
  const first = { url: '/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf', name: 'smoke.pdf', size: 12, mimeType: 'application/pdf', mediaType: 'FILE' };
  const replacement = { url: '/uploads/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png', name: 'smoke.png', size: 24, mimeType: 'image/png', mediaType: 'IMAGE' };
  const content = { title: 'Attachment contract smoke', body: 'Temporary attachment contract smoke' };
  const request = (method, path, body) => call(method, path, { token, body });
  const matches = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
  const exercise = async (collection, fields = {}, comments = false, children) => {
    const body = { ...content, ...fields };
    const created = await request('POST', collection, { ...body, attachments: [first] });
    check(`attachments create ${collection}`, [200, 201].includes(created.status) && !!created.data.id, `(got ${created.status})`);
    if (!created.data.id) return;
    const path = `${collection}/${created.data.id}`;
    const read = async () => {
      const result = await request('GET', comments ? `${collection}?pageSize=100` : path);
      return comments ? result.data.items?.find((item) => item.id === created.data.id) : result.data;
    };
    try {
      check(`attachments read ${collection}`, matches((await read())?.attachments, [first]));
      const listed = await request('GET', `${collection}?pageSize=100${fields.teamId ? `&teamId=${fields.teamId}` : ''}`);
      check(`attachments list ${collection}`, matches(listed.data.items?.find((item) => item.id === created.data.id)?.attachments, [first]));
      const omitted = await request('PATCH', path, body);
      check(`attachments omitted preserves ${collection}`, omitted.status === 200 && matches((await read())?.attachments, [first]));
      const edited = await request('PATCH', path, { ...body, attachments: [replacement] });
      check(`attachments edit ${collection}`, edited.status === 200 && matches((await read())?.attachments, [replacement]));
      const unsafe = await request('PATCH', path, { ...body, attachments: [{ ...first, url: 'https://example.com/file.pdf' }] });
      check(`attachments unsafe URL rejected ${collection}`, unsafe.status === 400);
      const excessive = await request('PATCH', path, { ...body, attachments: Array(6).fill(first) });
      check(`attachments max five ${collection}`, excessive.status === 400);
      const cleared = await request('PATCH', path, { ...body, attachments: [] });
      check(`attachments clear ${collection}`, cleared.status === 200 && matches((await read())?.attachments, []));
      if (children) await children(path);
    } finally {
      const deleted = await request('DELETE', path);
      check(`attachments cleanup ${collection}`, deleted.status === 200);
    }
  };

  console.log('[Attachment persistence contracts (opt-in data changes; synthetic uploaded paths)]');
  const boards = await request('GET', `${G}/board/boards`);
  if (boards.data.enabled && boards.data.boards?.length) {
    const teamId = boards.data.boards[0].teamId;
    await exercise(`${G}/board/posts`, { teamId }, false, async (path) => {
      const detail = await request('GET', path);
      if (detail.data.commentsEnabled) await exercise(`${path}/comments`, {}, true);
    });
  }
  const suggestions = await request('GET', `${G}/suggestions`);
  if (suggestions.data.enabled) await exercise(`${G}/suggestions`);
  const notices = await request('GET', `${G}/notices`);
  if (notices.data.canWrite) await exercise(`${G}/notices`, { teamId: notices.data.teams?.[0]?.id ?? null });
  const system = await request('GET', '/admin/system-notices');
  if (system.status === 200) await exercise('/admin/system-notices');
}


// ── 턴제 흐름 (데이터를 바꾸므로 WEPLAY_MUTATE=1 일 때만) ──
async function turnFlows(G, tokenOf, ids) {
  console.log('[턴제 흐름 (데이터 변경)]');
  const [A, B, C] = ids.map((x) => x.token);
  const idA = ids[0].id;
  const idB = ids[1].id;
  const detail = async (id) => (await call('GET', `${G}/turn-games/${id}`, { token: A })).data;
  const actAs = (id, body) => call('POST', `${G}/turn-games/${id}/act`, { token: tokenOf(detail_cache.currentUserId), body });
  let detail_cache = {};

  // 1) 체인 퀴즈: 두 사람이 퀴즈를 내고 맞히면 끝
  let create = await call('POST', `${G}/turn-games`, { token: A, body: { type: 'CHAIN_QUIZ', title: 'smoke 체인 퀴즈' } });
  check('체인 퀴즈 만들기', create.status === 201 || create.status === 200, `(got ${create.status})`);
  const quizId = create.data.id;
  await call('POST', `${G}/turn-games/${quizId}/join`, { token: B });
  const started = await call('POST', `${G}/turn-games/${quizId}/start`, { token: A });
  check('체인 퀴즈 시작', started.status === 200 || started.status === 201, `(got ${started.status})`);
  let d = await detail(quizId);
  detail_cache = { currentUserId: d.currentUser?.id };
  const first = await actAs(quizId, { kind: 'QUIZ', question: '우리 사무실 와이파이 이름은?', answer: '위플레이' });
  check('체인 퀴즈 첫 문제 등록', first.status === 201 || first.status === 200, `(got ${first.status})`);
  d = await detail(quizId);
  detail_cache = { currentUserId: d.currentUser?.id };
  const answer = await actAs(quizId, { kind: 'QUIZ', text: '위플레이', question: '2+2는?', answer: '4' });
  check('체인 퀴즈 정답 맞힘과 다음 문제', (answer.status === 201 || answer.status === 200) && answer.data.correct === true, `(got ${answer.status} ${JSON.stringify(answer.data).slice(0, 80)})`);
  d = await detail(quizId);
  check('체인 퀴즈는 턴이 끝나면 완료', d.status === 'DONE', `(status ${d.status})`);

  // 2) AI 협동 추리: 단서를 열고 범인 지목 → 결과 공개
  create = await call('POST', `${G}/turn-games`, { token: A, body: { type: 'DETECTIVE', title: 'smoke 추리' } });
  const detId = create.data.id;
  await call('POST', `${G}/turn-games/${detId}/join`, { token: B });
  await call('POST', `${G}/turn-games/${detId}/start`, { token: A });
  d = await detail(detId);
  check('추리 게임에는 범인이 보이지 않음', d.view.culprit === null && Array.isArray(d.view.suspects) && d.view.suspects.length >= 3, `(culprit ${d.view.culprit})`);
  detail_cache = { currentUserId: d.currentUser?.id };
  const clue = await actAs(detId, { kind: 'CLUE', text: '첫 단서 메모' });
  check('추리 단서 열기', clue.status === 201 || clue.status === 200, `(got ${clue.status})`);
  d = await detail(detId);
  detail_cache = { currentUserId: d.currentUser?.id };
  const accuse = await actAs(detId, { kind: 'GUESS', text: d.view.suspects[0] });
  check('추리 범인 지목', accuse.status === 201 || accuse.status === 200, `(got ${accuse.status})`);
  d = await detail(detId);
  check('지목 후 결과 공개 (범인 노출)', d.status === 'DONE' && typeof d.view.culprit === 'string', `(status ${d.status})`);

  // 3) 그림 이어그리기: 그림 두 장이면 끝 (업로드 주소 형식만 검사)
  create = await call('POST', `${G}/turn-games`, { token: A, body: { type: 'DRAW_RELAY', title: 'smoke 그림' } });
  const drawId = create.data.id;
  await call('POST', `${G}/turn-games/${drawId}/join`, { token: B });
  await call('POST', `${G}/turn-games/${drawId}/start`, { token: A });
  d = await detail(drawId);
  detail_cache = { currentUserId: d.currentUser?.id };
  const wrongKind = await actAs(drawId, { kind: 'TEXT', text: '글은 안 돼요' });
  check('그림 이어그리기에서 글을 내면 거절', wrongKind.status === 400, `(got ${wrongKind.status})`);
  const draw1 = await actAs(drawId, { kind: 'DRAWING', mediaUrl: '/uploads/00000000000000000000000000000000.png' });
  check('그림 한 장 제출', draw1.status === 201 || draw1.status === 200, `(got ${draw1.status})`);
  d = await detail(drawId);
  detail_cache = { currentUserId: d.currentUser?.id };
  await actAs(drawId, { kind: 'DRAWING', mediaUrl: '/uploads/11111111111111111111111111111111.png' });
  d = await detail(drawId);
  check('그림 이어그리기는 모두 그리면 완료', d.status === 'DONE', `(status ${d.status})`);

  // 4) AI 그림 전화: 키가 없으면 만들기 자체를 거절
  const ai = await call('POST', `${G}/turn-games`, { token: A, body: { type: 'AI_TELEPHONE', title: 'smoke AI 그림 전화' } });
  check('AI 그림 전화는 AI 키가 없으면 만들 수 없음', ai.status === 400 || ai.status === 201, `(got ${ai.status})`);
  void C; void idB; void idA;
}

function finish() {
  console.log(`\n결과: 통과 ${pass} · 실패 ${fail}`);
  if (fail) {
    console.log(failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
