import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BINGO_MISSIONS, dailyGameKey, GAMES, gameByKey, teamMedian, teamScore, TEAM_METHODS, TURN_GAMES, turnGameDef, weeklyGameKey } from '../src/games';
import { AI_QUIZ_BANK, BALANCE_PROMPTS, CASE_BANK, PUZZLE_THEMES, ROLLING_TEMPLATES, SOCIAL_GAMES, TELEPATHY_PROMPTS, WORD_BANK } from '../src/social';
import { addDays, dayIndex, kstDate, weekStart } from '../src/kst';
import { DUTY_PERIODS, nextPeriod, periodIndex, periodStart } from '../src/duty';
import { defaultSettings, FEATURE_SETTINGS, normalizeSettings } from '../src/feature-settings';
import { FeatureKey } from '../src/enums';

test('팀 점수: 1명만 고득점해도 인원이 많은 팀이 참여 많으면 이김 (총점 방식 방지)', () => {
  const lone = teamScore([100], 50, 5, 30);
  const crowd = teamScore(Array(40).fill(90), 50, 5, 30);
  assert.ok(crowd.score > lone.score, `crowd ${crowd.score} should beat lone ${lone.score}`);
  assert.equal(crowd.k, 5);
  assert.equal(crowd.participation, 80);
});

test('팀 점수: 작은 팀(5명)은 상위 절반(3명)만 반영, 빈 자리는 0점', () => {
  const r = teamScore([100], 5, 5, 30);
  assert.equal(r.k, 3);
  assert.equal(r.performance, 33.33);
  assert.equal(r.participation, 20);
  assert.ok(Math.abs(r.score - (0.7 * 33.33 + 0.3 * 20)) < 0.01);
});

test('팀 점수: 참여율은 100%를 넘지 않고, 점수는 항상 0~100 범위', () => {
  assert.equal(teamScore(Array(60).fill(50), 50, 5, 30).participation, 100);
  for (let i = 0; i < 300; i++) {
    const n = Math.floor(Math.random() * 60);
    const bests = Array.from({ length: n }, () => Math.random() * 100);
    const size = 1 + Math.floor(Math.random() * 80);
    const r = teamScore(bests, size, 1 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 80));
    assert.ok(r.score >= 0 && r.score <= 100, `score out of range: ${r.score}`);
  }
});

test('팀 중앙값: 상위 K명 중앙값, 한 명의 초고득점에 흔들리지 않음', () => {
  assert.equal(teamMedian([10, 20, 90, 95, 100], 10, 5).median, 90);
  assert.equal(teamMedian([100, 1], 2, 5).k, 1);
});

test('순위 방식 목록: 중복 없이 5개, 각 방식에 허점 설명이 있음', () => {
  assert.equal(TEAM_METHODS.length, 5);
  assert.equal(new Set(TEAM_METHODS.map((m) => m.key)).size, 5);
  for (const m of TEAM_METHODS) assert.ok(m.weakness.length > 0);
});

test('개인전 게임: 점수 변환은 0~100으로 고정, 키는 고유, 찾기 가능', () => {
  assert.equal(new Set(GAMES.map((g) => g.key)).size, GAMES.length);
  for (const g of GAMES) {
    for (const v of [g.min, g.max, (g.min + g.max) / 2]) {
      const s = g.toScore(v);
      assert.ok(s >= 0 && s <= 100, `${g.key} score ${s} at ${v}`);
    }
    assert.ok(g.format(g.min).length > 0);
    assert.equal(gameByKey(g.key)?.key, g.key);
  }
  assert.equal(GAMES.length, 12, '개인전은 12종');
});

test('오늘의·주간 챌린지: 같은 날짜는 같은 게임, 동료 사진 게임은 제외', () => {
  assert.equal(dailyGameKey('2026-11-02'), dailyGameKey('2026-11-02'));
  const keys = new Set<string>();
  for (let i = 0; i < 28; i++) {
    const d = addDays('2026-11-01', i);
    const k = dailyGameKey(d);
    assert.notEqual(gameByKey(k)?.kind, 'SOCIAL');
    keys.add(k);
    assert.ok(gameByKey(weeklyGameKey(d)));
  }
  assert.ok(keys.size >= 5, '2주 동안 여러 게임이 돌아가야 함');
});

test('턴제 게임: 키 고유, 최소 인원 1명 이상, AI 단계 표시', () => {
  assert.equal(new Set(TURN_GAMES.map((g) => g.key)).size, TURN_GAMES.length);
  for (const g of TURN_GAMES) assert.ok(g.min >= 1);
  assert.equal(turnGameDef('AI_TELEPHONE')?.ai, 'CORE');
  assert.equal(turnGameDef('CHAIN_QUIZ')?.ai, 'NONE');
  assert.equal(turnGameDef('DETECTIVE')?.ai, 'OPTIONAL');
});

