import { z } from 'zod';

export const googleLoginSchema = z.object({ credential: z.string().min(10) });
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const masterLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type MasterLoginInput = z.infer<typeof masterLoginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4).max(100),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({ name: z.string().min(1).max(50) });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const joinLookupSchema = z.object({ code: z.string().min(1) });
export type JoinLookupInput = z.infer<typeof joinLookupSchema>;

export const createJoinRequestSchema = z
  .object({
    companyCode: z.string().optional(),
    groupCodes: z.array(z.string()).max(10).default([]),
    groupIds: z.array(z.string()).max(20).default([]), // 회사 코드로 조회된 공개 그룹 중 선택
    message: z.string().max(300).optional(),
  })
  .refine((v) => !!v.companyCode || v.groupCodes.length > 0, {
    message: '회사 코드 또는 그룹 코드가 필요합니다',
  });
export type CreateJoinRequestInput = z.infer<typeof createJoinRequestSchema>;

export const approveRequestSchema = z.object({
  role: z.enum(['ADMIN', 'USER']).optional(),
  groupIds: z.array(z.string()).optional(),
});
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;

export const rejectRequestSchema = z.object({ reason: z.string().max(300).optional() });
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;

export const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  joinCodeEnabled: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  requireApproval: z.boolean().default(true),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  joinCodeEnabled: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  requireApproval: z.boolean().optional(),
});
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const setUserIdSchema = z.object({ userId: z.string().min(1) });
export type SetUserIdInput = z.infer<typeof setUserIdSchema>;

export const createMasterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.-]+$/),
  name: z.string().min(1).max(50),
  password: z.string().min(4).max(100),
});
export type CreateMasterInput = z.infer<typeof createMasterSchema>;

export const setUserStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const setMemberRoleSchema = z.object({ role: z.enum(['ADMIN', 'USER']) });
export type SetMemberRoleInput = z.infer<typeof setMemberRoleSchema>;
