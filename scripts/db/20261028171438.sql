--
-- PostgreSQL database dump
--

\restrict Q6KSaSMndC1esKXw6ESBHnCgh9egJWo6dal4SuNhwU1djDEF6CMiDDAzJFetXpL

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: GroupMembershipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GroupMembershipStatus" AS ENUM (
    'APPROVED',
    'LEFT',
    'REMOVED',
    'BLOCKED'
);


--
-- Name: GroupRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GroupRole" AS ENUM (
    'ADMIN',
    'USER'
);


--
-- Name: GroupStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GroupStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);


--
-- Name: PlatformRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlatformRole" AS ENUM (
    'USER',
    'MASTER'
);


--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELED',
    'EXPIRED'
);


--
-- Name: RequestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestType" AS ENUM (
    'GROUP_JOIN',
    'TEAM_JOIN'
);


--
-- Name: TeamRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TeamRole" AS ENUM (
    'ADMIN',
    'USER'
);


--
-- Name: TeamVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TeamVisibility" AS ENUM (
    'PUBLIC',
    'PRIVATE'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'DEACTIVATED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "groupId" text,
    "actorId" text,
    action text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    before jsonb,
    after jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Group" (
    id text CONSTRAINT "Company_id_not_null" NOT NULL,
    name text CONSTRAINT "Company_name_not_null" NOT NULL,
    description text,
    "joinCode" text CONSTRAINT "Company_joinCode_not_null" NOT NULL,
    "joinCodeRotatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Company_joinCodeRotatedAt_not_null" NOT NULL,
    "joinCodeEnabled" boolean DEFAULT true CONSTRAINT "Company_joinCodeEnabled_not_null" NOT NULL,
    status public."GroupStatus" DEFAULT 'ACTIVE'::public."GroupStatus" CONSTRAINT "Company_status_not_null" NOT NULL,
    "primaryAdminId" text,
    "createdById" text CONSTRAINT "Company_createdById_not_null" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Company_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp(3) without time zone CONSTRAINT "Company_updatedAt_not_null" NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: GroupMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupMembership" (
    id text CONSTRAINT "Membership_id_not_null" NOT NULL,
    "userId" text CONSTRAINT "Membership_userId_not_null" NOT NULL,
    "groupId" text CONSTRAINT "Membership_companyId_not_null" NOT NULL,
    role public."GroupRole" DEFAULT 'USER'::public."GroupRole" CONSTRAINT "Membership_role_not_null" NOT NULL,
    status public."GroupMembershipStatus" DEFAULT 'APPROVED'::public."GroupMembershipStatus" CONSTRAINT "Membership_status_not_null" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Membership_joinedAt_not_null" NOT NULL,
    "leftAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone CONSTRAINT "Membership_updatedAt_not_null" NOT NULL
);


--
-- Name: GroupMembershipRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupMembershipRequest" (
    id text CONSTRAINT "MembershipRequest_id_not_null" NOT NULL,
    type public."RequestType" CONSTRAINT "MembershipRequest_type_not_null" NOT NULL,
    "userId" text CONSTRAINT "MembershipRequest_userId_not_null" NOT NULL,
    "groupId" text CONSTRAINT "MembershipRequest_companyId_not_null" NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" CONSTRAINT "MembershipRequest_status_not_null" NOT NULL,
    message text,
    "reviewerId" text,
    "reviewNote" text,
    "reviewedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone CONSTRAINT "MembershipRequest_expiresAt_not_null" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "MembershipRequest_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp(3) without time zone CONSTRAINT "MembershipRequest_updatedAt_not_null" NOT NULL
);


--
-- Name: MembershipRequestTeam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MembershipRequestTeam" (
    "requestId" text CONSTRAINT "MembershipRequestGroup_requestId_not_null" NOT NULL,
    "teamId" text CONSTRAINT "MembershipRequestGroup_groupId_not_null" NOT NULL,
    approved boolean
);


--
-- Name: Team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Team" (
    id text CONSTRAINT "Group_id_not_null" NOT NULL,
    "groupId" text CONSTRAINT "Group_companyId_not_null" NOT NULL,
    name text CONSTRAINT "Group_name_not_null" NOT NULL,
    description text,
    "joinCode" text CONSTRAINT "Group_joinCode_not_null" NOT NULL,
    "joinCodeRotatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Group_joinCodeRotatedAt_not_null" NOT NULL,
    "joinCodeEnabled" boolean DEFAULT true CONSTRAINT "Group_joinCodeEnabled_not_null" NOT NULL,
    "createdById" text CONSTRAINT "Group_createdById_not_null" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "Group_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp(3) without time zone CONSTRAINT "Group_updatedAt_not_null" NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    visibility public."TeamVisibility" DEFAULT 'PUBLIC'::public."TeamVisibility" CONSTRAINT "Group_visibility_not_null" NOT NULL,
    "requireApproval" boolean DEFAULT true CONSTRAINT "Group_requireApproval_not_null" NOT NULL,
    "primaryAdminId" text
);


--
-- Name: TeamMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeamMember" (
    id text CONSTRAINT "GroupMember_id_not_null" NOT NULL,
    "teamId" text CONSTRAINT "GroupMember_groupId_not_null" NOT NULL,
    "userId" text CONSTRAINT "GroupMember_userId_not_null" NOT NULL,
    "groupId" text CONSTRAINT "GroupMember_companyId_not_null" NOT NULL,
    role public."TeamRole" DEFAULT 'USER'::public."TeamRole" CONSTRAINT "GroupMember_role_not_null" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "GroupMember_joinedAt_not_null" NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text,
    username text,
    "passwordHash" text,
    "googleSub" text,
    name text NOT NULL,
    "avatarUrl" text,
    "platformRole" public."PlatformRole" DEFAULT 'USER'::public."PlatformRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "birthDate" date,
    phone text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "groupId", "actorId", action, "targetType", "targetId", before, after, "createdAt") FROM stdin;