test('콘텐츠 은행: 빙고 미션 16개 이상, 퍼즐 그림 16칸, 제시어 4개 이상', () => {
  assert.ok(BINGO_MISSIONS.length >= 16);
  for (const t of PUZZLE_THEMES) assert.equal(t.tiles.length, 16, t.key);
  assert.ok(WORD_BANK.length >= 4);
});

test('사건 추리: 범인은 용의자 중 한 명, 단서는 5개, 용의자는 3~4명', () => {
  for (const c of CASE_BANK) {
    assert.ok(c.suspects.includes(c.culprit), c.title);
    assert.equal(c.clues.length, 5, c.title);
    assert.ok(c.suspects.length >= 3 && c.suspects.length <= 4, c.title);
    assert.equal(new Set(c.suspects).size, c.suspects.length, c.title);
  }
});

test('AI 퀴즈 은행: 보기 4개(중복 없음), 정답 번호 0~3', () => {
  for (const q of AI_QUIZ_BANK) {
    assert.equal(q.choices.length, 4, q.question);
    assert.equal(new Set(q.choices).size, 4, q.question);
    assert.ok(q.answer >= 0 && q.answer <= 3, q.question);
  }
});

test('오늘의 질문: 텔레파시 보기 2개 이상, 밸런스 A와 B는 서로 다름', () => {
  for (const p of TELEPATHY_PROMPTS) assert.ok(p.options.length >= 2, p.key);
  for (const p of BALANCE_PROMPTS) assert.notEqual(p.a, p.b, p.key);
  assert.equal(new Set(TELEPATHY_PROMPTS.map((p) => p.key)).size, TELEPATHY_PROMPTS.length);
});

test('동료 게임·롤링 템플릿: 키 고유, 템플릿마다 제목과 문구', () => {
  assert.equal(new Set(SOCIAL_GAMES.map((g) => g.path)).size, SOCIAL_GAMES.length);
  for (const g of SOCIAL_GAMES) assert.ok(['NONE', 'OPTIONAL', 'CORE'].includes(g.ai));
  assert.equal(new Set(ROLLING_TEMPLATES.map((t) => t.key)).size, ROLLING_TEMPLATES.length);
  for (const t of ROLLING_TEMPLATES) assert.ok(t.title && t.message);
});

test('KST 날짜: 자정 경계, 날짜 더하기, 주 시작은 월요일', () => {
  assert.equal(kstDate(new Date('2026-10-31T15:30:00Z')), '2026-11-01');
  assert.equal(kstDate(new Date('2026-10-31T14:59:00Z')), '2026-10-31');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  for (let i = 0; i < 14; i++) {
    const d = addDays('2026-11-01', i);
    const ws = weekStart(d);
    assert.equal(new Date(`${ws}T00:00:00Z`).getUTCDay(), 1, `${ws} must be Monday`);
    assert.ok(dayIndex(d) - dayIndex(ws) >= 0 && dayIndex(d) - dayIndex(ws) < 7);
  }
});

test('공통 업무 주기: 매주·2주·매달 기간 시작과 순번', () => {
  assert.deepEqual(DUTY_PERIODS.map((p) => p.key), ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']);
  assert.equal(periodStart('2026-11-04', 'WEEKLY', '2026-11-02'), '2026-11-02');
  assert.equal(nextPeriod('2026-11-02', 'WEEKLY'), '2026-11-09');
  assert.equal(periodStart('2026-11-09', 'BIWEEKLY', '2026-11-02'), '2026-11-02');
  assert.equal(periodStart('2026-11-16', 'BIWEEKLY', '2026-11-02'), '2026-11-16');
  assert.equal(periodIndex('2026-11-16', 'BIWEEKLY', '2026-11-02'), 1);
  assert.equal(periodStart('2026-11-15', 'MONTHLY', '2026-11-02'), '2026-11-01');
  assert.equal(nextPeriod('2026-12-01', 'MONTHLY', 2), '2027-02-01');
});

test('미니게임 설정: 기본값은 정의와 같고, 범위를 벗어난 값은 보정됨', () => {
  const defaults = defaultSettings(FeatureKey.MINI_GAMES);
  assert.deepEqual(normalizeSettings(FeatureKey.MINI_GAMES, {}), defaults);
  const clamped = normalizeSettings(FeatureKey.MINI_GAMES, { dailyLimit: 99999, unknownKey: 1 });
  assert.ok(Number(clamped.dailyLimit) <= 50);
  assert.equal('unknownKey' in clamped, false);
  assert.ok(FEATURE_SETTINGS.MINI_GAMES.some((f) => f.key === 'aiImageDaily'));
});
