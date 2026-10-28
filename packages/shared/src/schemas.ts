import { z } from 'zod';

export const googleLoginSchema = z.object({ credential: z.string().min(10) });
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const masterLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type MasterLoginInput = z.infer<typeof masterLoginSchema>;

const passwordSchema = z.string().min(8).max(100);
const emailSchema = z.string().email().max(100).transform((v) => v.toLowerCase());
const phoneSchema = z.string().regex(/^[0-9+\-() ]{7,20}$/);
const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const localLoginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
export type LocalLoginInput = z.infer<typeof localLoginSchema>;

/** 계정 공통 필드. 아이디는 이메일 형식이며 로그인 ID(username)로도 사용 */
export const accountFieldsSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(50),
  birthDate: birthDateSchema.nullable().optional(),
  phone: phoneSchema.nullable().optional(),
});

export const signupSchema = accountFieldsSchema.extend({ password: passwordSchema });
export type SignupInput = z.infer<typeof signupSchema>;

export const adminCreateUserSchema = signupSchema.extend({ platformRole: z.enum(['USER', 'MASTER']).default('USER') });
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const updateUserSchema = accountFieldsSchema.partial().extend({
  password: passwordSchema.optional(),
  platformRole: z.enum(['USER', 'MASTER']).optional(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** 계정의 그룹/팀 소속 전체 값 (저장 시 이 목록으로 맞춤) */
export const userMembershipsSchema = z.object({
  groups: z.array(z.object({ groupId: z.string().min(1), role: z.enum(['ADMIN', 'USER']) })).max(1), // 계정은 한 그룹만
  teams: z.array(z.object({ teamId: z.string().min(1), role: z.enum(['ADMIN', 'USER']) })).max(1), // 계정은 한 팀만
});
export type UserMembershipsInput = z.infer<typeof userMembershipsSchema>;

export const resetPasswordSchema = z.object({ password: passwordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const deactivateSchema = z.object({ password: z.string().optional() });
export type DeactivateInput = z.infer<typeof deactivateSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(), // 비밀번호가 없는 계정(Google 전용)은 생략
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({ name: z.string().min(1).max(50) });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const joinLookupSchema = z.object({ code: z.string().min(1) });
export type JoinLookupInput = z.infer<typeof joinLookupSchema>;

export const createJoinRequestSchema = z
  .object({
    groupCode: z.string().optional(),
    teamCodes: z.array(z.string()).max(10).default([]),
    teamIds: z.array(z.string()).max(20).default([]), // 그룹 코드로 조회된 공개 팀 중 선택
    message: z.string().max(300).optional(),
  })
  .refine((v) => !!v.groupCode || v.teamCodes.length > 0, {
    message: '그룹 코드 또는 팀 코드가 필요합니다',
  });
export type CreateJoinRequestInput = z.infer<typeof createJoinRequestSchema>;

export const approveRequestSchema = z.object({
  role: z.enum(['ADMIN', 'USER']).optional(),
  teamIds: z.array(z.string()).optional(),
});
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;

export const rejectRequestSchema = z.object({ reason: z.string().trim().min(1, '거절 사유를 입력하세요').max(300) });
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  joinCodeEnabled: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  requireApproval: z.boolean().default(true),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  joinCodeEnabled: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  requireApproval: z.boolean().optional(),
});
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const setUserIdSchema = z.object({ userId: z.string().min(1) });
export type SetUserIdInput = z.infer<typeof setUserIdSchema>;

export const createMasterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(50),
  password: z.string().min(4).max(100),
});
export type CreateMasterInput = z.infer<typeof createMasterSchema>;

export const userStatusSchema = z.enum(['ACTIVE', 'DEACTIVATED']);
export const setUserStatusSchema = z.object({ status: userStatusSchema });
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const setMemberRoleSchema = z.object({ role: z.enum(['ADMIN', 'USER']) });
export type SetMemberRoleInput = z.infer<typeof setMemberRoleSchema>;

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