cmvrdan6q0001ope4dgtqbrb9	\N	cmvrdan6o0000ope4afebx27t	auth.signup	User	cmvrdan6o0000ope4afebx27t	\N	\N	2026-10-28 00:19:40.898
cmvre1yle0003ope4kwxjd5bz	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	company.created	Company	cmvre1yl90002ope4ov57fjdz	\N	{"name": "LG전자"}	2026-10-28 00:40:55.395
cmvre28yw0006ope4d37yn1oq	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvre28ys0005ope48mdnzjhf	\N	{"name": "1팀", "visibility": "PUBLIC", "requireApproval": false}	2026-10-28 00:41:08.841
cmvre2d6k0009ope49zz5ido7	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvre2d6h0008ope4fit433ys	\N	{"name": "2팀", "visibility": "PRIVATE", "requireApproval": true}	2026-10-28 00:41:14.301
8b5fe45b2c4b53d5accb9d29	\N	949540a19cc72d90a4c8b152	auth.signup	User	949540a19cc72d90a4c8b152	\N	\N	2026-10-28 00:58:34.066
ee224dbd0af75bbf37309a04	\N	da768333f2417a2d93543829	auth.signup	User	da768333f2417a2d93543829	\N	\N	2026-10-28 00:58:34.066
453e0fb1244b43c59e858f2a	\N	e29419eb0f47950f2ae03d9c	auth.signup	User	e29419eb0f47950f2ae03d9c	\N	\N	2026-10-28 00:58:34.066
318b9cbf6ce7dcfa8ca7bb95	\N	64bf346feeeb85a9b213cab4	auth.signup	User	64bf346feeeb85a9b213cab4	\N	\N	2026-10-28 00:58:34.066
65f1817db7978533eb404a97	\N	3eed32a19ea119f2ca4ce6eb	auth.signup	User	3eed32a19ea119f2ca4ce6eb	\N	\N	2026-10-28 00:58:34.066
870931586c46a82b1cae8fb3	\N	126df952497789e34b7144d7	auth.signup	User	126df952497789e34b7144d7	\N	\N	2026-10-28 00:58:34.066
bc0a965435d6e1d85360171e	\N	1914b294a150bba56811f9af	auth.signup	User	1914b294a150bba56811f9af	\N	\N	2026-10-28 00:58:34.066
e7517d9901e40d57fadf9d34	\N	8f12b144b5801d3204005410	auth.signup	User	8f12b144b5801d3204005410	\N	\N	2026-10-28 00:58:34.066
3c377290a507971d94f9b354	\N	098744534b1f36a3f5d5d937	auth.signup	User	098744534b1f36a3f5d5d937	\N	\N	2026-10-28 00:58:34.066
8aa6bb56cfc8171438e9a72b	\N	a5197c6cca2a21b78a507dcb	auth.signup	User	a5197c6cca2a21b78a507dcb	\N	\N	2026-10-28 00:58:34.066
cmvrhodl60001op7m3197uwc7	\N	cmvrhodkz0000op7muv2nlnx9	auth.signup	User	cmvrhodkz0000op7muv2nlnx9	\N	\N	2026-10-28 02:22:20.107
cmvrhodub0002op7m5yxm90d6	\N	cmvrhodkz0000op7muv2nlnx9	auth.password_changed	User	cmvrhodkz0000op7muv2nlnx9	\N	\N	2026-10-28 02:22:20.436
cmvrhodwq0003op7mvehc0hfe	\N	cmvrhodkz0000op7muv2nlnx9	user.deactivated	User	cmvrhodkz0000op7muv2nlnx9	{"status": "ACTIVE"}	{"status": "DEACTIVATED"}	2026-10-28 02:22:20.522
cmvrhoe1u0005op7mzq823ps4	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrhoe1s0004op7mp3dnfdpg	\N	{"platformRole": "USER"}	2026-10-28 02:22:20.707
cmvrhoe4r0006op7m7xgrct1c	\N	cmvrda1rw0000opgd9c0i30ss	user.password_reset	User	cmvrhodkz0000op7muv2nlnx9	\N	\N	2026-10-28 02:22:20.812
cb8a3e691b3c54f3253078d1	\N	0f0d73a58d125f6c98c68e77	auth.signup	User	0f0d73a58d125f6c98c68e77	\N	\N	2026-10-28 02:26:07.775
14e43394b4e6560cddc167c7	\N	7b2a74a65460e8a659bd53d2	auth.signup	User	7b2a74a65460e8a659bd53d2	\N	\N	2026-10-28 02:26:07.775
1178fea5bfd68a960d12f49c	\N	030aec9a3091d700e8c8da14	auth.signup	User	030aec9a3091d700e8c8da14	\N	\N	2026-10-28 02:26:07.775
cmvrht9dl0000ophpwzuemwoe	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	030aec9a3091d700e8c8da14	{"name": "사용자003", "email": "user003@example.com", "username": "user003", "platformRole": "USER"}	\N	2026-10-28 02:26:07.93
cmvrhtszr0001ophpypjpd3p7	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrhoe1s0004op7mp3dnfdpg	{"name": "관리", "email": null, "username": "adm24104", "platformRole": "USER"}	\N	2026-10-28 02:26:33.352
cmvrhtt010002ophpwrl1zn5c	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrhodkz0000op7muv2nlnx9	{"name": "테스터", "email": "t24104@example.com", "username": "tester24104", "platformRole": "USER"}	\N	2026-10-28 02:26:33.361
cmvrhtt0c0003ophp1gl45348	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	da768333f2417a2d93543829	{"name": "장수아", "email": "user-0ca3f3bf@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.372
cmvrhtt0l0004ophpgc6na57j	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	e29419eb0f47950f2ae03d9c	{"name": "조채원", "email": "user-16cc5e28@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.381
cmvrhtt0u0005ophp716zz0fu	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	64bf346feeeb85a9b213cab4	{"name": "전소율", "email": "user-dabbc5cc@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.391
cmvrhtt130006ophp1rm4c9g3	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	3eed32a19ea119f2ca4ce6eb	{"name": "김다은", "email": "user-9dd52639@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.4
cmvrhtt1d0007ophpulkcxrhm	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	126df952497789e34b7144d7	{"name": "한수빈", "email": "user-a5250ef8@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.41
cmvrhtt1l0008ophpoaojd6bk	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	8f12b144b5801d3204005410	{"name": "한예준", "email": "user-76f580ee@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.417
cmvrhtt1t0009ophp0234kt2i	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	098744534b1f36a3f5d5d937	{"name": "오수아", "email": "user-c42edb71@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.425
cmvrhtt21000aophp0uolsvvy	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	a5197c6cca2a21b78a507dcb	{"name": "이채원", "email": "user-8aadb945@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.433
cmvrhtt29000bophpf3t1e0dx	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	1914b294a150bba56811f9af	{"name": "안지우", "email": "user-3f555cb7@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.442
cmvrhtt2i000cophphhgcj5xk	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	949540a19cc72d90a4c8b152	{"name": "권소율", "email": "user-f47ab263@example.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.451
cmvrhtt2r000dophpqdvguusj	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrdan6o0000ope4afebx27t	{"name": "Wins Moon", "email": "dsdskm@gmail.com", "username": null, "platformRole": "USER"}	\N	2026-10-28 02:26:33.46
cmvrhtxxx000eophp7juqqhdd	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	7b2a74a65460e8a659bd53d2	{"name": "사용자002", "email": "user002@example.com", "username": "user002", "platformRole": "USER"}	\N	2026-10-28 02:26:39.765
cmvrhtxy9000fophp0wqal72j	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	0f0d73a58d125f6c98c68e77	{"name": "사용자001", "email": "user001@example.com", "username": "user001", "platformRole": "USER"}	\N	2026-10-28 02:26:39.778
d6669f98273f62210de1c8d8	\N	259e73427d114c6d041c9a69	auth.signup	User	259e73427d114c6d041c9a69	\N	\N	2026-10-28 02:27:01.536
4e47246fcfe43f51a4de81b7	\N	6c3602d0fb35bc641b7159a2	auth.signup	User	6c3602d0fb35bc641b7159a2	\N	\N	2026-10-28 02:27:01.536
22de0e12332d804ff5ab1f64	\N	25e59474b23b89ebfdec886d	auth.signup	User	25e59474b23b89ebfdec886d	\N	\N	2026-10-28 02:27:01.536
a46cf76bced630ed183f3bb1	\N	b3fb7f786a7749708122dc37	auth.signup	User	b3fb7f786a7749708122dc37	\N	\N	2026-10-28 02:27:01.536
c879a88f8f02745f2dac0316	\N	24234a0f21a78be115bb3385	auth.signup	User	24234a0f21a78be115bb3385	\N	\N	2026-10-28 02:27:01.536
22f962fa274f430f5d482108	\N	8d3b79135c3523550ab0422a	auth.signup	User	8d3b79135c3523550ab0422a	\N	\N	2026-10-28 02:27:01.536
5aa066fb21af7a97153eb253	\N	6ff31e57876e8d9e66e49bd0	auth.signup	User	6ff31e57876e8d9e66e49bd0	\N	\N	2026-10-28 02:27:01.536
c6fdefc8043b253f9bbcce3c	\N	086ac72f33ab92e101b476fb	auth.signup	User	086ac72f33ab92e101b476fb	\N	\N	2026-10-28 02:27:01.536
8f9715191130eb61e82d745c	\N	e192003ceeffd56d0102f658	auth.signup	User	e192003ceeffd56d0102f658	\N	\N	2026-10-28 02:27:01.536
655d63460bde905ba46c51b3	\N	b08ddfcbbf92f710ad7c8da5	auth.signup	User	b08ddfcbbf92f710ad7c8da5	\N	\N	2026-10-28 02:27:01.536
4890d285954e9bbab02ae898	\N	1c48ad6ca40cb0add673a9ce	auth.signup	User	1c48ad6ca40cb0add673a9ce	\N	\N	2026-10-28 02:27:01.536
9a4c89a7c922e98461ce9561	\N	8bcaa6f24ca088792db2fe9a	auth.signup	User	8bcaa6f24ca088792db2fe9a	\N	\N	2026-10-28 02:27:01.536
b8de39464c2061ab4ed35a32	\N	80d5ac375492ae7c624be8d2	auth.signup	User	80d5ac375492ae7c624be8d2	\N	\N	2026-10-28 02:27:01.536
c0ecbbb69ba68949ab31a542	\N	8f11017ebbf16fa76c8a1ff9	auth.signup	User	8f11017ebbf16fa76c8a1ff9	\N	\N	2026-10-28 02:27:01.536
4c815b08b9bd173763946e7b	\N	b6ca1ba5e77e0c6092dae035	auth.signup	User	b6ca1ba5e77e0c6092dae035	\N	\N	2026-10-28 02:27:01.536
ecb61ac11ea3761d304f80bd	\N	290e39d0adde650e2759f1d3	auth.signup	User	290e39d0adde650e2759f1d3	\N	\N	2026-10-28 02:27:01.536
b375f119a07ab2f7633f0bdf	\N	ca49433c337adf5b727ca60c	auth.signup	User	ca49433c337adf5b727ca60c	\N	\N	2026-10-28 02:27:01.536
3fc8cb74edd3da7208e6dfd6	\N	2ef42b97938d04cb7fe4f0e1	auth.signup	User	2ef42b97938d04cb7fe4f0e1	\N	\N	2026-10-28 02:27:01.536
87f7052f2a3c59bcf25a4714	\N	bbac9ef493aa6cada29d2209	auth.signup	User	bbac9ef493aa6cada29d2209	\N	\N	2026-10-28 02:27:01.536
029ceee6bcb31a6e4e148799	\N	33414d7339f7c2730bb5ec1f	auth.signup	User	33414d7339f7c2730bb5ec1f	\N	\N	2026-10-28 02:27:01.536
cmvrhx3p70002opwj9vqdysji	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	membership.granted	Membership	cmvrhx3p40001opwjlr1nqp3y	\N	{"role": "ADMIN", "status": "APPROVED"}	2026-10-28 02:29:07.196
cmvrhx9rs0005opwjhehcu1x3	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	membership.granted	Membership	cmvrhx9rp0004opwjq4rb8a02	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 02:29:15.064
cmvrhx9s20008opwjdilyeghj	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.member.added	Group	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "6c3602d0fb35bc641b7159a2"}	2026-10-28 02:29:15.075
cmvrhzcor000bopwjqeigrfzc	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	membership.granted	Membership	cmvrhzcoo000aopwjxbn6bpjh	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 02:30:52.155
cmvrhzcox000eopwjv4tpkhj3	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.member.added	Group	cmvre2d6h0008ope4fit433ys	\N	{"userId": "25e59474b23b89ebfdec886d"}	2026-10-28 02:30:52.162
cmvri0w5i0002op7b969ch110	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.admin.changed	Group	cmvre28ys0005ope48mdnzjhf	{"adminUserId": null}	{"adminUserId": "6c3602d0fb35bc641b7159a2"}	2026-10-28 02:32:04.039
cmvri0w6c0003op7bvc0z7spr	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.role.changed	Group	cmvre28ys0005ope48mdnzjhf	\N	{"role": "USER", "userId": "6c3602d0fb35bc641b7159a2"}	2026-10-28 02:32:04.069
cmvri1q4k0004op7bug6uhwhu	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.updated	Group	cmvre2d6h0008ope4fit433ys	{"name": "2팀", "description": null, "joinCodeEnabled": true}	{"visibility": "PUBLIC"}	2026-10-28 02:32:42.884
cmvri45xq0002opidhluplhri	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.admin.changed	Group	cmvre28ys0005ope48mdnzjhf	\N	{"role": "ADMIN", "userId": "6c3602d0fb35bc641b7159a2"}	2026-10-28 02:34:36.687
cmvri460j0005opidrozj9x9w	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.admin.changed	Group	cmvre28ys0005ope48mdnzjhf	\N	{"role": "ADMIN", "userId": "25e59474b23b89ebfdec886d"}	2026-10-28 02:34:36.787
cmvri465k0006opid5drx5jmi	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.role.changed	Group	cmvre28ys0005ope48mdnzjhf	\N	{"role": "USER", "userId": "6c3602d0fb35bc641b7159a2"}	2026-10-28 02:34:36.969
cmvri46880007opid76j1fedx	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.role.changed	Group	cmvre28ys0005ope48mdnzjhf	\N	{"role": "USER", "userId": "25e59474b23b89ebfdec886d"}	2026-10-28 02:34:37.064
cmvri6qvz0008opid4lohi342	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	33414d7339f7c2730bb5ec1f	{"name": "사용자020", "email": "user020@example.com", "username": "user020", "platformRole": "USER"}	\N	2026-10-28 02:36:37.151
cmvri6qw30009opid7265i74c	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	b3fb7f786a7749708122dc37	{"name": "사용자004", "email": "user004@example.com", "username": "user004", "platformRole": "USER"}	\N	2026-10-28 02:36:37.156
cmvri6qw7000aopidzqmmq0ws	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	259e73427d114c6d041c9a69	{"name": "사용자001", "email": "user001@example.com", "username": "user001", "platformRole": "USER"}	\N	2026-10-28 02:36:37.159
cmvri6qw9000bopidq5pbbo05	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6c3602d0fb35bc641b7159a2	{"name": "사용자002", "email": "user002@example.com", "username": "user002", "platformRole": "USER"}	\N	2026-10-28 02:36:37.162
cmvri6qwc000copidqckygf1z	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	25e59474b23b89ebfdec886d	{"name": "사용자003", "email": "user003@example.com", "username": "user003", "platformRole": "USER"}	\N	2026-10-28 02:36:37.164
cmvri6qwe000dopidppdcdkrz	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	24234a0f21a78be115bb3385	{"name": "사용자005", "email": "user005@example.com", "username": "user005", "platformRole": "USER"}	\N	2026-10-28 02:36:37.167
cmvri6qwh000eopidi67ufr58	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	8d3b79135c3523550ab0422a	{"name": "사용자006", "email": "user006@example.com", "username": "user006", "platformRole": "USER"}	\N	2026-10-28 02:36:37.169
cmvri6qwj000fopidghyirz8p	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6ff31e57876e8d9e66e49bd0	{"name": "사용자007", "email": "user007@example.com", "username": "user007", "platformRole": "USER"}	\N	2026-10-28 02:36:37.171
cmvri6qwl000gopidxa5d7nje	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	086ac72f33ab92e101b476fb	{"name": "사용자008", "email": "user008@example.com", "username": "user008", "platformRole": "USER"}	\N	2026-10-28 02:36:37.174
cmvri6qwn000hopid035vwwpn	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	e192003ceeffd56d0102f658	{"name": "사용자009", "email": "user009@example.com", "username": "user009", "platformRole": "USER"}	\N	2026-10-28 02:36:37.176
cmvri6qwq000iopidolp15456	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	b08ddfcbbf92f710ad7c8da5	{"name": "사용자010", "email": "user010@example.com", "username": "user010", "platformRole": "USER"}	\N	2026-10-28 02:36:37.178
cmvri6qws000jopidc2f2ozvu	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	1c48ad6ca40cb0add673a9ce	{"name": "사용자011", "email": "user011@example.com", "username": "user011", "platformRole": "USER"}	\N	2026-10-28 02:36:37.18
cmvrnnmpy0001op41fy67z69i	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrnnmpw0000op41w6qc1jwn	\N	{"platformRole": "USER"}	2026-10-28 05:09:42.983
cmvri6qwu000kopidbsssi2c2	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	8bcaa6f24ca088792db2fe9a	{"name": "사용자012", "email": "user012@example.com", "username": "user012", "platformRole": "USER"}	\N	2026-10-28 02:36:37.182
cmvri6qww000lopids6g3401i	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	80d5ac375492ae7c624be8d2	{"name": "사용자013", "email": "user013@example.com", "username": "user013", "platformRole": "USER"}	\N	2026-10-28 02:36:37.185
cmvri6qwy000mopidcdf5o8co	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	8f11017ebbf16fa76c8a1ff9	{"name": "사용자014", "email": "user014@example.com", "username": "user014", "platformRole": "USER"}	\N	2026-10-28 02:36:37.187
cmvri6qx0000nopidlucnrhud	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	b6ca1ba5e77e0c6092dae035	{"name": "사용자015", "email": "user015@example.com", "username": "user015", "platformRole": "USER"}	\N	2026-10-28 02:36:37.188
cmvri6qx2000oopid4csmpa7z	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	290e39d0adde650e2759f1d3	{"name": "사용자016", "email": "user016@example.com", "username": "user016", "platformRole": "USER"}	\N	2026-10-28 02:36:37.19
cmvri6qx3000popidfj4ems6s	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	ca49433c337adf5b727ca60c	{"name": "사용자017", "email": "user017@example.com", "username": "user017", "platformRole": "USER"}	\N	2026-10-28 02:36:37.192
cmvri6qx5000qopid85wkgoyy	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	2ef42b97938d04cb7fe4f0e1	{"name": "사용자018", "email": "user018@example.com", "username": "user018", "platformRole": "USER"}	\N	2026-10-28 02:36:37.194
cmvri6qx7000ropidlmucmedw	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	bbac9ef493aa6cada29d2209	{"name": "사용자019", "email": "user019@example.com", "username": "user019", "platformRole": "USER"}	\N	2026-10-28 02:36:37.196
d2f631a0a0a177d1cd3da0e6	\N	e0faecc20d8fc9139a69b761	auth.signup	User	e0faecc20d8fc9139a69b761	\N	\N	2026-10-28 04:43:23.453
62c044817d61a386aa1445b8	\N	a6624dd35da71ee45c1f0a0e	auth.signup	User	a6624dd35da71ee45c1f0a0e	\N	\N	2026-10-28 04:43:23.453
04bc35c333c92049ca4cede0	\N	a37230c3c710073532b648c9	auth.signup	User	a37230c3c710073532b648c9	\N	\N	2026-10-28 04:43:23.453
e40f463b7dabe02bca387468	\N	3e8963ba7e6da210ec065700	auth.signup	User	3e8963ba7e6da210ec065700	\N	\N	2026-10-28 04:43:23.453
16596ec043f60dbb0fbaa0b9	\N	0a467256fbf2685266ebe524	auth.signup	User	0a467256fbf2685266ebe524	\N	\N	2026-10-28 04:43:23.453
cmvrmv0bq0001ope4978qz44i	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrmv0bk0000ope4wuu1dbub	\N	{"platformRole": "USER"}	2026-10-28 04:47:27.59
cmvrmv0on0006ope4mjq9zcy3	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrmv0bk0000ope4wuu1dbub	\N	{"teams": [{"role": "ADMIN", "teamId": "cmvre28ys0005ope48mdnzjhf"}], "groups": [{"role": "USER", "groupId": "cmvre1yl90002ope4ov57fjdz"}]}	2026-10-28 04:47:28.055
cmvrmv0rf0007ope44qwbphic	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	cmvrmv0bk0000ope4wuu1dbub	{"name": "김테스트", "email": "kim.test@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "김수정", "email": "kim.test@example.com", "status": "ACTIVE", "platformRole": "USER", "passwordChanged": true}	2026-10-28 04:47:28.156
cmvrmv0u20008ope476yfn0q4	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrmv0bk0000ope4wuu1dbub	\N	{"teams": [], "groups": []}	2026-10-28 04:47:28.251
cmvrmv4lx0009ope4yxfx3fm7	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrmv0bk0000ope4wuu1dbub	{"name": "김수정", "email": "kim.test@example.com", "username": "kim.test@example.com", "platformRole": "USER"}	\N	2026-10-28 04:47:33.141
cmvrmzydc0002opua40jft09z	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrmzyd90001opuaii8lx705	\N	{"role": "ADMIN", "status": "APPROVED"}	2026-10-28 04:51:18.336
cmvrn1e0g0003opuat2lsygub	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.primary_admin.changed	Group	cmvre1yl90002ope4ov57fjdz	{"primaryAdminId": null}	{"primaryAdminId": "e0faecc20d8fc9139a69b761"}	2026-10-28 04:52:25.265
cmvrnes760002opmkk5fdam7b	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.primary_admin.changed	Team	cmvre28ys0005ope48mdnzjhf	{"primaryAdminId": null}	{"primaryAdminId": "e0faecc20d8fc9139a69b761"}	2026-10-28 05:02:50.179
cmvrnes850005opmkdcwmed1j	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.primary_admin.changed	Team	cmvre28ys0005ope48mdnzjhf	{"primaryAdminId": "e0faecc20d8fc9139a69b761"}	{"primaryAdminId": "e0faecc20d8fc9139a69b761"}	2026-10-28 05:02:50.213
cmvrnjeos0002opiyv0lguo1k	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrnjeop0001opiyet11048y	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 05:06:25.949
cmvrnjeoy0005opiy7n31rpba	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.member.added	Team	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "e0faecc20d8fc9139a69b761"}	2026-10-28 05:06:25.954
cmvrnjmvt0008opiy6kug3598	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.admin.changed	Team	cmvre28ys0005ope48mdnzjhf	\N	{"role": "ADMIN", "userId": "e0faecc20d8fc9139a69b761"}	2026-10-28 05:06:36.569
cmvrnk0fl000bopiyprynmtw3	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrnk0fh000aopiytx9ft4ju	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 05:06:54.13
cmvrnk0ft000eopiyfxsbkr3z	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrnk0fq000dopiy63viux4g	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 05:06:54.137
cmvrnk0fz000hopiy35rhvy1a	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrnk0fx000gopiyu2njtcd7	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 05:06:54.144
cmvrnk0g6000kopiy1wk3ryqk	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrnk0g3000jopiy5wu5yp1r	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 05:06:54.15
cmvrnk7y7000nopiyg3luuti5	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.member.added	Team	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "a6624dd35da71ee45c1f0a0e"}	2026-10-28 05:07:03.872
cmvrnk7yd000qopiy6yq30jqi	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.member.added	Team	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "a37230c3c710073532b648c9"}	2026-10-28 05:07:03.878
cmvrnk7yk000topiywhw7b8gk	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.member.added	Team	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "3e8963ba7e6da210ec065700"}	2026-10-28 05:07:03.884
cmvrnk7yp000wopiy7q99wkle	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.member.added	Team	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "0a467256fbf2685266ebe524"}	2026-10-28 05:07:03.89
cmvrnk7yw000zopiyxklyjaef	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrnk7yu000yopiybii7yjj3	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 05:07:03.896
cmvrnk7z00012opiyxht3k4ft	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.member.added	Team	cmvre28ys0005ope48mdnzjhf	\N	{"userId": "cmvrda1rw0000opgd9c0i30ss"}	2026-10-28 05:07:03.901
cmvrnnmqp0006op41rrfd6gr3	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrnnmpw0000op41w6qc1jwn	\N	{"teams": [{"role": "ADMIN", "teamId": "cmvre28ys0005ope48mdnzjhf"}], "groups": [{"role": "ADMIN", "groupId": "cmvre1yl90002ope4ov57fjdz"}]}	2026-10-28 05:09:43.01
cmvrnnmr60009op41gxxrnlcv	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	team.primary_admin.changed	Team	cmvre28ys0005ope48mdnzjhf	{"primaryAdminId": "e0faecc20d8fc9139a69b761"}	{"primaryAdminId": "cmvrnnmpw0000op41w6qc1jwn"}	2026-10-28 05:09:43.026
cmvrnnmro000aop41uwlw7oti	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrnnmpw0000op41w6qc1jwn	{"name": "대표테스트", "email": "prim.test@example.com", "username": "prim.test@example.com", "platformRole": "USER"}	\N	2026-10-28 05:09:43.044
cmvrnny1p0000op1dvcwsii4x	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	e0faecc20d8fc9139a69b761	{"name": "사용자001", "email": "user001@example.com", "username": "user001", "platformRole": "USER"}	\N	2026-10-28 05:09:57.661
cmvrnny200001op1dir52q36n	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	a6624dd35da71ee45c1f0a0e	{"name": "사용자002", "email": "user002@example.com", "username": "user002", "platformRole": "USER"}	\N	2026-10-28 05:09:57.672
cmvrnny280002op1dwkdcx6ro	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	a37230c3c710073532b648c9	{"name": "사용자003", "email": "user003@example.com", "username": "user003", "platformRole": "USER"}	\N	2026-10-28 05:09:57.68
cmvrnny2g0003op1d6qi0oo67	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	3e8963ba7e6da210ec065700	{"name": "사용자004", "email": "user004@example.com", "username": "user004", "platformRole": "USER"}	\N	2026-10-28 05:09:57.689
cmvrnny2o0004op1dbpqzu66t	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	0a467256fbf2685266ebe524	{"name": "사용자005", "email": "user005@example.com", "username": "user005", "platformRole": "USER"}	\N	2026-10-28 05:09:57.696
02c7b018efba4de5ddc0d790	\N	27eb3033d70a46d0887e667f	auth.signup	User	27eb3033d70a46d0887e667f	\N	\N	2026-10-28 05:14:24.449
2baddd5faec53ff66bc7dfc3	\N	fdb3dc748fe81ba3d455791f	auth.signup	User	fdb3dc748fe81ba3d455791f	\N	\N	2026-10-28 05:14:24.449
4cf695debb83a84ae6bb6831	\N	f32f1ea7c83d4a840bf0c175	auth.signup	User	f32f1ea7c83d4a840bf0c175	\N	\N	2026-10-28 05:14:24.449
6dfe77219d7675f3ba662d2d	\N	62e2e804c0119cb2409b7a70	auth.signup	User	62e2e804c0119cb2409b7a70	\N	\N	2026-10-28 05:14:24.449
96c91f60aa6bd2f04eb5d229	\N	4f8284941954a7d0b60ea031	auth.signup	User	4f8284941954a7d0b60ea031	\N	\N	2026-10-28 05:14:24.449
1bca531b636ecc3bbec9b416	\N	cea0e536d9e06eef68f5be15	auth.signup	User	cea0e536d9e06eef68f5be15	\N	\N	2026-10-28 05:14:24.449
2569900f1575458398106df4	\N	51d8de847a168fe721497908	auth.signup	User	51d8de847a168fe721497908	\N	\N	2026-10-28 05:14:24.449
0571ae189303f148b2c28d0c	\N	c5c17efa7b39360be1d3e82d	auth.signup	User	c5c17efa7b39360be1d3e82d	\N	\N	2026-10-28 05:14:24.449
6696e2c00645e28166937484	\N	31f6fa2de50f87e0bbb399a4	auth.signup	User	31f6fa2de50f87e0bbb399a4	\N	\N	2026-10-28 05:14:24.449
a1da0ba812fd7cdf04474ff4	\N	dd79b157acc3fcd6e6df3f88	auth.signup	User	dd79b157acc3fcd6e6df3f88	\N	\N	2026-10-28 05:14:24.449
da35111b66d5c9fc5b6c1af8	\N	e66d1b6c43fe6a4811d15df2	auth.signup	User	e66d1b6c43fe6a4811d15df2	\N	\N	2026-10-28 05:14:24.449
16c4a118051ff8550ac7d399	\N	39e7fbe97bcac584a79730c5	auth.signup	User	39e7fbe97bcac584a79730c5	\N	\N	2026-10-28 05:14:24.449
142a7ce4bb126d15b1b9d0fe	\N	b13529afa2646d61a97cb96e	auth.signup	User	b13529afa2646d61a97cb96e	\N	\N	2026-10-28 05:14:24.449
34ca680f2b08b2e72672348e	\N	99faf10e82fb52398877ab84	auth.signup	User	99faf10e82fb52398877ab84	\N	\N	2026-10-28 05:14:24.449
19eacfd44832670cb01c51b5	\N	acf78a6b14d83d61d1f5f904	auth.signup	User	acf78a6b14d83d61d1f5f904	\N	\N	2026-10-28 05:14:24.449
e776ce1214ecec44abd9e17f	\N	edd9216cb128cfab3b25f626	auth.signup	User	edd9216cb128cfab3b25f626	\N	\N	2026-10-28 05:14:24.449
f6b7ad8566d89bf713a2dee9	\N	6585f6a2615d756622558637	auth.signup	User	6585f6a2615d756622558637	\N	\N	2026-10-28 05:14:24.449
0ac628c13de9806f517ae88c	\N	9fca1cfce03ed41b328dd733	auth.signup	User	9fca1cfce03ed41b328dd733	\N	\N	2026-10-28 05:14:24.449
6c69b116530d824531ab96ad	\N	c33e4a39f8f2715b7b51bd84	auth.signup	User	c33e4a39f8f2715b7b51bd84	\N	\N	2026-10-28 05:14:24.449
2e7bcfe66da83feef1bfdf98	\N	ce2c8289723873475ea0c1a2	auth.signup	User	ce2c8289723873475ea0c1a2	\N	\N	2026-10-28 05:14:24.449
32df9ca6132572ccd40b1db6	\N	27a96264c04ccb23f30879a8	auth.signup	User	27a96264c04ccb23f30879a8	\N	\N	2026-10-28 05:14:24.449
0daa68c78749d184014d84f9	\N	44d769646327b15de7941398	auth.signup	User	44d769646327b15de7941398	\N	\N	2026-10-28 05:14:24.449
2e5e73f8f9da426b11dc6349	\N	6fbd30e59e714f123283f6c3	auth.signup	User	6fbd30e59e714f123283f6c3	\N	\N	2026-10-28 05:14:24.449
80750d0b141e2b62512cd75a	\N	45b0988fad7a861b1d24052b	auth.signup	User	45b0988fad7a861b1d24052b	\N	\N	2026-10-28 05:14:24.449
a1054e64c42df548d01f9f53	\N	9daceae0989aadf1fbdb1472	auth.signup	User	9daceae0989aadf1fbdb1472	\N	\N	2026-10-28 05:14:24.449
0d327cf98a1bb3ab80365fa1	\N	c1d7311d788c7ae284611ff0	auth.signup	User	c1d7311d788c7ae284611ff0	\N	\N	2026-10-28 05:14:24.449
f3140f5ddf4b3f12ee5062b8	\N	6e3701ad3293f818d156ad66	auth.signup	User	6e3701ad3293f818d156ad66	\N	\N	2026-10-28 05:14:24.449
cff438e3a9a9bfe119bc39d8	\N	d0f6d4f0378cdb170bea376f	auth.signup	User	d0f6d4f0378cdb170bea376f	\N	\N	2026-10-28 05:14:24.449
7295b74411866d77316c8382	\N	d594da8bb02299bc21823cb1	auth.signup	User	d594da8bb02299bc21823cb1	\N	\N	2026-10-28 05:14:24.449
d22862774d420fe448ccb79b	\N	6ee07d10e8f1ae4fa775c61f	auth.signup	User	6ee07d10e8f1ae4fa775c61f	\N	\N	2026-10-28 05:14:24.449
bdea7618fd0b8db517de63e1	\N	c773dfac9c0b994e4ead5d8b	auth.signup	User	c773dfac9c0b994e4ead5d8b	\N	\N	2026-10-28 05:15:42.136
db6f7e5743afc51d385ee499	\N	a9fc6cdf20dad2fccdf05105	auth.signup	User	a9fc6cdf20dad2fccdf05105	\N	\N	2026-10-28 05:15:42.136
febdf2603921e7fbcb39e1a0	\N	08657a7f2802eb0842933507	auth.signup	User	08657a7f2802eb0842933507	\N	\N	2026-10-28 05:15:42.136
f85111078744b2cd78715390	\N	ab627c7d0f5325b85064d3e3	auth.signup	User	ab627c7d0f5325b85064d3e3	\N	\N	2026-10-28 05:15:42.136
9425abcb3e795cf0000f4083	\N	c4a6a33f869a5f5a9f726d10	auth.signup	User	c4a6a33f869a5f5a9f726d10	\N	\N	2026-10-28 05:15:42.136
2bd02933d6a0b7c4b13a083f	\N	e6e3ddf4637bf5550f484c15	auth.signup	User	e6e3ddf4637bf5550f484c15	\N	\N	2026-10-28 05:15:42.136
7277765fa0467c1c406ffd94	\N	5f6f471fcac6138dd098fa59	auth.signup	User	5f6f471fcac6138dd098fa59	\N	\N	2026-10-28 05:15:42.136
e09b512536ec6439b25cdeff	\N	5199afb2f8222909051ccd52	auth.signup	User	5199afb2f8222909051ccd52	\N	\N	2026-10-28 05:15:42.136
732baedfe72f4e6e8a434ae3	\N	2cc6e737de208d36da508fef	auth.signup	User	2cc6e737de208d36da508fef	\N	\N	2026-10-28 05:15:42.136
977266d0ac3e7f86338463b5	\N	c00f10664bf79704c935b810	auth.signup	User	c00f10664bf79704c935b810	\N	\N	2026-10-28 05:15:42.136
cef26865c25e25fba5c7833a	\N	cc6cf34e2a5303ffc199ca1c	auth.signup	User	cc6cf34e2a5303ffc199ca1c	\N	\N	2026-10-28 05:15:42.136
437ac7d7d59fc6fed1a03709	\N	9a361f26c1f0de918c80325e	auth.signup	User	9a361f26c1f0de918c80325e	\N	\N	2026-10-28 05:15:42.136
f90d5d7c0f35b07b2bd4eae3	\N	77ec2e1657b47220f9f6e061	auth.signup	User	77ec2e1657b47220f9f6e061	\N	\N	2026-10-28 05:15:42.136
a1f87e493452ff989a389922	\N	c21ef006d0094aabc5a7f693	auth.signup	User	c21ef006d0094aabc5a7f693	\N	\N	2026-10-28 05:15:42.136
7c7ea03c048eae25d22fdf63	\N	acbdc556f34aacd508d79c4a	auth.signup	User	acbdc556f34aacd508d79c4a	\N	\N	2026-10-28 05:15:42.136
e1bc29f27cb90156028110ee	\N	6a6b16bacb53b7ab068bdf30	auth.signup	User	6a6b16bacb53b7ab068bdf30	\N	\N	2026-10-28 05:15:42.136
d3c6d8b709c7d36f04000547	\N	5e42d390c0a582c922f47948	auth.signup	User	5e42d390c0a582c922f47948	\N	\N	2026-10-28 05:15:42.136
c19120e99a9b241442ed21f1	\N	fabf980558fc8cc15f986242	auth.signup	User	fabf980558fc8cc15f986242	\N	\N	2026-10-28 05:15:42.136
874d9595fd2b640cde94d5ad	\N	1a3c470de790546174236248	auth.signup	User	1a3c470de790546174236248	\N	\N	2026-10-28 05:15:42.136
b2d23527a99777fc4366859e	\N	0e1b191288f64f6486e752d2	auth.signup	User	0e1b191288f64f6486e752d2	\N	\N	2026-10-28 05:15:42.136
a9b7d9feb95a4cbee8671a10	\N	f08bfd2087170c86922a24f4	auth.signup	User	f08bfd2087170c86922a24f4	\N	\N	2026-10-28 05:15:42.136
0caa3fc002e26a8d1d676fb0	\N	ab13492cfadaf996bd05f22f	auth.signup	User	ab13492cfadaf996bd05f22f	\N	\N	2026-10-28 05:15:42.136
8ea8ff462181c9c0e740f4f0	\N	1938a667274584bb022882d2	auth.signup	User	1938a667274584bb022882d2	\N	\N	2026-10-28 05:15:42.136
4f91afc5a9bc20749773bd27	\N	18be45006202a42e36041d73	auth.signup	User	18be45006202a42e36041d73	\N	\N	2026-10-28 05:15:42.136
9551a5762e5d8119e21ca397	\N	27a9c7de51f1a3d28913f6f3	auth.signup	User	27a9c7de51f1a3d28913f6f3	\N	\N	2026-10-28 05:15:42.136
0555e22ecf0678044edff422	\N	9d28da9b05330c952305becc	auth.signup	User	9d28da9b05330c952305becc	\N	\N	2026-10-28 05:15:42.136
b2c71dca98e6801c57ea1c32	\N	85351c5874d99774552b4572	auth.signup	User	85351c5874d99774552b4572	\N	\N	2026-10-28 05:15:42.136
71c341ee9cf28c072cef13cb	\N	ee63b03c8b167792b2e1d568	auth.signup	User	ee63b03c8b167792b2e1d568	\N	\N	2026-10-28 05:15:42.136
469e6f47b060b84dd33eb1fc	\N	5cedb55c1b13a3086a52f847	auth.signup	User	5cedb55c1b13a3086a52f847	\N	\N	2026-10-28 05:15:42.136
c766a1108ed5564c78e7b579	\N	339e1e19c59cd65bc839c3b0	auth.signup	User	339e1e19c59cd65bc839c3b0	\N	\N	2026-10-28 05:15:42.136
cmvrnvhzw0005op1d7w6xmcbk	cmvre1yl90002ope4ov57fjdz	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvre1yl90002ope4ov57fjdz	\N	\N	2026-10-28 05:15:50.109
cmvrnxhlu0006op1domesrnzv	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	a9fc6cdf20dad2fccdf05105	{"name": "사용자032", "email": "user032@example.com", "username": "user032", "platformRole": "USER"}	\N	2026-10-28 05:17:22.915
cmvrnxhm90007op1dkxdzbtcc	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	08657a7f2802eb0842933507	{"name": "사용자033", "email": "user033@example.com", "username": "user033", "platformRole": "USER"}	\N	2026-10-28 05:17:22.929
cmvrnxhmz0008op1dg3ogamt8	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	ab627c7d0f5325b85064d3e3	{"name": "사용자034", "email": "user034@example.com", "username": "user034", "platformRole": "USER"}	\N	2026-10-28 05:17:22.955
cmvrnxhnh0009op1dr6c0da5m	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c4a6a33f869a5f5a9f726d10	{"name": "사용자035", "email": "user035@example.com", "username": "user035", "platformRole": "USER"}	\N	2026-10-28 05:17:22.973
cmvrnxhnx000aop1d8j08vjsx	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	e6e3ddf4637bf5550f484c15	{"name": "사용자036", "email": "user036@example.com", "username": "user036", "platformRole": "USER"}	\N	2026-10-28 05:17:22.989
cmvrnxhoe000bop1d4qqhhbx2	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	5f6f471fcac6138dd098fa59	{"name": "사용자037", "email": "user037@example.com", "username": "user037", "platformRole": "USER"}	\N	2026-10-28 05:17:23.007
cmvrnxhou000cop1dnpfbejeg	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	5199afb2f8222909051ccd52	{"name": "사용자038", "email": "user038@example.com", "username": "user038", "platformRole": "USER"}	\N	2026-10-28 05:17:23.022
cmvrnxhp9000dop1d85a4df6o	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	2cc6e737de208d36da508fef	{"name": "사용자039", "email": "user039@example.com", "username": "user039", "platformRole": "USER"}	\N	2026-10-28 05:17:23.037
cmvrnxhpl000eop1d9qw7dxzy	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c00f10664bf79704c935b810	{"name": "사용자040", "email": "user040@example.com", "username": "user040", "platformRole": "USER"}	\N	2026-10-28 05:17:23.05
cmvrnxhpx000fop1dwmaw7933	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cc6cf34e2a5303ffc199ca1c	{"name": "사용자041", "email": "user041@example.com", "username": "user041", "platformRole": "USER"}	\N	2026-10-28 05:17:23.061
cmvrnxhqa000gop1dqfwiw6yh	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	9a361f26c1f0de918c80325e	{"name": "사용자042", "email": "user042@example.com", "username": "user042", "platformRole": "USER"}	\N	2026-10-28 05:17:23.074
cmvrnxhql000hop1d2nph73t3	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	77ec2e1657b47220f9f6e061	{"name": "사용자043", "email": "user043@example.com", "username": "user043", "platformRole": "USER"}	\N	2026-10-28 05:17:23.086
cmvrnxhqz000iop1d79152n3o	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c21ef006d0094aabc5a7f693	{"name": "사용자044", "email": "user044@example.com", "username": "user044", "platformRole": "USER"}	\N	2026-10-28 05:17:23.1
cmvrnxhrh000jop1dgb8d33ma	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	acbdc556f34aacd508d79c4a	{"name": "사용자045", "email": "user045@example.com", "username": "user045", "platformRole": "USER"}	\N	2026-10-28 05:17:23.117
cmvrnxhs3000kop1dgnudzvo5	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6a6b16bacb53b7ab068bdf30	{"name": "사용자046", "email": "user046@example.com", "username": "user046", "platformRole": "USER"}	\N	2026-10-28 05:17:23.139
cmvrnxhsp000lop1ddpqjyd0x	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	5e42d390c0a582c922f47948	{"name": "사용자047", "email": "user047@example.com", "username": "user047", "platformRole": "USER"}	\N	2026-10-28 05:17:23.161
cmvrnxht3000mop1def1gk36w	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	fabf980558fc8cc15f986242	{"name": "사용자048", "email": "user048@example.com", "username": "user048", "platformRole": "USER"}	\N	2026-10-28 05:17:23.175
cmvrnxhtf000nop1dtmpu59sp	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	1a3c470de790546174236248	{"name": "사용자049", "email": "user049@example.com", "username": "user049", "platformRole": "USER"}	\N	2026-10-28 05:17:23.187
cmvrnxhts000oop1dz2cn1cfq	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	0e1b191288f64f6486e752d2	{"name": "사용자050", "email": "user050@example.com", "username": "user050", "platformRole": "USER"}	\N	2026-10-28 05:17:23.2
cmvrnxhu9000pop1duwz5n0tx	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c773dfac9c0b994e4ead5d8b	{"name": "사용자031", "email": "user031@example.com", "username": "user031", "platformRole": "USER"}	\N	2026-10-28 05:17:23.217
cmvrnxkir000qop1dp2xhppsx	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	f08bfd2087170c86922a24f4	{"name": "사용자051", "email": "user051@example.com", "username": "user051", "platformRole": "USER"}	\N	2026-10-28 05:17:26.692
cmvrnxkj7000rop1d2ryz3pd2	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	ab13492cfadaf996bd05f22f	{"name": "사용자052", "email": "user052@example.com", "username": "user052", "platformRole": "USER"}	\N	2026-10-28 05:17:26.707
cmvrnxkjm000sop1dgopy1ncd	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	1938a667274584bb022882d2	{"name": "사용자053", "email": "user053@example.com", "username": "user053", "platformRole": "USER"}	\N	2026-10-28 05:17:26.723
cmvrnxkk2000top1d367hi0v0	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	18be45006202a42e36041d73	{"name": "사용자054", "email": "user054@example.com", "username": "user054", "platformRole": "USER"}	\N	2026-10-28 05:17:26.739
cmvrnxkkh000uop1d6eewas2w	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	27a9c7de51f1a3d28913f6f3	{"name": "사용자055", "email": "user055@example.com", "username": "user055", "platformRole": "USER"}	\N	2026-10-28 05:17:26.753
cmvrnxkkw000vop1d82mv5vph	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	9d28da9b05330c952305becc	{"name": "사용자056", "email": "user056@example.com", "username": "user056", "platformRole": "USER"}	\N	2026-10-28 05:17:26.768
cmvrnxkl9000wop1dv3hcw72t	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	85351c5874d99774552b4572	{"name": "사용자057", "email": "user057@example.com", "username": "user057", "platformRole": "USER"}	\N	2026-10-28 05:17:26.782
cmvrnxkln000xop1dt9d5sv1b	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	ee63b03c8b167792b2e1d568	{"name": "사용자058", "email": "user058@example.com", "username": "user058", "platformRole": "USER"}	\N	2026-10-28 05:17:26.795
cmvrnxkm3000yop1doo9y4v65	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	5cedb55c1b13a3086a52f847	{"name": "사용자059", "email": "user059@example.com", "username": "user059", "platformRole": "USER"}	\N	2026-10-28 05:17:26.811
cmvrnxkmk000zop1d6p39xczd	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	339e1e19c59cd65bc839c3b0	{"name": "사용자060", "email": "user060@example.com", "username": "user060", "platformRole": "USER"}	\N	2026-10-28 05:17:26.828
cmvrnxkn20010op1dy2y3uzc4	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	27eb3033d70a46d0887e667f	{"name": "김민준", "email": "user001@example.com", "username": "user001", "platformRole": "USER"}	\N	2026-10-28 05:17:26.846
cmvrnxknk0011op1dsbvzpwlj	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	fdb3dc748fe81ba3d455791f	{"name": "커피한잔(이서연)", "email": "user002@example.com", "username": "user002", "platformRole": "USER"}	\N	2026-10-28 05:17:26.865
cmvrnxko30012op1dyfa3rfj0	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	f32f1ea7c83d4a840bf0c175	{"name": "박지호", "email": "user003@example.com", "username": "user003", "platformRole": "USER"}	\N	2026-10-28 05:17:26.884
cmvrnxkot0013op1didm1whtr	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	62e2e804c0119cb2409b7a70	{"name": "새벽세시(최하은)", "email": "user004@example.com", "username": "user004", "platformRole": "USER"}	\N	2026-10-28 05:17:26.909
cmvrnxkp80014op1dzvhhdl3s	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	4f8284941954a7d0b60ea031	{"name": "정도윤", "email": "user005@example.com", "username": "user005", "platformRole": "USER"}	\N	2026-10-28 05:17:26.925
cmvrnxkpu0015op1ddporj2qw	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cea0e536d9e06eef68f5be15	{"name": "밤비(강지우)", "email": "user006@example.com", "username": "user006", "platformRole": "USER"}	\N	2026-10-28 05:17:26.947
cmvrnxkqb0016op1ddsm6dxhv	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	51d8de847a168fe721497908	{"name": "조수빈", "email": "user007@example.com", "username": "user007", "platformRole": "USER"}	\N	2026-10-28 05:17:26.964
cmvrnxkqp0017op1d98ojhs6c	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c5c17efa7b39360be1d3e82d	{"name": "라떼한잔(윤예준)", "email": "user008@example.com", "username": "user008", "platformRole": "USER"}	\N	2026-10-28 05:17:26.977
cmvrnxkr60018op1dh0c93q38	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	31f6fa2de50f87e0bbb399a4	{"name": "장채원", "email": "user009@example.com", "username": "user009", "platformRole": "USER"}	\N	2026-10-28 05:17:26.995
cmvrnxkri0019op1dmepwjux0	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	dd79b157acc3fcd6e6df3f88	{"name": "별빛산책(임시우)", "email": "user010@example.com", "username": "user010", "platformRole": "USER"}	\N	2026-10-28 05:17:27.007
cmvrnxm5t001aop1d8we3jcri	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	e66d1b6c43fe6a4811d15df2	{"name": "한수아", "email": "user011@example.com", "username": "user011", "platformRole": "USER"}	\N	2026-10-28 05:17:28.817
cmvrnxm67001bop1dxa4lqona	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	39e7fbe97bcac584a79730c5	{"name": "두근두근(오준서)", "email": "user012@example.com", "username": "user012", "platformRole": "USER"}	\N	2026-10-28 05:17:28.831
cmvrnxm6l001cop1d6hjtayu7	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	b13529afa2646d61a97cb96e	{"name": "신지민", "email": "user013@example.com", "username": "user013", "platformRole": "USER"}	\N	2026-10-28 05:17:28.845
cmvrnxm6y001dop1d2s53h6yl	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	99faf10e82fb52398877ab84	{"name": "고요한숲(권유진)", "email": "user014@example.com", "username": "user014", "platformRole": "USER"}	\N	2026-10-28 05:17:28.858
cmvrnxm79001eop1djou9lw2c	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	acf78a6b14d83d61d1f5f904	{"name": "황현우", "email": "user015@example.com", "username": "user015", "platformRole": "USER"}	\N	2026-10-28 05:17:28.87
cmvrnxm7l001fop1d8600i8ti	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	edd9216cb128cfab3b25f626	{"name": "딸기우유(안다은)", "email": "user016@example.com", "username": "user016", "platformRole": "USER"}	\N	2026-10-28 05:17:28.882
cmvrnxm7x001gop1di1qzz3ql	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6585f6a2615d756622558637	{"name": "류태윤", "email": "user017@example.com", "username": "user017", "platformRole": "USER"}	\N	2026-10-28 05:17:28.894
cmvrnxm89001hop1dpzzx8hzs	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	9fca1cfce03ed41b328dd733	{"name": "여름바람(서소율)", "email": "user018@example.com", "username": "user018", "platformRole": "USER"}	\N	2026-10-28 05:17:28.905
cmvrnxm8k001iop1drudacvj5	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c33e4a39f8f2715b7b51bd84	{"name": "전민호", "email": "user019@example.com", "username": "user019", "platformRole": "USER"}	\N	2026-10-28 05:17:28.916
cmvrnxm8x001jop1daoktnfph	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	ce2c8289723873475ea0c1a2	{"name": "달빛러너(홍지안)", "email": "user020@example.com", "username": "user020", "platformRole": "USER"}	\N	2026-10-28 05:17:28.929
cmvrnxm98001kop1dordwtmug	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	27a96264c04ccb23f30879a8	{"name": "고은별", "email": "user021@example.com", "username": "user021", "platformRole": "USER"}	\N	2026-10-28 05:17:28.941
cmvrnxm9j001lop1d455ourij	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	44d769646327b15de7941398	{"name": "코딩하는고양이(문채윤)", "email": "user022@example.com", "username": "user022", "platformRole": "USER"}	\N	2026-10-28 05:17:28.951
cmvrnxm9u001mop1dumzgt84o	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6fbd30e59e714f123283f6c3	{"name": "양서준", "email": "user023@example.com", "username": "user023", "platformRole": "USER"}	\N	2026-10-28 05:17:28.963
cmvrnxma1001nop1dgbq4w4hn	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	45b0988fad7a861b1d24052b	{"name": "파란하늘(배하린)", "email": "user024@example.com", "username": "user024", "platformRole": "USER"}	\N	2026-10-28 05:17:28.969
cmvrnxma8001oop1dcnvu8efk	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	9daceae0989aadf1fbdb1472	{"name": "남도현", "email": "user025@example.com", "username": "user025", "platformRole": "USER"}	\N	2026-10-28 05:17:28.976
cmvrnxmae001pop1d31q4abrv	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	c1d7311d788c7ae284611ff0	{"name": "초록우산(석민아)", "email": "user026@example.com", "username": "user026", "platformRole": "USER"}	\N	2026-10-28 05:17:28.983
cmvrnxmak001qop1dwyedwc8t	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6e3701ad3293f818d156ad66	{"name": "노건우", "email": "user027@example.com", "username": "user027", "platformRole": "USER"}	\N	2026-10-28 05:17:28.988
cmvrnxmap001rop1dedhl3vi1	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	d0f6d4f0378cdb170bea376f	{"name": "무지개토끼(여지원)", "email": "user028@example.com", "username": "user028", "platformRole": "USER"}	\N	2026-10-28 05:17:28.994
cmvrnxmaw001sop1da7pkpgiw	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	d594da8bb02299bc21823cb1	{"name": "차은우", "email": "user029@example.com", "username": "user029", "platformRole": "USER"}	\N	2026-10-28 05:17:29
cmvrnxmb1001top1d9l7a587s	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	6ee07d10e8f1ae4fa775c61f	{"name": "모닝커피(송예린)", "email": "user030@example.com", "username": "user030", "platformRole": "USER"}	\N	2026-10-28 05:17:29.006
cmvrnxome001uop1dojru2ji4	de36feaeb5c075dcac873886	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	de36feaeb5c075dcac873886	\N	\N	2026-10-28 05:17:32.007
cmvrnxpa0001vop1di3y28n2u	fd4217e15268c35ab5216a65	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	fd4217e15268c35ab5216a65	\N	\N	2026-10-28 05:17:32.856
f5b468a3dcd54928e47bb8a8	\N	9604c4070250c26d769fe911	auth.signup	User	9604c4070250c26d769fe911	\N	\N	2026-10-28 05:19:12.858
bf9e1a4b34bf2afe3c7903c0	\N	d83086ec58691bc6660eec64	auth.signup	User	d83086ec58691bc6660eec64	\N	\N	2026-10-28 05:19:12.858
2bc6892a5ea615459bd617a8	\N	4cad6b16b011512f9047b56e	auth.signup	User	4cad6b16b011512f9047b56e	\N	\N	2026-10-28 05:19:12.858
0e3292a18dec5724c185b52a	\N	d345cdbe3ac2fb3e1e7a7911	auth.signup	User	d345cdbe3ac2fb3e1e7a7911	\N	\N	2026-10-28 05:19:12.858
8582bd9e2ec73b8140b3974a	\N	42a7c5442528c215d56cd0e5	auth.signup	User	42a7c5442528c215d56cd0e5	\N	\N	2026-10-28 05:19:12.858
85d6bf14573b0abf6ed1129d	\N	d95147af2e1f078547f543ac	auth.signup	User	d95147af2e1f078547f543ac	\N	\N	2026-10-28 05:19:12.858
1f2272be181fcf9096068786	\N	5d1702ec0948ce1e9a72e407	auth.signup	User	5d1702ec0948ce1e9a72e407	\N	\N	2026-10-28 05:19:12.858
1988614814dc37486d304007	\N	f22b958ad256048ecc3180bf	auth.signup	User	f22b958ad256048ecc3180bf	\N	\N	2026-10-28 05:19:12.858
29eac33ca823f32a70898b6c	\N	8d01468f7b0bff70894f72f7	auth.signup	User	8d01468f7b0bff70894f72f7	\N	\N	2026-10-28 05:19:12.858
02494119eaa1bd26aa166327	\N	e0c9cfc952c9f07b69ee9169	auth.signup	User	e0c9cfc952c9f07b69ee9169	\N	\N	2026-10-28 05:19:12.858
7fa6ff6f168f0a36abb57b5d	\N	10a9c2207ecfb3ac29943def	auth.signup	User	10a9c2207ecfb3ac29943def	\N	\N	2026-10-28 05:19:12.858
7a5bac120ffd84ffc1bcf2ed	\N	5afa150be5f214826388a84f	auth.signup	User	5afa150be5f214826388a84f	\N	\N	2026-10-28 05:19:12.858
0e45fe86b0ddeb6b95a51013	\N	e5d0c3875c1805034d3f2d99	auth.signup	User	e5d0c3875c1805034d3f2d99	\N	\N	2026-10-28 05:19:12.858
8c38c963903c2bc0cd0b2ccb	\N	8a1d708c7611064b07dc8f12	auth.signup	User	8a1d708c7611064b07dc8f12	\N	\N	2026-10-28 05:19:12.858
fc663294f8210e17fed6fa83	\N	5905ccdb595213d0507fc883	auth.signup	User	5905ccdb595213d0507fc883	\N	\N	2026-10-28 05:19:12.858
b094b616d39ded7a0c165ef9	\N	2e293e8c57a2e586dc2add9e	auth.signup	User	2e293e8c57a2e586dc2add9e	\N	\N	2026-10-28 05:19:12.858
5a3451ef1b6e14fdff522b9b	\N	65ecb5aeaff8942b0bb9ad03	auth.signup	User	65ecb5aeaff8942b0bb9ad03	\N	\N	2026-10-28 05:19:12.858
e2e6960769e4ba7c77a52a40	\N	6e4233089941dcbcca7b5e81	auth.signup	User	6e4233089941dcbcca7b5e81	\N	\N	2026-10-28 05:19:12.858
6c8e39af0038c2107fbe4b96	\N	1f32a0c7f4aa26f131a0e0b7	auth.signup	User	1f32a0c7f4aa26f131a0e0b7	\N	\N	2026-10-28 05:19:12.858
5b369eb31ab0b99aba97b3bb	\N	5718f0263aea5112388d1013	auth.signup	User	5718f0263aea5112388d1013	\N	\N	2026-10-28 05:19:12.858
41a3044bdadfedf5f7fc5b97	\N	9643e9b435edecdeb3cf2a79	auth.signup	User	9643e9b435edecdeb3cf2a79	\N	\N	2026-10-28 05:19:12.858
d8dd371f01f311506ecf5723	\N	fa9a78aabf5a575fa1ba9ba2	auth.signup	User	fa9a78aabf5a575fa1ba9ba2	\N	\N	2026-10-28 05:19:12.858
55db1964bd3cc07d332c5a7c	\N	ce81343faa6f422c9f8e3c27	auth.signup	User	ce81343faa6f422c9f8e3c27	\N	\N	2026-10-28 05:19:12.858
0beb20d92c2b910d67151ad6	\N	1946fc19f4efc968e99b30ba	auth.signup	User	1946fc19f4efc968e99b30ba	\N	\N	2026-10-28 05:19:12.858
c844cc4bb199fe04ff4b736e	\N	02c27f20669f0af4e48ceed4	auth.signup	User	02c27f20669f0af4e48ceed4	\N	\N	2026-10-28 05:19:12.858
5f0d7ce3dd1cd78777a1cf47	\N	7962bffd24ee4ae32e77c10b	auth.signup	User	7962bffd24ee4ae32e77c10b	\N	\N	2026-10-28 05:19:12.858
faf16c6ef45d1f8b579aa124	\N	e5e9dfc0e9d26a35cf957bac	auth.signup	User	e5e9dfc0e9d26a35cf957bac	\N	\N	2026-10-28 05:19:12.858
087572a4798a9b8bc3724dff	\N	7adceab8e81faed271d75b4e	auth.signup	User	7adceab8e81faed271d75b4e	\N	\N	2026-10-28 05:19:12.858
439e96be008c34858bb04d92	\N	93a28ef31ba271e0b7c4411b	auth.signup	User	93a28ef31ba271e0b7c4411b	\N	\N	2026-10-28 05:19:12.858
7f039587fa1d584aff716ef2	\N	0aade076c91cf03124517f96	auth.signup	User	0aade076c91cf03124517f96	\N	\N	2026-10-28 05:19:12.858
cmvrodkir0002opzn9cqz8i1j	157e9988a6f27eebd07fde64	fa9a78aabf5a575fa1ba9ba2	groupMembership.request.created	GroupMembershipRequest	cmvrodkie0001opzno4fztrz0	\N	{"type": "TEAM_JOIN", "teamIds": ["241ecef2307ce48cff559d1f"]}	2026-10-28 05:29:53.187
cmvrogzdf0002opc1mv6hmqg7	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.created	GroupMembershipRequest	cmvrogzda0001opc10xc4id1z	\N	{"type": "GROUP_JOIN", "teamIds": ["241ecef2307ce48cff559d1f"]}	2026-10-28 05:32:32.404
cmvrogzgw0003opc10tahrrfj	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.canceled	GroupMembershipRequest	cmvrogzda0001opc10xc4id1z	\N	\N	2026-10-28 05:32:32.529
cmvrojips0002opwzjv6u0ncd	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.created	GroupMembershipRequest	cmvrojipn0001opwzthqgjyoh	\N	{"type": "GROUP_JOIN", "teamIds": ["241ecef2307ce48cff559d1f"]}	2026-10-28 05:34:30.784
cmvrojisn0003opwz0ms652ir	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.canceled	GroupMembershipRequest	cmvrojipn0001opwzthqgjyoh	\N	\N	2026-10-28 05:34:30.887
cmvron4n60002op8hqgy6se91	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.created	GroupMembershipRequest	cmvron4n00001op8hmexnkgqu	\N	{"type": "GROUP_JOIN", "teamIds": ["241ecef2307ce48cff559d1f"]}	2026-10-28 05:37:19.17
cmvron4oa0003op8hzsae9z6j	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.canceled	GroupMembershipRequest	cmvron4n00001op8hmexnkgqu	\N	\N	2026-10-28 05:37:19.211
cmvrp4yv70000opcik8jmcauc	157e9988a6f27eebd07fde64	8d01468f7b0bff70894f72f7	team.updated	Team	241ecef2307ce48cff559d1f	{"visibility": "PUBLIC", "joinCodeEnabled": true, "requireApproval": true}	{"requireApproval": true}	2026-10-28 05:51:11.491
cmvrp9dlu0002opo3t7m6q0ys	157e9988a6f27eebd07fde64	7adceab8e81faed271d75b4e	groupMembership.request.created	GroupMembershipRequest	cmvrp9dlp0001opo3bjea2x7d	\N	{"type": "GROUP_JOIN", "teamIds": ["241ecef2307ce48cff559d1f"]}	2026-10-28 05:54:37.219
cmvrp9dpe0003opo3uxqlsqcc	157e9988a6f27eebd07fde64	cmvrda1rw0000opgd9c0i30ss	groupMembership.request.rejected	GroupMembershipRequest	cmvrp9dlp0001opo3bjea2x7d	\N	{"reason": "인원 마감"}	2026-10-28 05:54:37.346
cmvrpa1ai0000opj8qbvwcj7p	157e9988a6f27eebd07fde64	8d01468f7b0bff70894f72f7	groupMembership.request.rejected	GroupMembershipRequest	cmvrodkie0001opzno4fztrz0	\N	{"reason": "그냥"}	2026-10-28 05:55:07.915
cmvrshofy0004op2276i7w179	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [{"role": "USER", "teamId": "241ecef2307ce48cff559d1f"}], "groups": [{"role": "USER", "groupId": "157e9988a6f27eebd07fde64"}]}	2026-10-28 07:25:03.358
cmvrshogx0005op224dtz2exa	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [], "groups": []}	2026-10-28 07:25:03.394
cmvrsjfv00002opazowtkqjgp	157e9988a6f27eebd07fde64	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrsjfuy0001opazqy62ckqr	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 07:26:25.548
cmvrsjfvw0003opaza6k3eq05	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [], "groups": []}	2026-10-28 07:26:25.58
cmvrsjk5p0005opazu1k4reax	cmvrsjk5n0004opazijdbs45n	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvrsjk5n0004opazijdbs45n	\N	{"name": "임시그룹검증"}	2026-10-28 07:26:31.117
cmvrsjk660008opaz4yq5zg78	157e9988a6f27eebd07fde64	cmvrda1rw0000opgd9c0i30ss	groupMembership.granted	GroupMembership	cmvrsjk640007opazjlf21koi	\N	{"role": "USER", "status": "APPROVED"}	2026-10-28 07:26:31.134
cmvrsjk700009opazd4ukvxoy	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [], "groups": []}	2026-10-28 07:26:31.165
cmvrsjk7d000aopazavdjkkhs	cmvrsjk5n0004opazijdbs45n	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvrsjk5n0004opazijdbs45n	\N	\N	2026-10-28 07:26:31.178
cmvrslod00001ophvkckaa8zd	cmvrslocx0000ophvfxhr6j3z	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvrslocx0000ophvfxhr6j3z	\N	{"name": "재발급검증"}	2026-10-28 07:28:09.877
cmvrslodm0004ophvkocjyn44	cmvrslocx0000ophvfxhr6j3z	cmvrda1rw0000opgd9c0i30ss	team.created	Team	cmvrslodk0003ophvso0mkmo9	\N	{"name": "검증팀", "visibility": "PUBLIC", "requireApproval": true}	2026-10-28 07:28:09.898
cmvrsloea0009ophv8b80kevg	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [{"role": "USER", "teamId": "cmvrslodk0003ophvso0mkmo9"}], "groups": [{"role": "USER", "groupId": "cmvrslocx0000ophvfxhr6j3z"}]}	2026-10-28 07:28:09.923
cmvrslogy000aophv7czvjohw	cmvrslocx0000ophvfxhr6j3z	cmvrda1rw0000opgd9c0i30ss	team.code.rotated	Team	cmvrslodk0003ophvso0mkmo9	\N	{"teamMembers": 1}	2026-10-28 07:28:10.019
cmvrslojz000bophvbrpu7orn	cmvrslocx0000ophvfxhr6j3z	cmvrda1rw0000opgd9c0i30ss	group.code.rotated	Group	cmvrslocx0000ophvfxhr6j3z	\N	{"teamMembers": 0, "groupMemberships": 1}	2026-10-28 07:28:10.127
cmvrslomb000cophvx6qbbcci	cmvrslocx0000ophvfxhr6j3z	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvrslocx0000ophvfxhr6j3z	\N	\N	2026-10-28 07:28:10.212
cmvrss1vf0000opuivfclnyqv	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:07.324
cmvrss2020001opuiv2d287qd	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:07.491
cmvrssi700000opyrxq5mo52v	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:28.476
cmvrssiag0001opyrx73s20hp	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:28.601
cmvrt5s630001op5my9sitck9	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvrt5s620000op5mgorc4phv	\N	{"name": "규칙검증mvrt5s3k"}	2026-10-28 07:43:47.932
cmvrt5s6c0004op5mqj8khrd4	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	team.created	Team	cmvrt5s6b0003op5msqf2m9bu	\N	{"name": "검증A", "visibility": "PUBLIC", "requireApproval": true}	2026-10-28 07:43:47.94
cmvrt5s6h0007op5mana3w2ri	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	team.created	Team	cmvrt5s6h0006op5mm92w93vf	\N	{"name": "검증B", "visibility": "PUBLIC", "requireApproval": true}	2026-10-28 07:43:47.946
cmvrt5s6l0009op5mvfv7hmkr	cmvrt5s6k0008op5mzs38nrhl	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvrt5s6k0008op5mzs38nrhl	\N	{"name": "규칙검증2mvrt5s3k"}	2026-10-28 07:43:47.95
cmvrt5s8v000bop5m099srfze	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrt5s8p000aop5mmcgdg9sb	\N	{"platformRole": "USER"}	2026-10-28 07:43:48.031
cmvrt5scr000dop5mh6ni0qyj	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrt5scp000cop5m77kcaam1	\N	{"platformRole": "USER"}	2026-10-28 07:43:48.171
cmvrt5sfh000iop5mg6s7u88h	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrt5s8p000aop5mmcgdg9sb	\N	{"teams": [{"role": "USER", "teamId": "cmvrt5s6b0003op5msqf2m9bu"}], "groups": [{"role": "USER", "groupId": "cmvrt5s620000op5mgorc4phv"}]}	2026-10-28 07:43:48.269
cmvrt5sg0000lop5m0bcmlb3f	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	team.admin.changed	Team	cmvrt5s6b0003op5msqf2m9bu	\N	{"role": "ADMIN", "userId": "cmvrt5s8p000aop5mmcgdg9sb"}	2026-10-28 07:43:48.288
cmvrt5sg6000oop5mu01rvf28	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	team.primary_admin.changed	Team	cmvrt5s6b0003op5msqf2m9bu	{"primaryAdminId": "cmvrt5s8p000aop5mmcgdg9sb"}	{"primaryAdminId": "cmvrt5s8p000aop5mmcgdg9sb"}	2026-10-28 07:43:48.294
cmvrt5sgh000pop5mvl5hb2r3	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	team.code.rotated	Team	cmvrt5s6b0003op5msqf2m9bu	\N	{"teamMembers": 1}	2026-10-28 07:43:48.305
cmvrt5sgr000uop5mt2ldg3t5	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrt5s8p000aop5mmcgdg9sb	\N	{"teams": [{"role": "USER", "teamId": "cmvrt5s6b0003op5msqf2m9bu"}], "groups": [{"role": "USER", "groupId": "cmvrt5s620000op5mgorc4phv"}]}	2026-10-28 07:43:48.315
cmvrt5sgy000vop5m3270vgkq	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	group.code.rotated	Group	cmvrt5s620000op5mgorc4phv	\N	{"teamMembers": 1, "groupMemberships": 1}	2026-10-28 07:43:48.322
cmvrt5shh000yop5m457xwshn	cmvrt5s620000op5mgorc4phv	cmvrt5scp000cop5m77kcaam1	groupMembership.request.created	GroupMembershipRequest	cmvrt5shd000xop5mex4v8iqs	\N	{"type": "GROUP_JOIN", "teamIds": []}	2026-10-28 07:43:48.341
cmvrt5shn000zop5mkrdutrav	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	groupMembership.request.rejected	GroupMembershipRequest	cmvrt5shd000xop5mex4v8iqs	\N	{"reason": "검증 사유"}	2026-10-28 07:43:48.347
cmvrt5shv0010op5mcdx5pq9s	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	cmvrt5scp000cop5m77kcaam1	{"name": "규칙b", "email": "rule-mvrt5s3k-b@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "규칙b", "email": "rule-mvrt5s3k-b@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:43:48.355
cmvrt5sk90011op5mbhz61e7c	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrt5s8p000aop5mmcgdg9sb	{"name": "규칙a", "email": "rule-mvrt5s3k-a@example.com", "username": "rule-mvrt5s3k-a@example.com", "platformRole": "USER"}	\N	2026-10-28 07:43:48.442
cmvrt5ski0012op5m7nc86zas	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrt5scp000cop5m77kcaam1	{"name": "규칙b", "email": "rule-mvrt5s3k-b@example.com", "username": "rule-mvrt5s3k-b@example.com", "platformRole": "USER"}	\N	2026-10-28 07:43:48.451
cmvrt5skl0013op5mmrqij0x1	cmvrt5s620000op5mgorc4phv	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvrt5s620000op5mgorc4phv	\N	\N	2026-10-28 07:43:48.454
cmvrt5sko0014op5mwq59qyyf	cmvrt5s6k0008op5mzs38nrhl	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvrt5s6k0008op5mzs38nrhl	\N	\N	2026-10-28 07:43:48.456
cmvrtn9ey0001op51wi4zt63b	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvrtn9ev0000op515tt0moeq	\N	{"name": "규칙검증mvrtn9d3"}	2026-10-28 07:57:23.435
cmvrtn9fa0004op51ys3x2c82	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	team.created	Team	cmvrtn9f90003op51xdeu6rxe	\N	{"name": "검증A", "visibility": "PUBLIC", "requireApproval": true}	2026-10-28 07:57:23.447
cmvrtn9fi0007op51alzxglje	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	team.created	Team	cmvrtn9fh0006op517wplfib5	\N	{"name": "검증B", "visibility": "PUBLIC", "requireApproval": true}	2026-10-28 07:57:23.455
cmvrtn9fo0009op51dv3knlop	cmvrtn9fm0008op51i96nhoou	cmvrda1rw0000opgd9c0i30ss	group.created	Group	cmvrtn9fm0008op51i96nhoou	\N	{"name": "규칙검증2mvrtn9d3"}	2026-10-28 07:57:23.46
cmvrtn9hr000bop51lui17pg7	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrtn9hm000aop512w1zybvt	\N	{"platformRole": "USER"}	2026-10-28 07:57:23.536
cmvrtn9lo000dop51e9zbc83t	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrtn9lm000cop51ah3m0hdg	\N	{"platformRole": "USER"}	2026-10-28 07:57:23.676
cmvrtn9o9000iop51b40ir8j6	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrtn9hm000aop512w1zybvt	\N	{"teams": [{"role": "USER", "teamId": "cmvrtn9f90003op51xdeu6rxe"}], "groups": [{"role": "USER", "groupId": "cmvrtn9ev0000op515tt0moeq"}]}	2026-10-28 07:57:23.77
cmvrtn9oq000lop51m1ypcapk	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	team.admin.changed	Team	cmvrtn9f90003op51xdeu6rxe	\N	{"role": "ADMIN", "userId": "cmvrtn9hm000aop512w1zybvt"}	2026-10-28 07:57:23.786
cmvrtn9ow000oop512durtrp8	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	team.primary_admin.changed	Team	cmvrtn9f90003op51xdeu6rxe	{"primaryAdminId": "cmvrtn9hm000aop512w1zybvt"}	{"primaryAdminId": "cmvrtn9hm000aop512w1zybvt"}	2026-10-28 07:57:23.792
cmvrtn9pd000pop51papzeovr	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	team.code.rotated	Team	cmvrtn9f90003op51xdeu6rxe	\N	{"teamMembers": 1}	2026-10-28 07:57:23.809
cmvrtn9pp000uop51lwqzmasy	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrtn9hm000aop512w1zybvt	\N	{"teams": [{"role": "USER", "teamId": "cmvrtn9f90003op51xdeu6rxe"}], "groups": [{"role": "USER", "groupId": "cmvrtn9ev0000op515tt0moeq"}]}	2026-10-28 07:57:23.821
cmvrtn9pw000vop51ffvgc4ws	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	group.code.rotated	Group	cmvrtn9ev0000op515tt0moeq	\N	{"teamMembers": 1, "groupMemberships": 1}	2026-10-28 07:57:23.829
cmvrtn9q8000yop513r3p6kgd	cmvrtn9ev0000op515tt0moeq	cmvrtn9lm000cop51ah3m0hdg	groupMembership.request.created	GroupMembershipRequest	cmvrtn9q5000xop51ubk38bq2	\N	{"type": "GROUP_JOIN", "teamIds": []}	2026-10-28 07:57:23.84
cmvrtn9qe000zop512vonbst9	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	groupMembership.request.rejected	GroupMembershipRequest	cmvrtn9q5000xop51ubk38bq2	\N	{"reason": "검증 사유"}	2026-10-28 07:57:23.846
cmvrtn9ql0010op512echsx5a	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	cmvrtn9lm000cop51ah3m0hdg	{"name": "규칙b", "email": "rule-mvrtn9d3-b@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "규칙b", "email": "rule-mvrtn9d3-b@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:57:23.853
cmvrtn9st0011op51lbu8n2j0	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrtn9hm000aop512w1zybvt	{"name": "규칙a", "email": "rule-mvrtn9d3-a@example.com", "username": "rule-mvrtn9d3-a@example.com", "platformRole": "USER"}	\N	2026-10-28 07:57:23.934
cmvrtn9sz0012op51i2lhl1mu	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrtn9lm000cop51ah3m0hdg	{"name": "규칙b", "email": "rule-mvrtn9d3-b@example.com", "username": "rule-mvrtn9d3-b@example.com", "platformRole": "USER"}	\N	2026-10-28 07:57:23.94
cmvrtn9t20013op517odkhqkv	cmvrtn9ev0000op515tt0moeq	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvrtn9ev0000op515tt0moeq	\N	\N	2026-10-28 07:57:23.942
cmvrtn9t40014op51ppfswhp6	cmvrtn9fm0008op51i96nhoou	cmvrda1rw0000opgd9c0i30ss	group.deleted	Group	cmvrtn9fm0008op51i96nhoou	\N	\N	2026-10-28 07:57:23.944
\.


--
-- Data for Name: Group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Group" (id, name, description, "joinCode", "joinCodeRotatedAt", "joinCodeEnabled", status, "primaryAdminId", "createdById", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmvre1yl90002ope4ov57fjdz	LG전자	\N	6JRF76K4	2026-10-28 00:40:55.389	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 00:40:55.389	2026-10-28 05:15:50.103	2026-10-28 05:15:50.102
de36feaeb5c075dcac873886	데모그룹141541	\N	B9262D91	2026-10-28 05:15:42.136	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:15:42.136	2026-10-28 05:17:32.004	2026-10-28 05:17:32.003
fd4217e15268c35ab5216a65	데모그룹141423	\N	7947F369	2026-10-28 05:14:24.449	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:14:24.449	2026-10-28 05:17:32.855	2026-10-28 05:17:32.854
157e9988a6f27eebd07fde64	데모그룹141911	\N	10D3FA98	2026-10-28 05:19:12.858	t	ACTIVE	9604c4070250c26d769fe911	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	\N
cmvrsjk5n0004opazijdbs45n	임시그룹검증	\N	DIYRNGUV	2026-10-28 07:26:31.116	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:26:31.116	2026-10-28 07:26:31.177	2026-10-28 07:26:31.176
cmvrslocx0000ophvfxhr6j3z	재발급검증	\N	IHGI9OOM	2026-10-28 07:28:10.122	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:28:09.873	2026-10-28 07:28:10.211	2026-10-28 07:28:10.21
cmvrt5s620000op5mgorc4phv	규칙검증mvrt5s3k	\N	KWU7HQOH	2026-10-28 07:43:48.319	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:43:47.93	2026-10-28 07:43:48.453	2026-10-28 07:43:48.452
cmvrt5s6k0008op5mzs38nrhl	규칙검증2mvrt5s3k	\N	UPG47IPT	2026-10-28 07:43:47.949	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:43:47.949	2026-10-28 07:43:48.456	2026-10-28 07:43:48.455
cmvrtn9ev0000op515tt0moeq	규칙검증mvrtn9d3	\N	DLF4G7ZK	2026-10-28 07:57:23.825	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:57:23.432	2026-10-28 07:57:23.941	2026-10-28 07:57:23.941
cmvrtn9fm0008op51i96nhoou	규칙검증2mvrtn9d3	\N	VX14XX15	2026-10-28 07:57:23.459	t	ACTIVE	\N	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:57:23.459	2026-10-28 07:57:23.944	2026-10-28 07:57:23.943
\.


--
-- Data for Name: GroupMembership; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupMembership" (id, "userId", "groupId", role, status, "joinedAt", "leftAt", "updatedAt") FROM stdin;
701fc1404d97639013fe293d	9604c4070250c26d769fe911	157e9988a6f27eebd07fde64	ADMIN	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
948b9e8828ffd65ce818b579	d83086ec58691bc6660eec64	157e9988a6f27eebd07fde64	ADMIN	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
fccff36f4c1f6fe7012815bc	4cad6b16b011512f9047b56e	157e9988a6f27eebd07fde64	ADMIN	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
ce80a69a880836d43bbf55fc	d345cdbe3ac2fb3e1e7a7911	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
037de705d3cb18d8103c03b2	42a7c5442528c215d56cd0e5	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
648de4255266e8cee5999cab	d95147af2e1f078547f543ac	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
886bf88c8e22033be3b5ba5c	5d1702ec0948ce1e9a72e407	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
ac1e5159165cc1d4d0ec3415	f22b958ad256048ecc3180bf	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
241c6a14743db2d6299a6fbb	8d01468f7b0bff70894f72f7	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
440b462233c1a91d7797bd08	e0c9cfc952c9f07b69ee9169	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
3ecd31de1859c2ea5556964f	10a9c2207ecfb3ac29943def	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
cmvrnk7yu000yopiybii7yjj3	cmvrda1rw0000opgd9c0i30ss	cmvre1yl90002ope4ov57fjdz	USER	APPROVED	2026-10-28 05:07:03.894	\N	2026-10-28 05:07:03.894
5064f61c6f191de9fea17982	5afa150be5f214826388a84f	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
273e78fc5265ccb2e138533c	e5d0c3875c1805034d3f2d99	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
2344b5dbe2f8da36eb0977ab	8a1d708c7611064b07dc8f12	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
dbc24da6a42d4fdeb14bfd4c	5905ccdb595213d0507fc883	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
582ba74c5ba2f43d43cde89c	2e293e8c57a2e586dc2add9e	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
abd20eea039944ff62d0c1a0	65ecb5aeaff8942b0bb9ad03	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
e334f1d9e17ca8933c17340a	6e4233089941dcbcca7b5e81	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
4b71a1af6a009dcc05125ac9	1f32a0c7f4aa26f131a0e0b7	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
d8eae777bc4c43654b980992	5718f0263aea5112388d1013	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
2bc0f8c92594f78766a60c8c	9643e9b435edecdeb3cf2a79	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
4843b6bb28f7f3e858699811	fa9a78aabf5a575fa1ba9ba2	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
b91fd275492d12b801a96a39	ce81343faa6f422c9f8e3c27	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
38af7dc97a02f0a0c2b7e899	1946fc19f4efc968e99b30ba	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
fa2c126b5234e878060720fd	02c27f20669f0af4e48ceed4	157e9988a6f27eebd07fde64	USER	APPROVED	2026-10-28 05:19:12.858	\N	2026-10-28 05:19:12.858
\.


--
-- Data for Name: GroupMembershipRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupMembershipRequest" (id, type, "userId", "groupId", status, message, "reviewerId", "reviewNote", "reviewedAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
cmvrogzda0001opc10xc4id1z	GROUP_JOIN	7adceab8e81faed271d75b4e	157e9988a6f27eebd07fde64	CANCELED	\N	\N	\N	\N	2026-11-27 05:32:32.398	2026-10-28 05:32:32.399	2026-10-28 05:32:32.525
cmvrojipn0001opwzthqgjyoh	GROUP_JOIN	7adceab8e81faed271d75b4e	157e9988a6f27eebd07fde64	CANCELED	\N	\N	\N	\N	2026-11-27 05:34:30.778	2026-10-28 05:34:30.779	2026-10-28 05:34:30.884
cmvron4n00001op8hmexnkgqu	GROUP_JOIN	7adceab8e81faed271d75b4e	157e9988a6f27eebd07fde64	CANCELED	\N	\N	\N	\N	2026-11-27 05:37:19.164	2026-10-28 05:37:19.165	2026-10-28 05:37:19.207
cmvrp9dlp0001opo3bjea2x7d	GROUP_JOIN	7adceab8e81faed271d75b4e	157e9988a6f27eebd07fde64	REJECTED	\N	cmvrda1rw0000opgd9c0i30ss	인원 마감	2026-10-28 05:54:37.344	2026-11-27 05:54:37.212	2026-10-28 05:54:37.213	2026-10-28 05:54:37.345
cmvrodkie0001opzno4fztrz0	TEAM_JOIN	fa9a78aabf5a575fa1ba9ba2	157e9988a6f27eebd07fde64	REJECTED	\N	8d01468f7b0bff70894f72f7	그냥	2026-10-28 05:55:07.91	2026-11-27 05:29:53.173	2026-10-28 05:29:53.174	2026-10-28 05:55:07.911
\.


--
-- Data for Name: MembershipRequestTeam; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipRequestTeam" ("requestId", "teamId", approved) FROM stdin;
cmvrodkie0001opzno4fztrz0	241ecef2307ce48cff559d1f	\N
cmvrogzda0001opc10xc4id1z	241ecef2307ce48cff559d1f	\N
cmvrojipn0001opwzthqgjyoh	241ecef2307ce48cff559d1f	\N
cmvron4n00001op8hmexnkgqu	241ecef2307ce48cff559d1f	\N
cmvrp9dlp0001opo3bjea2x7d	241ecef2307ce48cff559d1f	\N
\.


--
-- Data for Name: Team; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Team" (id, "groupId", name, description, "joinCode", "joinCodeRotatedAt", "joinCodeEnabled", "createdById", "createdAt", "updatedAt", "deletedAt", visibility, "requireApproval", "primaryAdminId") FROM stdin;
241ecef2307ce48cff559d1f	157e9988a6f27eebd07fde64	팀A	\N	D0AB7BF7	2026-10-28 05:19:12.858	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:19:12.858	2026-10-28 05:51:11.489	\N	PUBLIC	t	d345cdbe3ac2fb3e1e7a7911
cmvre2d6h0008ope4fit433ys	cmvre1yl90002ope4ov57fjdz	2팀	\N	6K77Q9GA	2026-10-28 00:41:14.297	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 00:41:14.297	2026-10-28 02:32:42.881	\N	PUBLIC	t	\N
cmvrslodk0003ophvso0mkmo9	cmvrslocx0000ophvfxhr6j3z	검증팀	\N	TKRB1W94	2026-10-28 07:28:10.015	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:28:09.897	2026-10-28 07:28:10.126	\N	PUBLIC	t	\N
cmvre28ys0005ope48mdnzjhf	cmvre1yl90002ope4ov57fjdz	1팀	\N	7BTCSDHQ	2026-10-28 00:41:08.835	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 00:41:08.835	2026-10-28 05:09:57.653	\N	PUBLIC	f	\N
8922845be43bd05845dd1b28	de36feaeb5c075dcac873886	팀B	\N	583BD6CB	2026-10-28 05:15:42.136	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:15:42.136	2026-10-28 05:17:22.968	\N	PUBLIC	t	\N
10c898c62f241271369b2849	de36feaeb5c075dcac873886	팀C	\N	A461DD49	2026-10-28 05:15:42.136	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:15:42.136	2026-10-28 05:17:22.984	\N	PUBLIC	t	\N
8fefbf0161e58946013d21b6	de36feaeb5c075dcac873886	팀D	\N	1FBF658E	2026-10-28 05:15:42.136	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:15:42.136	2026-10-28 05:17:23.001	\N	PUBLIC	t	\N
7d808c05565079804afaac47	de36feaeb5c075dcac873886	팀E	\N	4B7E60E9	2026-10-28 05:15:42.136	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:15:42.136	2026-10-28 05:17:23.017	\N	PUBLIC	t	\N
758493cad1d8d9317f33a5f1	de36feaeb5c075dcac873886	팀A	\N	EC4DBDE4	2026-10-28 05:15:42.136	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:15:42.136	2026-10-28 05:17:23.032	\N	PUBLIC	t	\N
cmvrt5s6h0006op5mm92w93vf	cmvrt5s620000op5mgorc4phv	검증B	\N	AOGIUUCO	2026-10-28 07:43:47.945	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:43:47.945	2026-10-28 07:43:48.321	\N	PUBLIC	t	\N
cmvrt5s6b0003op5msqf2m9bu	cmvrt5s620000op5mgorc4phv	검증A	\N	700N5WVK	2026-10-28 07:43:48.303	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:43:47.939	2026-10-28 07:43:48.321	\N	PUBLIC	t	\N
135aeaeb1e9e6c99367ad5ef	fd4217e15268c35ab5216a65	팀B	\N	F003C63E	2026-10-28 05:14:24.449	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:14:24.449	2026-10-28 05:17:26.92	\N	PUBLIC	t	\N
fe3b5c921fb61ccb5d1917eb	fd4217e15268c35ab5216a65	팀C	\N	CC5B4128	2026-10-28 05:14:24.449	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:14:24.449	2026-10-28 05:17:26.94	\N	PUBLIC	t	\N
0cfe5e80bcdc19cfc5ac4fe0	fd4217e15268c35ab5216a65	팀D	\N	B9516ED1	2026-10-28 05:14:24.449	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:14:24.449	2026-10-28 05:17:26.959	\N	PUBLIC	t	\N
028add6e7fdae06213cbc6ae	fd4217e15268c35ab5216a65	팀E	\N	594FA20D	2026-10-28 05:14:24.449	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:14:24.449	2026-10-28 05:17:26.972	\N	PUBLIC	t	\N
8d8c9872f917736a8ece97fb	fd4217e15268c35ab5216a65	팀A	\N	1BA4F383	2026-10-28 05:14:24.449	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:14:24.449	2026-10-28 05:17:26.988	\N	PUBLIC	t	\N
4f37392d1c07b1aaca39f95c	157e9988a6f27eebd07fde64	팀B	\N	E2C92A12	2026-10-28 05:19:12.858	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	\N	PUBLIC	t	42a7c5442528c215d56cd0e5
be3ab1c1dd3b64c96ca51f0b	157e9988a6f27eebd07fde64	팀C	\N	BDCED0D7	2026-10-28 05:19:12.858	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	\N	PUBLIC	t	d95147af2e1f078547f543ac
fdf8e004644eff1b55d92e72	157e9988a6f27eebd07fde64	팀D	\N	F603A45D	2026-10-28 05:19:12.858	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	\N	PUBLIC	t	5d1702ec0948ce1e9a72e407
d2445b9a8a9267dca4adbcc8	157e9988a6f27eebd07fde64	팀E	\N	E550EEC8	2026-10-28 05:19:12.858	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	\N	PUBLIC	t	f22b958ad256048ecc3180bf
cmvrtn9fh0006op517wplfib5	cmvrtn9ev0000op515tt0moeq	검증B	\N	YG8UJPRE	2026-10-28 07:57:23.453	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:57:23.453	2026-10-28 07:57:23.827	\N	PUBLIC	t	\N
cmvrtn9f90003op51xdeu6rxe	cmvrtn9ev0000op515tt0moeq	검증A	\N	FSMRXWU5	2026-10-28 07:57:23.806	t	cmvrda1rw0000opgd9c0i30ss	2026-10-28 07:57:23.445	2026-10-28 07:57:23.827	\N	PUBLIC	t	\N
\.


--
-- Data for Name: TeamMember; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeamMember" (id, "teamId", "userId", "groupId", role, "joinedAt") FROM stdin;
9d14e162a7022b255ce22556	241ecef2307ce48cff559d1f	d345cdbe3ac2fb3e1e7a7911	157e9988a6f27eebd07fde64	ADMIN	2026-10-28 05:19:12.858
9009e2a8bc9005e5820117b7	4f37392d1c07b1aaca39f95c	42a7c5442528c215d56cd0e5	157e9988a6f27eebd07fde64	ADMIN	2026-10-28 05:19:12.858
0a190c7a78bc742a77467a20	be3ab1c1dd3b64c96ca51f0b	d95147af2e1f078547f543ac	157e9988a6f27eebd07fde64	ADMIN	2026-10-28 05:19:12.858
0de9504e4895130361b503bb	fdf8e004644eff1b55d92e72	5d1702ec0948ce1e9a72e407	157e9988a6f27eebd07fde64	ADMIN	2026-10-28 05:19:12.858
1c97617fadbfecaad761bd92	d2445b9a8a9267dca4adbcc8	f22b958ad256048ecc3180bf	157e9988a6f27eebd07fde64	ADMIN	2026-10-28 05:19:12.858
cmvrnk7yx0011opiyqi2ktapm	cmvre28ys0005ope48mdnzjhf	cmvrda1rw0000opgd9c0i30ss	cmvre1yl90002ope4ov57fjdz	USER	2026-10-28 05:07:03.897
042633db54ed4ff02a525fad	241ecef2307ce48cff559d1f	8d01468f7b0bff70894f72f7	157e9988a6f27eebd07fde64	ADMIN	2026-10-28 05:19:12.858
cfff794d3abf545525e91268	241ecef2307ce48cff559d1f	e0c9cfc952c9f07b69ee9169	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
51cb99f27d5ef6acd26a65f4	4f37392d1c07b1aaca39f95c	10a9c2207ecfb3ac29943def	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
73094261bc62fb17263ebeca	be3ab1c1dd3b64c96ca51f0b	5afa150be5f214826388a84f	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
f908917c5364f107fec6130c	fdf8e004644eff1b55d92e72	e5d0c3875c1805034d3f2d99	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
4702f6bb512c77c901ce47eb	d2445b9a8a9267dca4adbcc8	8a1d708c7611064b07dc8f12	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
c7e6e38a5172fcf0b2d14639	241ecef2307ce48cff559d1f	5905ccdb595213d0507fc883	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
2a6a339cfaacdb32ec96ab05	4f37392d1c07b1aaca39f95c	2e293e8c57a2e586dc2add9e	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
f61e0d29bef92ac263756d37	be3ab1c1dd3b64c96ca51f0b	65ecb5aeaff8942b0bb9ad03	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
e06cc48c7cd342d3059c047f	fdf8e004644eff1b55d92e72	6e4233089941dcbcca7b5e81	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
4c22e0b80dc1c4eb48f35614	d2445b9a8a9267dca4adbcc8	1f32a0c7f4aa26f131a0e0b7	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
27cd1e30efad47d5dd577b83	241ecef2307ce48cff559d1f	5718f0263aea5112388d1013	157e9988a6f27eebd07fde64	USER	2026-10-28 05:19:12.858
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, username, "passwordHash", "googleSub", name, "avatarUrl", "platformRole", status, "lastLoginAt", "createdAt", "updatedAt", "birthDate", phone) FROM stdin;
9604c4070250c26d769fe911	user001@example.com	user001	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	김민준	\N	USER	ACTIVE	2026-10-28 06:15:44.14	2026-10-28 05:19:12.858	2026-10-28 06:15:44.14	1998-12-26	010-3521-7592
d83086ec58691bc6660eec64	user002@example.com	user002	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	커피한잔(이서연)	\N	USER	ACTIVE	2026-10-28 07:10:23.222	2026-10-28 05:19:12.858	2026-10-28 07:10:23.223	1985-11-25	010-5339-9409
4cad6b16b011512f9047b56e	user003@example.com	user003	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	박지호	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	2003-09-24	010-7156-1226
d345cdbe3ac2fb3e1e7a7911	user004@example.com	user004	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	새벽세시(최하은)	\N	USER	ACTIVE	2026-10-28 07:11:37.326	2026-10-28 05:19:12.858	2026-10-28 07:11:37.327	1990-08-23	010-8973-3043
42a7c5442528c215d56cd0e5	user005@example.com	user005	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	정도윤	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1977-06-22	010-0790-4861
d95147af2e1f078547f543ac	user006@example.com	user006	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	밤비(강지우)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1994-05-21	010-2608-6678
5d1702ec0948ce1e9a72e407	user007@example.com	user007	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	조수빈	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1981-03-20	010-1657-8495
f22b958ad256048ecc3180bf	user008@example.com	user008	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	라떼한잔(윤예준)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1999-01-19	010-3474-0312
8d01468f7b0bff70894f72f7	user009@example.com	user009	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	장채원	\N	USER	ACTIVE	2026-10-28 05:53:20.132	2026-10-28 05:19:12.858	2026-10-28 05:53:20.133	1986-12-17	010-5291-2129
10a9c2207ecfb3ac29943def	user011@example.com	user011	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	한수아	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1990-01-15	010-8926-5764
5afa150be5f214826388a84f	user012@example.com	user012	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	두근두근(오준서)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1978-11-14	010-0743-7581
e5d0c3875c1805034d3f2d99	user013@example.com	user013	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	신지민	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1995-09-13	010-2560-9398
8a1d708c7611064b07dc8f12	user014@example.com	user014	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	고요한숲(권유진)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1982-08-12	010-4377-1216
5905ccdb595213d0507fc883	user015@example.com	user015	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	황현우	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1999-06-11	010-6195-0265
2e293e8c57a2e586dc2add9e	user016@example.com	user016	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	딸기우유(안다은)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1978-05-10	010-8012-2082
65ecb5aeaff8942b0bb9ad03	user017@example.com	user017	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	류태윤	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1996-03-09	010-9829-3899
6e4233089941dcbcca7b5e81	user018@example.com	user018	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	여름바람(서소율)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1983-01-08	010-1646-5717
1f32a0c7f4aa26f131a0e0b7	user019@example.com	user019	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	전민호	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	2000-12-07	010-3463-7534
5718f0263aea5112388d1013	user020@example.com	user020	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	달빛러너(홍지안)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1987-10-06	010-5281-9351
9643e9b435edecdeb3cf2a79	user021@example.com	user021	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	고은별	\N	USER	ACTIVE	2026-10-28 05:51:11.427	2026-10-28 05:19:12.858	2026-10-28 05:51:11.428	1975-09-05	010-7098-1168
fa9a78aabf5a575fa1ba9ba2	user022@example.com	user022	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	코딩하는고양이(문채윤)	\N	USER	ACTIVE	2026-10-28 05:55:39.088	2026-10-28 05:19:12.858	2026-10-28 05:55:39.089	1992-07-04	010-8915-2985
ce81343faa6f422c9f8e3c27	user023@example.com	user023	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	양서준	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1979-06-03	010-0732-4803
1946fc19f4efc968e99b30ba	user024@example.com	user024	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	파란하늘(배하린)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1996-08-02	010-2550-6620
02c27f20669f0af4e48ceed4	user025@example.com	user025	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	남도현	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1983-06-01	010-1599-8437
7962bffd24ee4ae32e77c10b	user026@example.com	user026	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	초록우산(석민아)	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	2001-05-28	010-3416-0254
e5e9dfc0e9d26a35cf957bac	user027@example.com	user027	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	노건우	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1988-03-27	010-5233-2072
7adceab8e81faed271d75b4e	user028@example.com	user028	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	무지개토끼(여지원)	\N	USER	ACTIVE	2026-10-28 05:57:00.499	2026-10-28 05:19:12.858	2026-10-28 05:57:00.499	1975-02-25	010-7050-3889
93a28ef31ba271e0b7c4411b	user029@example.com	user029	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	차은우	\N	USER	ACTIVE	\N	2026-10-28 05:19:12.858	2026-10-28 05:19:12.858	1992-12-24	010-8868-5706
0aade076c91cf03124517f96	user030@example.com	user030	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	모닝커피(송예린)	\N	USER	ACTIVE	2026-10-28 07:33:28.567	2026-10-28 05:19:12.858	2026-10-28 07:33:28.6	1980-10-23	010-0685-7523
e0c9cfc952c9f07b69ee9169	user010@example.com	user010	$2b$10$RhS7JZpKlBUju2BALc/TnOOmlTclQ6jtIiusivtkuKGvmrzElpncq	\N	별빛산책(임시우)	\N	USER	ACTIVE	2026-10-28 07:57:18.294	2026-10-28 05:19:12.858	2026-10-28 07:57:18.294	2003-10-16	010-7108-3947
cmvrda1rw0000opgd9c0i30ss	\N	master	$2b$10$j0z7x8/XCh0hhGfKMP/3o.4AGnj.yTnd9EWXPx1tCwHP5x/dFsTwq	\N	Master	\N	MASTER	ACTIVE	2026-10-28 07:57:23.419	2026-10-28 00:19:13.148	2026-10-28 07:57:23.42	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3d6a8129-2648-4208-9f09-fd3fa4bab0a2	97dc8eaabc56bc16b7127afabbb3a428e10160196db3481664eb9cc3dc904cc2	2026-10-28 00:08:56.821608+00	20261027045530_init	\N	\N	2026-10-28 00:08:56.810171+00	1
eecfde20-b938-47e4-9c8f-2783346f0c64	696719ab201d3a9becbf7f396d92ec06c8841e6ed83d533c6059591fe85dfd41	2026-10-28 00:08:56.823939+00	20261027070000_group_visibility	\N	\N	2026-10-28 00:08:56.822129+00	1
be940b68-3f1e-4407-b86d-7cf6a6d8c01c	4cb12493b38958117267933dc7d27c56bd1b02693893fc90720349458f49f1d8	2026-10-28 00:08:56.82642+00	20261027080000_name_unique	\N	\N	2026-10-28 00:08:56.824529+00	1
3b062ee1-aac2-4be0-8b22-fb336577676f	e69b15f7ad39b28047c11d94d8477d55d62cc59e03b81e47c9479182a6d92c5b	2026-10-28 01:20:58.863169+00	20261028090000_group_role_user	\N	\N	2026-10-28 01:20:58.846835+00	1
6e0ab096-620d-4dec-ba2a-97083c2602d0	1907b777a3c16cc8ab845700750f18a602297f5e6b40a3d6d67fd6b4b8c393f8	2026-10-28 02:20:59.578437+00	20261028120000_user_status_deactivated	\N	\N	2026-10-28 02:20:59.57436+00	1
8a0d113b-74d1-40e9-930b-145208bf433b	13a77409e6a1fb8c34aae8df9ed0944a74c5b3c561737c53ed49281fd6304e21	2026-10-28 02:34:20.663054+00	20261028130000_group_admin_multi	\N	\N	2026-10-28 02:34:20.657169+00	1
d550078b-1b6e-46d8-9aed-14dd208d639f	00fd5cd073ab4dcf481005769e81279474cd1ba1fe371e76bc34ed29103f3b90	2026-10-28 02:45:53.351659+00	20261028140000_rename_company_group_team	\N	\N	2026-10-28 02:45:53.343781+00	1
f8c7eef3-44b2-4709-bd02-a7b3938c3ecb	ec0569de2e91d47fcef04adaf9e0739b9209709ed2e769c8f8d2bfb3985005f6	2026-10-28 04:46:02.779883+00	20261028150000_user_profile_fields	\N	\N	2026-10-28 04:46:02.773349+00	1
a43e1bfe-0e51-41b7-a498-eeb7da1746ae	02e42bc21f20a17bb62ff7d65a75cae452479cb91de81314f256176841762e50	2026-10-28 05:02:02.632608+00	20261028160000_team_primary_admin	\N	\N	2026-10-28 05:02:02.628526+00	1
68ddc20b-f6f1-46ed-ac89-efc4789dac36	ec66a3b838a92c584af386896aae2d2f8f4bd073b6279d1d4ac2c3b7c3337b7d	2026-10-28 07:40:32.296776+00	20261028170000_user_status_merge	\N	\N	2026-10-28 07:40:32.260867+00	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: GroupMembershipRequest GroupMembershipRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembershipRequest"
    ADD CONSTRAINT "GroupMembershipRequest_pkey" PRIMARY KEY (id);


--
-- Name: GroupMembership GroupMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembership"
    ADD CONSTRAINT "GroupMembership_pkey" PRIMARY KEY (id);


--
-- Name: Group Group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Group"
    ADD CONSTRAINT "Group_pkey" PRIMARY KEY (id);


--
-- Name: MembershipRequestTeam MembershipRequestTeam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipRequestTeam"
    ADD CONSTRAINT "MembershipRequestTeam_pkey" PRIMARY KEY ("requestId", "teamId");


--
-- Name: TeamMember TeamMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY (id);


--
-- Name: Team Team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_groupId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_groupId_createdAt_idx" ON public."AuditLog" USING btree ("groupId", "createdAt");


--
-- Name: AuditLog_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_targetType_targetId_idx" ON public."AuditLog" USING btree ("targetType", "targetId");


--
-- Name: GroupMembershipRequest_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupMembershipRequest_groupId_status_createdAt_idx" ON public."GroupMembershipRequest" USING btree ("groupId", status, "createdAt");


--
-- Name: GroupMembershipRequest_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupMembershipRequest_userId_status_idx" ON public."GroupMembershipRequest" USING btree ("userId", status);


--
-- Name: GroupMembership_groupId_status_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupMembership_groupId_status_role_idx" ON public."GroupMembership" USING btree ("groupId", status, role);


--
-- Name: GroupMembership_userId_groupId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GroupMembership_userId_groupId_key" ON public."GroupMembership" USING btree ("userId", "groupId");


--
-- Name: Group_joinCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Group_joinCode_key" ON public."Group" USING btree ("joinCode");


--
-- Name: Group_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Group_name_key" ON public."Group" USING btree (name) WHERE ("deletedAt" IS NULL);


--
-- Name: TeamMember_groupId_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeamMember_groupId_userId_idx" ON public."TeamMember" USING btree ("groupId", "userId");


--
-- Name: TeamMember_teamId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON public."TeamMember" USING btree ("teamId", "userId");


--
-- Name: Team_groupId_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Team_groupId_deletedAt_idx" ON public."Team" USING btree ("groupId", "deletedAt");


--
-- Name: Team_groupId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Team_groupId_name_key" ON public."Team" USING btree ("groupId", name) WHERE ("deletedAt" IS NULL);


--
-- Name: Team_joinCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Team_joinCode_key" ON public."Team" USING btree ("joinCode");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleSub_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_googleSub_key" ON public."User" USING btree ("googleSub");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: uniq_pending_request; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_pending_request ON public."GroupMembershipRequest" USING btree ("userId", "groupId") WHERE (status = 'PENDING'::public."RequestStatus");


--
-- Name: GroupMembershipRequest GroupMembershipRequest_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembershipRequest"
    ADD CONSTRAINT "GroupMembershipRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GroupMembershipRequest GroupMembershipRequest_reviewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembershipRequest"
    ADD CONSTRAINT "GroupMembershipRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: GroupMembershipRequest GroupMembershipRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembershipRequest"
    ADD CONSTRAINT "GroupMembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GroupMembership GroupMembership_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembership"
    ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GroupMembership GroupMembership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupMembership"
    ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MembershipRequestTeam MembershipRequestTeam_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipRequestTeam"
    ADD CONSTRAINT "MembershipRequestTeam_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."GroupMembershipRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembershipRequestTeam MembershipRequestTeam_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipRequestTeam"
    ADD CONSTRAINT "MembershipRequestTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TeamMember TeamMember_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeamMember TeamMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Team Team_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict Q6KSaSMndC1esKXw6ESBHnCgh9egJWo6dal4SuNhwU1djDEF6CMiDDAzJFetXpL

