import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatJoinCode, isValidJoinCodeFormat, normalizeJoinCode } from '../src/join-code';
import { adminCreateUserSchema, rejectRequestSchema, signupSchema, userMembershipsSchema } from '../src/schemas';

test('join code: 영문 대문자와 숫자만 허용, 입력 정규화', () => {
  assert.equal(normalizeJoinCode(' ab01-cd23 '), 'AB01CD23');
  assert.equal(isValidJoinCodeFormat('AB01CD23'), true);
  assert.equal(isValidJoinCodeFormat('AB01CD2!'), false);
  assert.equal(isValidJoinCodeFormat('AB01CD2'), false);
  assert.equal(formatJoinCode('AB01CD23'), 'AB01-CD23');
});

test('거절 사유는 필수 (공백만 입력해도 거부)', () => {
  assert.equal(rejectRequestSchema.safeParse({ reason: '   ' }).success, false);
  assert.equal(rejectRequestSchema.safeParse({ reason: '인원 마감' }).success, true);
});

test('가입/계정 생성은 이메일 아이디와 8자 이상 비밀번호 필요', () => {
  const base = { email: 'User@Example.com', name: '테스트', password: '12345678' };
  const ok = signupSchema.parse(base);
  assert.equal(ok.email, 'user@example.com');
  assert.equal(signupSchema.safeParse({ ...base, password: '1234567' }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, email: 'not-email' }).success, false);
  assert.equal(adminCreateUserSchema.parse(base).platformRole, 'USER');
});

test('소속 지정 값은 그룹/팀 ID와 역할만 허용', () => {
  const valid = { groups: [{ groupId: 'g1', role: 'ADMIN' }], teams: [{ teamId: 't1', role: 'USER' }] };
  assert.equal(userMembershipsSchema.safeParse(valid).success, true);
  assert.equal(userMembershipsSchema.safeParse({ groups: [{ groupId: 'g1', role: 'MASTER' }], teams: [] }).success, false);
});
