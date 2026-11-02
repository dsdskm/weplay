--
-- PostgreSQL database dump
--

\restrict eyRnhfNT8qTzQGsGwXI4bHKcPaMmWsgetLp0HPK2NLzedxgtlmWLqw55ukXldTd

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: FeatureKey; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatureKey" AS ENUM (
    'EMPLOYEE_OF_THE_MONTH',
    'COMPLIMENT_CARD',
    'POINTS_BADGE',
    'MANITTO',
    'ROLLING_PAPER',
    'PHOTO_MISSION',
    'DINNER_VOTE',
    'RANDOM_SURVEY',
    'SNACK_DRAW',
    'BOARD',
    'MINI_GAMES',
    'DUTY_ROSTER',
    'SUGGESTION_BOX'
);


--
-- Name: FeatureStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatureStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


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
-- Name: BadgeDefault; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BadgeDefault" (
    key text NOT NULL,
    target integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL
);


--
-- Name: BingoBoard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BingoBoard" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text NOT NULL,
    week text NOT NULL,
    missions jsonb NOT NULL,
    size integer DEFAULT 3 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BingoCell; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BingoCell" (
    id text NOT NULL,
    "boardId" text NOT NULL,
    index integer NOT NULL,
    "userId" text NOT NULL,
    "mediaUrl" text NOT NULL,
    "mediaType" text NOT NULL,
    caption text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BoardComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BoardComment" (
    id text NOT NULL,
    "postId" text NOT NULL,
    "authorId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BoardPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BoardPost" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    "authorId" text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    anonymous boolean DEFAULT false NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    "hiddenAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ComplimentCard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ComplimentCard" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    month text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    anonymous boolean DEFAULT false NOT NULL,
    "hiddenAt" timestamp(3) without time zone,
    "hiddenById" text
);


--
-- Name: ComplimentReaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ComplimentReaction" (
    id text NOT NULL,
    "cardId" text NOT NULL,
    "userId" text NOT NULL,
    emoji text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ComplimentSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ComplimentSetting" (
    "groupId" text NOT NULL,
    "dailyLimit" integer DEFAULT 3 NOT NULL,
    "updatedById" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "ComplimentSetting_dailyLimit_check" CHECK ((("dailyLimit" >= 1) AND ("dailyLimit" <= 20)))
);


--
-- Name: DailyPick; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyPick" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    "teamId" text,
    date text NOT NULL,
    kind text NOT NULL,
    "promptKey" text NOT NULL,
    answer text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DinnerPlace; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DinnerPlace" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    name text NOT NULL,
    address text,
    lat double precision,
    lng double precision,
    category text,
    link text,
    note text,
    "addedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DinnerPoll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DinnerPoll" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    title text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "closesAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DinnerPollDate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DinnerPollDate" (
    id text NOT NULL,
    "pollId" text NOT NULL,
    date text NOT NULL
);


--
-- Name: DinnerPollPlace; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DinnerPollPlace" (
    id text NOT NULL,
    "pollId" text NOT NULL,
    "placeId" text NOT NULL
);


--
-- Name: DinnerVote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DinnerVote" (
    id text NOT NULL,
    "pollId" text NOT NULL,
    "userId" text NOT NULL,
    kind text NOT NULL,
    "optionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Duty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Duty" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    name text NOT NULL,
    icon text DEFAULT '📌'::text NOT NULL,
    description text,
    mode text DEFAULT 'ROTATION'::text NOT NULL,
    period text DEFAULT 'WEEKLY'::text NOT NULL,
    "memberIds" jsonb NOT NULL,
    "anchorDate" text NOT NULL,
    "offset" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DutyLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DutyLog" (
    id text NOT NULL,
    "dutyId" text NOT NULL,
    "periodKey" text NOT NULL,
    "userId" text NOT NULL,
    "originalId" text,
    status text DEFAULT 'ASSIGNED'::text NOT NULL,
    memo text,
    "doneAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeOfTheMonth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeOfTheMonth" (
    id text CONSTRAINT "EmployeeOfMonth_id_not_null" NOT NULL,
    "groupId" text CONSTRAINT "EmployeeOfMonth_groupId_not_null" NOT NULL,
    month text CONSTRAINT "EmployeeOfMonth_month_not_null" NOT NULL,
    "userId" text CONSTRAINT "EmployeeOfMonth_userId_not_null" NOT NULL,
    note text,
    "selectedById" text CONSTRAINT "EmployeeOfMonth_selectedById_not_null" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT "EmployeeOfMonth_createdAt_not_null" NOT NULL,
    "updatedAt" timestamp(3) without time zone CONSTRAINT "EmployeeOfMonth_updatedAt_not_null" NOT NULL
);


--
-- Name: EmployeeOfTheMonthComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeOfTheMonthComment" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    month text NOT NULL,
    "targetUserId" text NOT NULL,
    "authorId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeOfTheMonthNomination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeOfTheMonthNomination" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    month text NOT NULL,
    "nominatorId" text NOT NULL,
    "nomineeId" text NOT NULL,
    reason text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeOfTheMonthSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeOfTheMonthSetting" (
    "groupId" text NOT NULL,
    "publishDay" integer DEFAULT 1 NOT NULL,
    "updatedById" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "winnerCount" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "EmployeeOfTheMonthSetting_publishDay_check" CHECK ((("publishDay" >= 1) AND ("publishDay" <= 28))),
    CONSTRAINT "EmployeeOfTheMonthSetting_winnerCount_check" CHECK ((("winnerCount" >= 1) AND ("winnerCount" <= 5)))
);


--
-- Name: FeatureConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureConfig" (
    feature public."FeatureKey" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "guideSummary" text,
    "guideBody" text,
    "guideImages" jsonb
);


--
-- Name: FeatureSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureSetting" (
    "groupId" text NOT NULL,
    feature public."FeatureKey" NOT NULL,
    "values" jsonb NOT NULL,
    "updatedById" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GamePhoto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GamePhoto" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    kind text DEFAULT 'BELONGING'::text NOT NULL,
    "mediaUrl" text NOT NULL,
    caption text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GameScore; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GameScore" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    game text NOT NULL,
    value double precision NOT NULL,
    score double precision NOT NULL,
    "playedOn" text NOT NULL,
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
    "deletedAt" timestamp(3) without time zone,
    "storageQuotaMb" integer DEFAULT 1024 NOT NULL
);


--
-- Name: GroupBadgeRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupBadgeRule" (
    "groupId" text NOT NULL,
    key text NOT NULL,
    target integer NOT NULL,
    enabled boolean NOT NULL,
    "updatedById" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GroupFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupFeature" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    feature public."FeatureKey" NOT NULL,
    status public."FeatureStatus" DEFAULT 'PENDING'::public."FeatureStatus" NOT NULL,
    "requestedById" text NOT NULL,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    "rejectReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
-- Name: GroupPointRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupPointRule" (
    "groupId" text NOT NULL,
    metric text NOT NULL,
    points integer NOT NULL,
    "updatedById" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Inquiry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Inquiry" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "groupId" text,
    category text DEFAULT 'ETC'::text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InquiryReply; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InquiryReply" (
    id text NOT NULL,
    "inquiryId" text NOT NULL,
    "authorId" text NOT NULL,
    "fromMaster" boolean DEFAULT false NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ManittoAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ManittoAssignment" (
    id text NOT NULL,
    "roundId" text NOT NULL,
    "giverId" text NOT NULL,
    "receiverId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ManittoMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ManittoMessage" (
    id text NOT NULL,
    "assignmentId" text NOT NULL,
    "senderId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ManittoRound; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ManittoRound" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    status text NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone,
    "endedAt" timestamp(3) without time zone,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
-- Name: Notice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notice" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    "authorId" text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    important boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NoticeRead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NoticeRead" (
    "noticeId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PhotoMission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PhotoMission" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "hostId" text NOT NULL,
    theme text NOT NULL,
    description text,
    "referenceUrl" text,
    "referenceType" text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    deadline timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closedAt" timestamp(3) without time zone
);


--
-- Name: PhotoSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PhotoSubmission" (
    id text NOT NULL,
    "missionId" text NOT NULL,
    "authorId" text NOT NULL,
    "mediaUrl" text NOT NULL,
    "mediaType" text NOT NULL,
    caption text,
    "isBest" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PointAdjustment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PointAdjustment" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    "actorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PointLedger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PointLedger" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    amount integer NOT NULL,
    kind text NOT NULL,
    "refId" text NOT NULL,
    memo text NOT NULL,
    "counterpartId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PointRuleDefault; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PointRuleDefault" (
    metric text NOT NULL,
    points integer NOT NULL
);


--
-- Name: ProfileFact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileFact" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    text text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RollingPaper; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RollingPaper" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "targetUserId" text NOT NULL,
    title text NOT NULL,
    message text,
    theme text DEFAULT 'YELLOW'::text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "closeAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RollingPaperNote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RollingPaperNote" (
    id text NOT NULL,
    "paperId" text NOT NULL,
    "authorId" text NOT NULL,
    body text NOT NULL,
    color text NOT NULL,
    rotation integer DEFAULT 0 NOT NULL,
    anonymous boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SnackGame; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SnackGame" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    title text NOT NULL,
    status text DEFAULT 'RECRUITING'::text NOT NULL,
    "winnerCount" integer DEFAULT 1 NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "doneAt" timestamp(3) without time zone
);


--
-- Name: SnackParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SnackParticipant" (
    id text NOT NULL,
    "gameId" text NOT NULL,
    "userId" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SnackSlot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SnackSlot" (
    id text NOT NULL,
    "gameId" text NOT NULL,
    "position" integer NOT NULL,
    "isWinner" boolean NOT NULL,
    "drawnById" text,
    "drawnAt" timestamp(3) without time zone
);


--
-- Name: Suggestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Suggestion" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    "authorId" text NOT NULL,
    anonymous boolean DEFAULT false NOT NULL,
    category text DEFAULT 'ETC'::text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'RECEIVED'::text NOT NULL,
    answer text,
    "answeredById" text,
    "answeredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SuggestionVote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SuggestionVote" (
    "suggestionId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Survey; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Survey" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "authorId" text NOT NULL,
    title text NOT NULL,
    description text,
    anonymous boolean DEFAULT true NOT NULL,
    "launchMode" text DEFAULT 'MANUAL'::text NOT NULL,
    status text DEFAULT 'QUEUED'::text NOT NULL,
    "rejectReason" text,
    "launchAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SurveyQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurveyQuestion" (
    id text NOT NULL,
    "surveyId" text NOT NULL,
    "position" integer NOT NULL,
    text text NOT NULL,
    type text NOT NULL,
    options jsonb
);


--
-- Name: SurveyResponse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurveyResponse" (
    id text NOT NULL,
    "surveyId" text NOT NULL,
    "userId" text NOT NULL,
    answers jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SystemNotice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemNotice" (
    id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    level text DEFAULT 'INFO'::text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    banner boolean DEFAULT false NOT NULL,
    published boolean DEFAULT true NOT NULL,
    "startsAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
-- Name: Terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Terms" (
    id text NOT NULL,
    type text NOT NULL,
    version integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "effectiveAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TermsAgreement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TermsAgreement" (
    id text NOT NULL,
    "termsId" text NOT NULL,
    "userId" text NOT NULL,
    "agreedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TurnEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TurnEntry" (
    id text NOT NULL,
    "gameId" text NOT NULL,
    "userId" text NOT NULL,
    kind text NOT NULL,
    text text,
    "mediaUrl" text,
    reply text,
    "targetUserId" text,
    correct boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TurnGame; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TurnGame" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "teamId" text,
    type text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'RECRUITING'::text NOT NULL,
    config jsonb NOT NULL,
    "createdById" text NOT NULL,
    "currentUserId" text,
    "turnIndex" integer DEFAULT 0 NOT NULL,
    "turnDeadline" timestamp(3) without time zone,
    result jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "endedAt" timestamp(3) without time zone
);


--
-- Name: TurnParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TurnParticipant" (
    id text NOT NULL,
    "gameId" text NOT NULL,
    "userId" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
cmvta8djd0004opx4gtluah0a	5c5848001eb7ca3edb5f1d9a	\N	employee_of_the_month.auto_select	EmployeeOfTheMonth	5c5848001eb7ca3edb5f1d9a	\N	{"picks": [{"month": "2026-10", "userId": "0689dbc7-0ec7-42ef-8625-73fea7a406ce"}, {"month": "2026-10", "userId": "1a398608-3edb-41e6-86dc-e16415bab310"}]}	2026-10-29 08:29:28.586
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
cmvtb3xvg0002optgbkxndr90	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	feature.request	GroupFeature	cmvtb3xvc0001optga0ezjrez	\N	{"feature": "MANITTO"}	2026-10-29 08:54:01.276
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
cmvtb412w0003optgrvd7h8cb	5c5848001eb7ca3edb5f1d9a	cmvrda1rw0000opgd9c0i30ss	feature.approve	GroupFeature	cmvtb3xvc0001optga0ezjrez	{"status": "PENDING"}	{"reason": null, "status": "APPROVED"}	2026-10-29 08:54:05.432
cmvrnnmqp0006op41rrfd6gr3	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrnnmpw0000op41w6qc1jwn	\N	{"teams": [{"role": "ADMIN", "teamId": "cmvre28ys0005ope48mdnzjhf"}], "groups": [{"role": "ADMIN", "groupId": "cmvre1yl90002ope4ov57fjdz"}]}	2026-10-28 05:09:43.01
cmvtckbvo0002op5ao16snfbn	\N	cmvrda1rw0000opgd9c0i30ss	feature.deactivate	FeatureConfig	MINI_GAMES	{"active": true}	{"active": false}	2026-10-29 09:34:45.541
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
cmvtckbyv0003op5ayu2yoeyt	\N	cmvrda1rw0000opgd9c0i30ss	feature.activate	FeatureConfig	MINI_GAMES	{"active": false}	{"active": true}	2026-10-29 09:34:45.655
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
cmvtcpopq0000op4c6pwvydi7	\N	cmvrda1rw0000opgd9c0i30ss	feature.default_on	FeatureConfig	BOARD	{"isDefault": false}	{"isDefault": true, "autoApproved": 0}	2026-10-29 09:38:55.454
cmvtcq6xi000aop4c61d77u1x	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	snack_draw.cancel	SnackGame	cmvtcpuuy0005op4ch1yegsj7	\N	\N	2026-10-29 09:39:19.062
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
cmvtcporo0003op4c7n2udljh	5c5848001eb7ca3edb5f1d9a	cmvrda1rw0000opgd9c0i30ss	feature.revoke	GroupFeature	cmvtcpork0002op4crj7narjc	{"status": "DEFAULT"}	{"reason": "테스트", "status": "REJECTED"}	2026-10-29 09:38:55.525
cmvtcpuv20008op4cwzqiz815	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	snack_draw.create	SnackGame	cmvtcpuuy0005op4ch1yegsj7	\N	{"title": "222"}	2026-10-29 09:39:03.423
cmvrshofy0004op2276i7w179	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [{"role": "USER", "teamId": "241ecef2307ce48cff559d1f"}], "groups": [{"role": "USER", "groupId": "157e9988a6f27eebd07fde64"}]}	2026-10-28 07:25:03.358
cmvrshogx0005op224dtz2exa	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [], "groups": []}	2026-10-28 07:25:03.394
cmvrsjfvw0003opaza6k3eq05	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [], "groups": []}	2026-10-28 07:26:25.58
cmvrsjk700009opazd4ukvxoy	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [], "groups": []}	2026-10-28 07:26:31.165
cmvrsloea0009ophv8b80kevg	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	0aade076c91cf03124517f96	\N	{"teams": [{"role": "USER", "teamId": "cmvrslodk0003ophvso0mkmo9"}], "groups": [{"role": "USER", "groupId": "cmvrslocx0000ophvfxhr6j3z"}]}	2026-10-28 07:28:09.923
cmvrss1vf0000opuivfclnyqv	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:07.324
cmvrss2020001opuiv2d287qd	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:07.491
cmvrssi700000opyrxq5mo52v	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:28.476
cmvrssiag0001opyrx73s20hp	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	0aade076c91cf03124517f96	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "DEACTIVATED", "platformRole": "USER"}	{"name": "모닝커피(송예린)", "email": "user030@example.com", "status": "ACTIVE", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:33:28.601
cmvrt5s8v000bop5m099srfze	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrt5s8p000aop5mmcgdg9sb	\N	{"platformRole": "USER"}	2026-10-28 07:43:48.031
cmvrt5scr000dop5mh6ni0qyj	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrt5scp000cop5m77kcaam1	\N	{"platformRole": "USER"}	2026-10-28 07:43:48.171
cmvrt5sfh000iop5mg6s7u88h	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrt5s8p000aop5mmcgdg9sb	\N	{"teams": [{"role": "USER", "teamId": "cmvrt5s6b0003op5msqf2m9bu"}], "groups": [{"role": "USER", "groupId": "cmvrt5s620000op5mgorc4phv"}]}	2026-10-28 07:43:48.269
cmvrt5sgr000uop5mt2ldg3t5	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrt5s8p000aop5mmcgdg9sb	\N	{"teams": [{"role": "USER", "teamId": "cmvrt5s6b0003op5msqf2m9bu"}], "groups": [{"role": "USER", "groupId": "cmvrt5s620000op5mgorc4phv"}]}	2026-10-28 07:43:48.315
cmvtcpvhm0009op4ch596ohhv	\N	cmvrda1rw0000opgd9c0i30ss	feature.default_off	FeatureConfig	BOARD	{"isDefault": true}	{"isDefault": false, "autoApproved": 0}	2026-10-29 09:39:04.234
cmvrt5shv0010op5mcdx5pq9s	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	cmvrt5scp000cop5m77kcaam1	{"name": "규칙b", "email": "rule-mvrt5s3k-b@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "규칙b", "email": "rule-mvrt5s3k-b@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:43:48.355
cmvrt5sk90011op5mbhz61e7c	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrt5s8p000aop5mmcgdg9sb	{"name": "규칙a", "email": "rule-mvrt5s3k-a@example.com", "username": "rule-mvrt5s3k-a@example.com", "platformRole": "USER"}	\N	2026-10-28 07:43:48.442
cmvrt5ski0012op5m7nc86zas	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrt5scp000cop5m77kcaam1	{"name": "규칙b", "email": "rule-mvrt5s3k-b@example.com", "username": "rule-mvrt5s3k-b@example.com", "platformRole": "USER"}	\N	2026-10-28 07:43:48.451
cmvrtn9hr000bop51lui17pg7	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrtn9hm000aop512w1zybvt	\N	{"platformRole": "USER"}	2026-10-28 07:57:23.536
cmvrtn9lo000dop51e9zbc83t	\N	cmvrda1rw0000opgd9c0i30ss	user.created	User	cmvrtn9lm000cop51ah3m0hdg	\N	{"platformRole": "USER"}	2026-10-28 07:57:23.676
cmvrtn9o9000iop51b40ir8j6	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrtn9hm000aop512w1zybvt	\N	{"teams": [{"role": "USER", "teamId": "cmvrtn9f90003op51xdeu6rxe"}], "groups": [{"role": "USER", "groupId": "cmvrtn9ev0000op515tt0moeq"}]}	2026-10-28 07:57:23.77
cmvrtn9pp000uop51lwqzmasy	\N	cmvrda1rw0000opgd9c0i30ss	user.memberships.updated	User	cmvrtn9hm000aop512w1zybvt	\N	{"teams": [{"role": "USER", "teamId": "cmvrtn9f90003op51xdeu6rxe"}], "groups": [{"role": "USER", "groupId": "cmvrtn9ev0000op515tt0moeq"}]}	2026-10-28 07:57:23.821
cmvrtn9ql0010op512echsx5a	\N	cmvrda1rw0000opgd9c0i30ss	user.updated	User	cmvrtn9lm000cop51ah3m0hdg	{"name": "규칙b", "email": "rule-mvrtn9d3-b@example.com", "status": "ACTIVE", "platformRole": "USER"}	{"name": "규칙b", "email": "rule-mvrtn9d3-b@example.com", "status": "DEACTIVATED", "platformRole": "USER", "passwordChanged": false}	2026-10-28 07:57:23.853
cmvrtn9st0011op51lbu8n2j0	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrtn9hm000aop512w1zybvt	{"name": "규칙a", "email": "rule-mvrtn9d3-a@example.com", "username": "rule-mvrtn9d3-a@example.com", "platformRole": "USER"}	\N	2026-10-28 07:57:23.934
cmvrtn9sz0012op51i2lhl1mu	\N	cmvrda1rw0000opgd9c0i30ss	user.deleted	User	cmvrtn9lm000cop51ah3m0hdg	{"name": "규칙b", "email": "rule-mvrtn9d3-b@example.com", "username": "rule-mvrtn9d3-b@example.com", "platformRole": "USER"}	\N	2026-10-28 07:57:23.94
cmvta73sz0000opx4mwcugyd7	5c5848001eb7ca3edb5f1d9a	cmvrda1rw0000opgd9c0i30ss	groupMembership.role.changed	GroupMembership	7d3373f0-eb01-40a3-9219-026ed5bae100	{"role": "USER"}	{"role": "ADMIN"}	2026-10-29 08:28:29.316
cmvta73tf0001opx4wh0928k7	5c5848001eb7ca3edb5f1d9a	cmvrda1rw0000opgd9c0i30ss	group.primary_admin.changed	Group	5c5848001eb7ca3edb5f1d9a	{"primaryAdminId": "7ecdb42f-2194-45b1-8f4b-f399996af2b8"}	{"primaryAdminId": "7ecdb42f-2194-45b1-8f4b-f399996af2b8"}	2026-10-29 08:28:29.332
\.


--
-- Data for Name: BadgeDefault; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BadgeDefault" (key, target, enabled) FROM stdin;
FIRST_COMPLIMENT	1	t
COMPLIMENT_MAKER	10	t
POPULAR	10	t
NOMINATOR	5	t
MVP	1	t
TALKER	10	t
PAPER_WRITER	5	t
PHOTO_ROOKIE	5	t
MISSION_HOST	1	t
BEST_CUT	1	t
VOTER	5	t
SURVEYOR	5	t
SURVEY_MAKER	3	t
SNACK_ANGEL	1	t
WRITER	5	t
COMMENTER	20	t
GAMER	7	t
\.


--
-- Data for Name: BingoBoard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BingoBoard" (id, "groupId", "teamId", week, missions, size, "createdAt") FROM stdin;
cmvyk2x760001opkriafamq2o	5c5848001eb7ca3edb5f1d9a	0449c2085cbb9704a6021685	2026-11-02	["키보드 클로즈업", "줄무늬", "반짝이는 것", "좋아하는 간식", "세상에서 제일 이상한 물건", "둥근 물건", "오늘 마신 음료", "세 가지 색이 한 컷에", "동물 사진"]	3	2026-11-02 01:04:01.17
\.


--
-- Data for Name: BingoCell; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BingoCell" (id, "boardId", index, "userId", "mediaUrl", "mediaType", caption, "createdAt") FROM stdin;
\.


--
-- Data for Name: BoardComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BoardComment" (id, "postId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
c4a2ffbc-fae7-471e-8d0e-99270bfa992d	3bbd6b6b-ae78-44c7-8dda-c7fe1f923228	33bfc592-2a58-4b7a-8775-03b3c0dac293	공감합니다 👍	2026-10-26 11:55:12.273	2026-10-29 09:22:45.37
864b0ba3-5439-4d49-b540-4c9dff6674dc	f063f54d-0f79-46ee-af2a-0dc991320bc3	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	저도 궁금했어요 🙋	2026-10-27 23:28:07.354	2026-10-29 09:22:45.37
45bc665f-2a4f-443d-ac21-708340120d85	182f8a88-0637-454d-a2c2-4072d6113f2f	f4dc3955-250f-4515-a453-44c3c3f9838d	공감합니다 👍	2026-10-28 11:37:23.981	2026-10-29 09:22:45.37
60b6cbf3-845f-44a0-960d-5d00925334d9	24412ae3-7e1f-4343-b544-02fa8e36805b	a2da8743-0244-4399-9c94-724c93b7f0b4	참여할게요!	2026-10-27 06:21:11.147	2026-10-29 09:22:45.37
fe71b421-aced-40a7-8cf8-da50cdf1b7fe	429b31b1-1a8e-4be9-ab07-80e48d926419	616d01b4-afce-43ed-b57d-caf88803fe9e	다음에 같이 가요~	2026-10-26 16:11:27.949	2026-10-29 09:22:45.37
bd8c0c36-a109-4ca7-8acd-1d93d6c15153	9b8378ae-8b9d-4728-baab-66c48827e432	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	좋은 글 감사해요!	2026-10-27 10:00:37.5	2026-10-29 09:22:45.37
2ceb5801-d542-4349-a7b5-41b7e6006d73	befc607f-34fc-47d7-b3c6-70fe4413b126	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	다음에 같이 가요~	2026-10-28 22:52:53.222	2026-10-29 09:22:45.37
c033f600-7d17-477b-bc8a-edf34304f67e	e36e96be-619e-400f-a7e9-ed8dd774fd1d	469fb89a-fe8d-4132-82fb-1117609d0d7b	좋은 글 감사해요!	2026-10-27 15:00:03.442	2026-10-29 09:22:45.37
62576d91-8c10-4a6a-8ab7-68e9ce6e18ce	da96b6e8-89bf-4c11-84bc-39be594d12d6	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	공감합니다 👍	2026-10-27 19:45:04.968	2026-10-29 09:22:45.37
756326f8-3ec1-424a-8a66-533627413fe0	cf4dc98f-a1ea-4637-853e-d57d10dae6df	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	공감합니다 👍	2026-10-29 04:29:54.043	2026-10-29 09:22:45.37
1dc1af92-bed4-4ec9-9150-c689302988e9	f063f54d-0f79-46ee-af2a-0dc991320bc3	469fb89a-fe8d-4132-82fb-1117609d0d7b	좋은 글 감사해요!	2026-10-28 20:02:36.218	2026-10-29 09:22:45.37
2b30860b-986a-4af0-9fc4-5ebc7bd7a2f7	24412ae3-7e1f-4343-b544-02fa8e36805b	c55107c7-b1e6-48dc-be93-f0e845acbdce	참여할게요!	2026-10-27 00:39:50.979	2026-10-29 09:22:45.37
a455e3d0-06dc-41fd-b1af-3fd79eed7e52	1ab52bd2-e3bc-43cf-94eb-dfba26e0a937	10dd366a-993b-4297-9799-efd799518e9c	좋은 글 감사해요!	2026-10-26 06:54:46.413	2026-10-29 09:22:45.37
06df4fc4-a313-4d4a-a485-1b45086a0d4a	6397cd35-3f76-4ced-b0f9-c861300928a8	616d01b4-afce-43ed-b57d-caf88803fe9e	저도 궁금했어요 🙋	2026-10-28 03:29:23.675	2026-10-29 09:22:45.37
802d6c60-8ecb-4fb4-a3b4-b3ac4c42084b	4ea386e2-4df0-4bc3-8fd0-b46777844d52	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	다음에 같이 가요~	2026-10-26 09:29:29.066	2026-10-29 09:22:45.37
116d92f3-d976-4dc1-a056-c8ee3282dab9	90fcf233-92cc-4db2-bb7b-c8f6757fe6d8	7e6721aa-8ade-49a8-ade5-6bf2586a606c	참여할게요!	2026-10-25 16:43:48.459	2026-10-29 09:22:45.37
027d7f85-d892-437a-a7b4-8ee490877a89	befc607f-34fc-47d7-b3c6-70fe4413b126	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	공감합니다 👍	2026-10-26 23:57:36.388	2026-10-29 09:22:45.37
b6f7d50a-4354-4cb2-bed0-43ec25d2d7f4	e36e96be-619e-400f-a7e9-ed8dd774fd1d	616d01b4-afce-43ed-b57d-caf88803fe9e	공감합니다 👍	2026-10-28 00:24:05.786	2026-10-29 09:22:45.37
83bae560-a497-45fb-8f54-7273e94df982	3bbd6b6b-ae78-44c7-8dda-c7fe1f923228	d046a5d5-2a39-420a-995d-ca1ddd237723	참여할게요!	2026-10-29 03:57:47.287	2026-10-29 09:22:45.37
902f7593-e6c6-46c1-bd31-ffe18b6ecebe	24412ae3-7e1f-4343-b544-02fa8e36805b	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	다음에 같이 가요~	2026-10-28 05:29:46.94	2026-10-29 09:22:45.37
eff1c0b2-951a-4c6d-960a-74397d78aba0	1ab52bd2-e3bc-43cf-94eb-dfba26e0a937	10dd366a-993b-4297-9799-efd799518e9c	ㅋㅋㅋ 맞아요	2026-10-27 03:11:47.054	2026-10-29 09:22:45.37
b546981e-8c92-454e-8fe2-1503ce1df420	9b8378ae-8b9d-4728-baab-66c48827e432	e6631004-24e5-4ff6-9dff-c880f38dc227	다음에 같이 가요~	2026-10-28 16:16:22.689	2026-10-29 09:22:45.37
93c4122a-eec2-4d62-8a62-70bff2c67c6f	6397cd35-3f76-4ced-b0f9-c861300928a8	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	공감합니다 👍	2026-10-26 13:54:30.051	2026-10-29 09:22:45.37
f57b1b6b-7120-4e87-89b7-8502b57cf037	4ea386e2-4df0-4bc3-8fd0-b46777844d52	415caa6d-731a-4ad9-a412-a928e09264b1	참여할게요!	2026-10-26 07:16:16.297	2026-10-29 09:22:45.37
15dc1f15-4077-4b4a-91a8-b5753d0a3de1	90fcf233-92cc-4db2-bb7b-c8f6757fe6d8	3eecafc3-7b6d-4409-a8cf-101d10139dcc	공감합니다 👍	2026-10-28 23:51:32.045	2026-10-29 09:22:45.37
3d5159bf-0c3e-4e75-8bcb-db43e71a2556	befc607f-34fc-47d7-b3c6-70fe4413b126	3eecafc3-7b6d-4409-a8cf-101d10139dcc	저도 궁금했어요 🙋	2026-10-25 12:59:40.097	2026-10-29 09:22:45.37
1d73947a-1ba6-4140-b18d-256e3e57697a	da96b6e8-89bf-4c11-84bc-39be594d12d6	c6506cc9-39be-4912-ad62-b57a3242549c	다음에 같이 가요~	2026-10-28 10:21:48.864	2026-10-29 09:22:45.37
830bc360-e65e-4a06-abcf-179b5f769168	c20c997c-4052-441e-81a8-ae50e04e3cf9	4227074a-be01-4a63-8f35-83455ffc653e	공감합니다 👍	2026-10-27 04:49:13.505	2026-10-29 09:22:45.37
8a6f1ae5-b7a2-40c7-a1f3-04b551051216	891176da-c848-4c2a-904e-262d4393bce4	415caa6d-731a-4ad9-a412-a928e09264b1	다음에 같이 가요~	2026-10-28 16:15:19.826	2026-10-29 09:22:45.37
e3900831-2d6f-4325-bb29-716302e94cc9	3bbd6b6b-ae78-44c7-8dda-c7fe1f923228	c3108591-b396-4f8e-b3f7-73ba302fde9f	다음에 같이 가요~	2026-10-27 11:47:33.486	2026-10-29 09:22:45.37
83e1264e-b67a-459f-8666-8a27231e972a	f063f54d-0f79-46ee-af2a-0dc991320bc3	7ecdb42f-2194-45b1-8f4b-f399996af2b8	저도 궁금했어요 🙋	2026-10-29 00:39:58.936	2026-10-29 09:22:45.37
a503747f-4b0d-4ffa-97ab-29519b460dc2	429b31b1-1a8e-4be9-ab07-80e48d926419	e93bad82-e81d-45d2-8bed-edd34446ee99	좋은 글 감사해요!	2026-10-28 05:35:41.37	2026-10-29 09:22:45.37
28d9c5da-d254-40e5-8915-4658c2e1fd30	9b8378ae-8b9d-4728-baab-66c48827e432	e6631004-24e5-4ff6-9dff-c880f38dc227	저도 궁금했어요 🙋	2026-10-27 07:48:54.602	2026-10-29 09:22:45.37
f3aa6a6b-c886-4cd0-a26d-93d7ff80a0e5	4ea386e2-4df0-4bc3-8fd0-b46777844d52	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	다음에 같이 가요~	2026-10-29 03:24:45.808	2026-10-29 09:22:45.37
c680104f-57ab-4444-be97-b604a15370d0	befc607f-34fc-47d7-b3c6-70fe4413b126	56c18c2f-d43a-4f06-92a0-ad785f48d942	저도 궁금했어요 🙋	2026-10-27 00:43:25.539	2026-10-29 09:22:45.37
8c592c20-a46f-4c77-b6f5-692df4292439	e36e96be-619e-400f-a7e9-ed8dd774fd1d	3515b570-e1cd-4f5c-a65d-67f76e560e99	참여할게요!	2026-10-27 11:09:42.326	2026-10-29 09:22:45.37
69cd5cd6-8d77-408f-81ec-1cc0b42adf2c	c20c997c-4052-441e-81a8-ae50e04e3cf9	aa23cb8d-261f-4a2e-9bd2-771759659a4c	ㅋㅋㅋ 맞아요	2026-10-25 21:20:08.923	2026-10-29 09:22:45.37
85dc674a-5313-4eec-9663-f4dc1688e820	cf4dc98f-a1ea-4637-853e-d57d10dae6df	e93bad82-e81d-45d2-8bed-edd34446ee99	저도 궁금했어요 🙋	2026-10-28 00:11:49.645	2026-10-29 09:22:45.37
92b5a4f0-6090-4012-a81c-f515a57cac15	9bde83ee-3f4a-4977-a062-ccde4270524f	469fb89a-fe8d-4132-82fb-1117609d0d7b	저도 궁금했어요 🙋	2026-10-28 08:22:58.37	2026-10-29 09:22:45.37
\.


--
-- Data for Name: BoardPost; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BoardPost" (id, "groupId", "teamId", "authorId", title, body, anonymous, pinned, "hiddenAt", "createdAt", "updatedAt") FROM stdin;
3bbd6b6b-ae78-44c7-8dda-c7fe1f923228	5c5848001eb7ca3edb5f1d9a	\N	3eecafc3-7b6d-4409-a8cf-101d10139dcc	📌 게시판 이용 안내	서로 존중하는 말투로 자유롭게 이야기해요. 불편한 글은 관리자에게 알려 주세요.	f	t	\N	2026-10-27 03:14:42.663	2026-10-29 09:22:45.37
f063f54d-0f79-46ee-af2a-0dc991320bc3	5c5848001eb7ca3edb5f1d9a	\N	e93bad82-e81d-45d2-8bed-edd34446ee99	점심 맛집 추천해주세요	회사 근처에 새로 생긴 곳 가보신 분 있나요?	f	f	\N	2026-10-27 04:35:55.973	2026-10-29 09:22:45.37
182f8a88-0637-454d-a2c2-4072d6113f2f	5c5848001eb7ca3edb5f1d9a	\N	415caa6d-731a-4ad9-a412-a928e09264b1	이번 주 금요일 번개 어때요?	퇴근 후 가볍게 한잔 하실 분 댓글 남겨주세요 🍻	f	f	\N	2026-10-26 22:23:52.706	2026-10-29 09:22:45.37
24412ae3-7e1f-4343-b544-02fa8e36805b	5c5848001eb7ca3edb5f1d9a	\N	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	재택 꿀팁 공유	집중 잘 되는 노하우 있으면 알려주세요.	f	f	\N	2026-10-26 08:38:28.457	2026-10-29 09:22:45.37
1ab52bd2-e3bc-43cf-94eb-dfba26e0a937	5c5848001eb7ca3edb5f1d9a	\N	1b47bac3-4ea3-4b82-9631-39730990e8fb	책 추천 받아요	요즘 읽을 만한 책 있을까요?	f	f	\N	2026-10-24 15:05:08.108	2026-10-29 09:22:45.37
429b31b1-1a8e-4be9-ab07-80e48d926419	5c5848001eb7ca3edb5f1d9a	\N	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	사무실 에어컨 너무 추워요	혹시 저만 그런가요? 😂	f	f	\N	2026-10-27 15:54:07.283	2026-10-29 09:22:45.37
9b8378ae-8b9d-4728-baab-66c48827e432	5c5848001eb7ca3edb5f1d9a	\N	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	주말에 다녀온 곳	근교 드라이브 코스 추천합니다. 사진은 다음에 올릴게요!	f	f	\N	2026-10-26 21:01:25.999	2026-10-29 09:22:45.37
6397cd35-3f76-4ced-b0f9-c861300928a8	5c5848001eb7ca3edb5f1d9a	\N	b6bedee2-168d-4f81-b03e-b58676faa40d	스터디 같이 하실 분	주 1회 가볍게 모여서 공부해요.	f	f	\N	2026-10-27 12:03:41.615	2026-10-29 09:22:45.37
4ea386e2-4df0-4bc3-8fd0-b46777844d52	5c5848001eb7ca3edb5f1d9a	0449c2085cbb9704a6021685	4ed9481a-8c95-43ba-8832-95d3bb44473a	팀 공지·잡담 1	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 01)	f	f	\N	2026-10-26 21:00:38.009	2026-10-29 09:22:45.37
b128f764-5d66-4aad-9a95-290251759e65	5c5848001eb7ca3edb5f1d9a	4eebcc0527185430cb6131f3	415caa6d-731a-4ad9-a412-a928e09264b1	팀 공지·잡담 1	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 05)	f	f	\N	2026-10-27 01:13:55.705	2026-10-29 09:22:45.37
90fcf233-92cc-4db2-bb7b-c8f6757fe6d8	5c5848001eb7ca3edb5f1d9a	74abdcbb6d36b4cec40314f4	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	팀 공지·잡담 1	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 02)	f	f	\N	2026-10-24 10:36:56.854	2026-10-29 09:22:45.37
befc607f-34fc-47d7-b3c6-70fe4413b126	5c5848001eb7ca3edb5f1d9a	7a6a729939156ed1886151f2	7ecdb42f-2194-45b1-8f4b-f399996af2b8	팀 공지·잡담 1	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 04)	f	f	\N	2026-10-25 19:07:26.017	2026-10-29 09:22:45.37
e36e96be-619e-400f-a7e9-ed8dd774fd1d	5c5848001eb7ca3edb5f1d9a	ebd2ae9cbcfc4f01470b38f3	56c18c2f-d43a-4f06-92a0-ad785f48d942	팀 공지·잡담 1	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 03)	f	f	\N	2026-10-26 15:42:30.78	2026-10-29 09:22:45.37
da96b6e8-89bf-4c11-84bc-39be594d12d6	5c5848001eb7ca3edb5f1d9a	0449c2085cbb9704a6021685	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	팀 공지·잡담 2	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 01)	f	f	\N	2026-10-29 05:31:05.311	2026-10-29 09:22:45.37
c20c997c-4052-441e-81a8-ae50e04e3cf9	5c5848001eb7ca3edb5f1d9a	4eebcc0527185430cb6131f3	607bf496-70ab-4622-89d8-433736254355	팀 공지·잡담 2	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 05)	f	f	\N	2026-10-28 13:32:06.553	2026-10-29 09:22:45.37
891176da-c848-4c2a-904e-262d4393bce4	5c5848001eb7ca3edb5f1d9a	74abdcbb6d36b4cec40314f4	de04573b-8d39-4c09-9510-054e044ab033	팀 공지·잡담 2	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 02)	f	f	\N	2026-10-26 23:42:33.464	2026-10-29 09:22:45.37
cf4dc98f-a1ea-4637-853e-d57d10dae6df	5c5848001eb7ca3edb5f1d9a	7a6a729939156ed1886151f2	4227074a-be01-4a63-8f35-83455ffc653e	팀 공지·잡담 2	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 04)	t	f	\N	2026-10-25 12:14:18.509	2026-10-29 09:22:45.37
9bde83ee-3f4a-4977-a062-ccde4270524f	5c5848001eb7ca3edb5f1d9a	ebd2ae9cbcfc4f01470b38f3	e6631004-24e5-4ff6-9dff-c880f38dc227	팀 공지·잡담 2	우리 팀 이야기를 편하게 남겨 주세요. (데모팀 03)	f	f	\N	2026-10-24 20:04:05.119	2026-10-29 09:22:45.37
\.


--
-- Data for Name: ComplimentCard; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ComplimentCard" (id, "groupId", "senderId", "receiverId", month, body, "createdAt", anonymous, "hiddenAt", "hiddenById") FROM stdin;
\.


--
-- Data for Name: ComplimentReaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ComplimentReaction" (id, "cardId", "userId", emoji, "createdAt") FROM stdin;
\.


--
-- Data for Name: ComplimentSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ComplimentSetting" ("groupId", "dailyLimit", "updatedById", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DailyPick; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DailyPick" (id, "groupId", "userId", "teamId", date, kind, "promptKey", answer, "createdAt") FROM stdin;
39974dd0-10be-4599-97f2-9a18c3a7779a	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-11-02	TELEPATHY	T4	2	2026-11-02 01:22:51.003
8d9a11c7-810b-43aa-afeb-4c715f92aec0	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-11-02	BALANCE	B7	A	2026-11-02 01:22:51.003
03d65813-5914-4006-8d46-98f04914ec23	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-11-01	BALANCE	B1	B	2026-11-01 01:22:51.003
e1f41818-d23d-4a93-bf86-d3d91c767940	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-10-31	TELEPATHY	T5	3	2026-10-31 01:22:51.003
69c6d5a7-ffdb-42aa-b403-14f3766c9fcc	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-10-30	TELEPATHY	T4	2	2026-10-30 01:22:51.003
e942fe1e-0f32-419a-bfc9-a88f18b8bc91	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-10-30	BALANCE	B1	A	2026-10-30 01:22:51.003
2834f31b-ffba-4a57-9364-0c3199954350	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-10-29	TELEPATHY	T6	1	2026-10-29 01:22:51.003
5f718756-fe62-4a58-b75b-a57eeb42a6ec	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	2026-10-29	BALANCE	B7	B	2026-10-29 01:22:51.003
7c87646d-17c8-4a48-a9b0-426ddf610d95	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-11-02	TELEPATHY	T4	2	2026-11-02 01:22:51.003
394879a3-1917-4795-81cd-21748c9cea24	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
5da5c052-f71a-4761-b83e-e7ebd78e6d37	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-11-01	TELEPATHY	T6	2	2026-11-01 01:22:51.003
96539153-d52e-4928-9324-267c99f95009	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-11-01	BALANCE	B1	A	2026-11-01 01:22:51.003
afff93ee-337d-41c0-9026-1922cb71c3ac	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-10-31	TELEPATHY	T8	0	2026-10-31 01:22:51.003
0004fa56-eda9-4cf2-93e6-ebe51afbff40	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-10-31	BALANCE	B1	B	2026-10-31 01:22:51.003
1c86c83a-baee-4cb2-ad37-227f1df392d1	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-10-30	TELEPATHY	T1	2	2026-10-30 01:22:51.003
5e871407-e243-4bbd-acd1-db37fe3955f6	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-10-29	TELEPATHY	T6	3	2026-10-29 01:22:51.003
cde7775b-f362-4cbb-a65c-c4d19f2df535	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	2026-10-29	BALANCE	B5	A	2026-10-29 01:22:51.003
c323a048-e999-4f23-b4ac-8dbd7218dca2	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-11-01	TELEPATHY	T4	3	2026-11-01 01:22:51.003
ed18dc84-a64d-4c63-b28f-a97208341748	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-11-01	BALANCE	B4	A	2026-11-01 01:22:51.003
1e78c865-ea98-4d67-b30c-0162bc7b0f51	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-10-31	TELEPATHY	T7	2	2026-10-31 01:22:51.003
8fe4caf6-02f4-4dcc-a371-7aa6cb8dce69	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-10-31	BALANCE	B1	B	2026-10-31 01:22:51.003
5987f6e9-b187-45ed-922e-0e8554fc90b0	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-10-30	TELEPATHY	T6	3	2026-10-30 01:22:51.003
a1cf9a0e-f1ca-4af9-bf82-4bcfbb301d76	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-10-30	BALANCE	B1	B	2026-10-30 01:22:51.003
896273b4-3fb8-4add-9d78-5160b0c2a947	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	\N	2026-10-29	BALANCE	B3	A	2026-10-29 01:22:51.003
4d041a24-2697-4d31-80bf-d061e3330612	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	\N	2026-11-01	BALANCE	B3	B	2026-11-01 01:22:51.003
a476c08f-3abd-4983-a390-2de393d150df	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	\N	2026-10-31	TELEPATHY	T7	2	2026-10-31 01:22:51.003
0abf2d65-54a4-41a8-886a-16c554513226	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	\N	2026-10-30	TELEPATHY	T5	2	2026-10-30 01:22:51.003
84e1e259-bcbd-4cbd-88de-9eef081f2906	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	\N	2026-10-30	BALANCE	B4	A	2026-10-30 01:22:51.003
12bc3b59-e908-488e-8964-e7c2962f37ca	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	\N	2026-10-29	BALANCE	B8	B	2026-10-29 01:22:51.003
7aeb05dd-f91e-4a4a-8086-5319b18cfeb0	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-11-02	TELEPATHY	T2	0	2026-11-02 01:22:51.003
33fd29d3-a9c1-437b-b5a6-c59412527593	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-11-02	BALANCE	B8	B	2026-11-02 01:22:51.003
de7fb460-b577-40f1-bf1c-4fc2940fa8de	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-11-01	BALANCE	B3	A	2026-11-01 01:22:51.003
6159ae7c-97ee-446e-a50e-36482f313b88	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-10-31	BALANCE	B5	A	2026-10-31 01:22:51.003
74d003b7-37c1-47f7-b576-7fd6d3c42428	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-10-30	TELEPATHY	T7	2	2026-10-30 01:22:51.003
28f0bbad-361d-417b-b7dc-97bad534b059	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-10-30	BALANCE	B4	B	2026-10-30 01:22:51.003
37048271-f73e-4ad2-97b6-8907311f4d3a	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-10-29	TELEPATHY	T2	3	2026-10-29 01:22:51.003
6c56c50a-c8a7-4413-9557-c5e1b5cf81ba	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	\N	2026-10-29	BALANCE	B1	B	2026-10-29 01:22:51.003
2e52ab3c-1b49-4c21-96cc-c28c3081e620	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	\N	2026-11-02	TELEPATHY	T6	2	2026-11-02 01:22:51.003
93d71b21-aa32-4ccd-8058-233aec075be1	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	\N	2026-11-02	BALANCE	B5	B	2026-11-02 01:22:51.003
ce491900-e310-44fa-bb8b-99ec291ad670	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	\N	2026-11-01	TELEPATHY	T1	0	2026-11-01 01:22:51.003
c50eb260-3558-47a7-8caa-a2cbc73c5d7f	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	\N	2026-11-01	BALANCE	B2	A	2026-11-01 01:22:51.003
c0c8a798-9406-4399-8e94-40a67df72809	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	\N	2026-10-31	TELEPATHY	T6	3	2026-10-31 01:22:51.003
5c3f1476-a28d-4b0c-94d2-55b196d1d67c	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	\N	2026-10-30	TELEPATHY	T6	3	2026-10-30 01:22:51.003
963389ad-60a9-4e51-93bd-901623171812	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	\N	2026-11-01	TELEPATHY	T6	3	2026-11-01 01:22:51.003
640ea7cc-52f9-4f67-9bdf-0c5c2ca75308	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	\N	2026-11-01	BALANCE	B7	A	2026-11-01 01:22:51.003
ca888b04-4581-48bb-8e40-81a6265386d9	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	\N	2026-10-31	BALANCE	B6	A	2026-10-31 01:22:51.003
a87dff27-ed5d-4e0d-b09c-23f57ac3eb34	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	\N	2026-10-30	TELEPATHY	T5	0	2026-10-30 01:22:51.003
0afe2a1e-f899-4b5f-96b3-607b678b7f8f	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	\N	2026-10-30	BALANCE	B7	A	2026-10-30 01:22:51.003
4ee1bf4c-e140-496f-bfba-f2fa1c6515aa	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	\N	2026-10-29	TELEPATHY	T5	2	2026-10-29 01:22:51.003
533e91d4-2377-4918-9343-c7c430b3af02	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-11-02	TELEPATHY	T7	1	2026-11-02 01:22:51.003
2d8ff0fe-5490-47e2-8ac0-cbbe3c4640fe	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-11-01	TELEPATHY	T4	3	2026-11-01 01:22:51.003
81cb0cc3-9bec-4b4f-889c-d4937b0bc531	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-11-01	BALANCE	B3	B	2026-11-01 01:22:51.003
8d02b2d5-8dfe-490c-9350-a89f6026b1d1	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-10-31	TELEPATHY	T4	3	2026-10-31 01:22:51.003
f8568f7a-be1a-4e7f-a886-ca27cb5f9af6	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-10-31	BALANCE	B5	B	2026-10-31 01:22:51.003
805d0f8b-b768-4367-bec1-c7e72c6590fd	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-10-29	TELEPATHY	T5	2	2026-10-29 01:22:51.003
743e0347-a8fd-4c6e-9055-5b488d92177a	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	\N	2026-10-29	BALANCE	B2	A	2026-10-29 01:22:51.003
a7c765da-2479-4687-aad9-bb9c5e840148	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-11-02	TELEPATHY	T3	1	2026-11-02 01:22:51.003
1f239b96-f9b0-4068-a402-3924afcb9ed5	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-11-02	BALANCE	B5	B	2026-11-02 01:22:51.003
98b903eb-8240-4dc7-a49f-eeeb50e2cdb4	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-11-01	TELEPATHY	T8	0	2026-11-01 01:22:51.003
bd12a6cc-aee0-4d05-aa87-637464879e80	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-11-01	BALANCE	B1	A	2026-11-01 01:22:51.003
b8d6d5c1-9acf-42dc-945a-9d345a87d88b	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-10-31	TELEPATHY	T1	3	2026-10-31 01:22:51.003
57952b62-5439-4b8c-b359-0492fe3eeb8c	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-10-30	TELEPATHY	T8	2	2026-10-30 01:22:51.003
5a1fbe2b-1fa3-4a31-8169-a9a98d92f635	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-10-30	BALANCE	B4	A	2026-10-30 01:22:51.003
99445645-5bb8-4703-8a75-45ee00f34c76	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-10-29	TELEPATHY	T2	1	2026-10-29 01:22:51.003
3699298a-1ef5-4d19-be48-c5c882e25ad4	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	\N	2026-10-29	BALANCE	B2	B	2026-10-29 01:22:51.003
e068cdf4-b73f-4176-865b-75e49129192d	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-11-02	TELEPATHY	T1	1	2026-11-02 01:22:51.003
b41825b8-6147-496d-8fc4-1abd11c2a7c1	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-11-01	TELEPATHY	T8	0	2026-11-01 01:22:51.003
33615fb8-0e5c-4b60-ad85-93703cf6d558	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-11-01	BALANCE	B3	A	2026-11-01 01:22:51.003
d0f31275-8923-4250-a037-14cd50572cf9	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-10-31	BALANCE	B8	B	2026-10-31 01:22:51.003
0b621a5b-7069-4c94-9941-81c5762442bc	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-10-30	TELEPATHY	T6	1	2026-10-30 01:22:51.003
eb338f1b-32ec-49f7-afef-e5d924116a90	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-10-29	TELEPATHY	T5	2	2026-10-29 01:22:51.003
cce39689-71c6-43a6-af9c-fc20dae21c3e	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	2026-10-29	BALANCE	B8	B	2026-10-29 01:22:51.003
230eac76-08be-44a8-be2e-1aaf97faf5cd	5c5848001eb7ca3edb5f1d9a	4227074a-be01-4a63-8f35-83455ffc653e	\N	2026-11-02	BALANCE	B4	B	2026-11-02 01:22:51.003
91045c0f-387a-4d9e-b5e2-ed343f4033d2	5c5848001eb7ca3edb5f1d9a	4227074a-be01-4a63-8f35-83455ffc653e	\N	2026-10-31	BALANCE	B2	B	2026-10-31 01:22:51.003
a873c337-8a8c-42e0-8f62-245b2c58e0f1	5c5848001eb7ca3edb5f1d9a	4227074a-be01-4a63-8f35-83455ffc653e	\N	2026-10-30	TELEPATHY	T2	1	2026-10-30 01:22:51.003
d18b8162-5d8d-48e2-bbc9-a47c198d8718	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-11-02	TELEPATHY	T8	0	2026-11-02 01:22:51.003
9edcdf2b-431a-4588-bc54-d004d65b4a26	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-11-02	BALANCE	B5	B	2026-11-02 01:22:51.003
15c71bfc-f6a8-4053-a200-5537122059a0	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-10-31	TELEPATHY	T6	3	2026-10-31 01:22:51.003
5e7a2322-7832-4363-82ff-a63a271833ab	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-10-31	BALANCE	B5	A	2026-10-31 01:22:51.003
1b9dc981-cfa3-4e24-a5bb-fee07ae0fdb0	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-10-30	TELEPATHY	T8	1	2026-10-30 01:22:51.003
aeda0110-6041-4d5a-a702-229d2485b185	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-10-30	BALANCE	B5	A	2026-10-30 01:22:51.003
316ec187-b4d2-487b-8569-31f11156e5a0	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-10-29	TELEPATHY	T5	3	2026-10-29 01:22:51.003
f3784f0b-7c63-49cb-b336-055c9d8bcb76	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	2026-10-29	BALANCE	B8	B	2026-10-29 01:22:51.003
e33302ba-20cb-4026-ad4a-701e81575bc4	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-11-02	TELEPATHY	T7	2	2026-11-02 01:22:51.003
ed3232dc-407c-4663-867c-d41ff77ab457	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-11-02	BALANCE	B4	B	2026-11-02 01:22:51.003
887d1a8a-0f80-4b79-a05b-75516c78a8ad	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-11-01	TELEPATHY	T6	2	2026-11-01 01:22:51.003
4cee958b-f669-4517-a318-18f7f686dd80	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-11-01	BALANCE	B7	A	2026-11-01 01:22:51.003
42e8e817-6f83-4455-93d3-5ef1aa7a690d	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-10-31	BALANCE	B8	B	2026-10-31 01:22:51.003
1204702a-284c-4d70-b594-c0d11f3d9f76	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-10-30	TELEPATHY	T3	1	2026-10-30 01:22:51.003
41d8bbeb-5b39-45a1-bca0-9963f819318b	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-10-30	BALANCE	B8	A	2026-10-30 01:22:51.003
9ac766eb-3eb2-41a7-97cb-c2a884e7bb87	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	\N	2026-10-29	TELEPATHY	T5	1	2026-10-29 01:22:51.003
8229366a-9f8c-473c-a9d6-ab253ddb6633	5c5848001eb7ca3edb5f1d9a	0689dbc7-0ec7-42ef-8625-73fea7a406ce	\N	2026-11-01	BALANCE	B5	A	2026-11-01 01:22:51.003
3c6cdaa2-484d-43df-b7c8-3990fe6372c9	5c5848001eb7ca3edb5f1d9a	0689dbc7-0ec7-42ef-8625-73fea7a406ce	\N	2026-10-31	TELEPATHY	T6	2	2026-10-31 01:22:51.003
41c626a2-c664-40d2-b14a-b9e9f95ec106	5c5848001eb7ca3edb5f1d9a	0689dbc7-0ec7-42ef-8625-73fea7a406ce	\N	2026-10-30	BALANCE	B5	B	2026-10-30 01:22:51.003
c992fb05-5962-47ff-b041-9d01c4d4762e	5c5848001eb7ca3edb5f1d9a	0689dbc7-0ec7-42ef-8625-73fea7a406ce	\N	2026-10-29	BALANCE	B3	A	2026-10-29 01:22:51.003
dd3f61c4-326c-4f1a-b182-2a0a04e4acf0	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	\N	2026-11-01	TELEPATHY	T8	0	2026-11-01 01:22:51.003
2322721f-d1e8-40ff-bcd4-4a9504ec2779	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	\N	2026-11-01	BALANCE	B4	B	2026-11-01 01:22:51.003
2073d0bd-376a-4c35-abdd-76f52aa22d03	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	\N	2026-10-31	TELEPATHY	T1	1	2026-10-31 01:22:51.003
3f57c224-681c-4eda-bebd-9a5b614a65e0	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	\N	2026-10-31	BALANCE	B4	B	2026-10-31 01:22:51.003
1d3cd787-66d0-4ea9-a31d-8cda2e0284e8	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	\N	2026-10-29	TELEPATHY	T2	3	2026-10-29 01:22:51.003
923b26ec-9cc0-4522-9b76-460e1d41c355	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	\N	2026-10-29	BALANCE	B5	A	2026-10-29 01:22:51.003
6a5630c6-b470-4475-830f-5068ed22e0de	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
b294b226-902f-4cb8-93e0-0aded8a9a359	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-11-01	BALANCE	B1	A	2026-11-01 01:22:51.003
bc2fb77b-5759-4afd-ae4d-070f07f5c099	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-10-31	TELEPATHY	T4	1	2026-10-31 01:22:51.003
ff068db3-d30f-474c-a95c-4eabd6b63117	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-10-31	BALANCE	B8	B	2026-10-31 01:22:51.003
fb4cd4e5-1ef4-4a09-8c19-b246c109005f	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-10-30	TELEPATHY	T5	2	2026-10-30 01:22:51.003
ae4dc517-1a44-4e23-b47a-9fa85f87e684	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-10-30	BALANCE	B7	A	2026-10-30 01:22:51.003
2af159c0-1ef8-4667-9017-fb31f6a505b0	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-10-29	TELEPATHY	T2	1	2026-10-29 01:22:51.003
e618a5d0-6e5b-4062-b83c-0201d036f555	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	\N	2026-10-29	BALANCE	B2	A	2026-10-29 01:22:51.003
007a5f07-6a3f-49d5-9f38-d512c4e7b2bc	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-11-02	TELEPATHY	T3	1	2026-11-02 01:22:51.003
2253d409-e322-4560-98c1-e8f639b3ce39	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-11-02	BALANCE	B2	A	2026-11-02 01:22:51.003
831dc675-246c-4fd4-9dba-1dad8a9e3f7d	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-11-01	TELEPATHY	T4	1	2026-11-01 01:22:51.003
77240581-57e2-4763-a6cc-d1c9f9d7b343	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-11-01	BALANCE	B1	B	2026-11-01 01:22:51.003
01317f48-e40a-4ad3-a637-cdc08c1b30ea	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-10-31	TELEPATHY	T3	3	2026-10-31 01:22:51.003
9a6d2b77-7a62-4492-97ae-77900ed63428	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-10-31	BALANCE	B8	B	2026-10-31 01:22:51.003
5450bd3d-30a6-4b1d-8657-958cf5e48a25	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-10-30	BALANCE	B1	A	2026-10-30 01:22:51.003
d5bc00ff-b98b-4a97-8861-4ac98b3582c1	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-10-29	TELEPATHY	T3	0	2026-10-29 01:22:51.003
e0acdb9d-dd2c-477c-a9dd-ace05518d9f0	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	\N	2026-10-29	BALANCE	B1	B	2026-10-29 01:22:51.003
80ac9509-e07d-45cb-b04a-70d8dac9d66c	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-11-02	TELEPATHY	T8	1	2026-11-02 01:22:51.003
f3762fd7-e4c5-4a46-9b37-fe08f4fe2c6e	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
a11c54ee-0965-4d5d-9f13-bb272000103e	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-11-01	BALANCE	B8	B	2026-11-01 01:22:51.003
6536f110-04a7-4124-aea6-6d2bc75c65cd	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-10-31	TELEPATHY	T4	3	2026-10-31 01:22:51.003
1602447b-d53a-4ff6-b892-522a607f1dd1	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-10-31	BALANCE	B3	A	2026-10-31 01:22:51.003
38731008-c31e-4e5d-b27e-c9f697d133fd	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-10-30	TELEPATHY	T8	0	2026-10-30 01:22:51.003
12862e85-1862-4bb6-98e7-d68f6b8ddde9	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-10-29	TELEPATHY	T8	2	2026-10-29 01:22:51.003
bf710ddc-c95c-4a69-9409-a9c145a1907e	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	\N	2026-10-29	BALANCE	B6	A	2026-10-29 01:22:51.003
7f749c77-9ff0-4887-9558-b6e4f9d757d5	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-11-02	BALANCE	B3	B	2026-11-02 01:22:51.003
ca928d04-4c0a-4c2a-b565-f92b524edb48	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-11-01	TELEPATHY	T1	0	2026-11-01 01:22:51.003
8ae54e61-3425-498d-8137-c05e53329ffa	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-11-01	BALANCE	B2	B	2026-11-01 01:22:51.003
8c0d0e48-0b9e-4201-92ed-c8c6fed3427a	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-10-31	TELEPATHY	T4	3	2026-10-31 01:22:51.003
85fe6d65-ccc8-420b-9d40-0c3a0607d745	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-10-31	BALANCE	B7	A	2026-10-31 01:22:51.003
ba8e1e97-472f-4b07-bd1e-bf40649abefa	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-10-30	BALANCE	B6	A	2026-10-30 01:22:51.003
6e45019c-8433-45c9-a74a-467ae2b87930	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-10-29	TELEPATHY	T1	3	2026-10-29 01:22:51.003
ff28cdc8-8f87-4e41-ac3e-beb13b66a8d7	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	\N	2026-10-29	BALANCE	B4	A	2026-10-29 01:22:51.003
8155a99f-45aa-4e0a-b4cf-4bba3a93e30b	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-11-02	BALANCE	B8	A	2026-11-02 01:22:51.003
09d82e0d-2cb6-41b0-9617-c2ea45ae0b16	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-11-01	BALANCE	B6	B	2026-11-01 01:22:51.003
100b4601-730e-4361-866a-37496477aaa5	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-10-31	TELEPATHY	T5	1	2026-10-31 01:22:51.003
36a2defd-0cf6-4185-96ef-a969ddd65ff6	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-10-31	BALANCE	B1	B	2026-10-31 01:22:51.003
a9e6dc75-e603-4560-bb41-8834a0be4a88	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-10-30	TELEPATHY	T4	0	2026-10-30 01:22:51.003
bc90d115-0620-4994-975d-69b179f4d370	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-10-30	BALANCE	B7	A	2026-10-30 01:22:51.003
ea0a324a-451c-489d-9d2d-e70f734eefd8	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-10-29	TELEPATHY	T3	2	2026-10-29 01:22:51.003
4982ddf8-0046-4120-9485-f1dbdd979147	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	\N	2026-10-29	BALANCE	B8	B	2026-10-29 01:22:51.003
761221d8-e4a7-49d1-af65-4f8701e8892f	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-11-02	TELEPATHY	T4	1	2026-11-02 01:22:51.003
9b21ed04-8792-4820-b4dc-5fc6bfc0028a	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-11-02	BALANCE	B7	A	2026-11-02 01:22:51.003
2218fb36-2c32-4191-a78b-fa7d06f99f76	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-11-01	BALANCE	B1	B	2026-11-01 01:22:51.003
93f26a31-ff6b-4baf-b5b0-2418297d3b13	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-10-31	TELEPATHY	T3	3	2026-10-31 01:22:51.003
f5b0cae9-7b59-4d67-9f27-46b92806539c	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-10-31	BALANCE	B2	A	2026-10-31 01:22:51.003
a65b74c8-fb45-4567-8e8d-dac89ce227a7	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-10-30	TELEPATHY	T3	3	2026-10-30 01:22:51.003
a41a7910-88c4-42a2-9646-5ce12dd24dc4	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-10-30	BALANCE	B1	B	2026-10-30 01:22:51.003
f7692dc6-a635-4b82-b9ba-90bc5554b319	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	\N	2026-10-29	BALANCE	B6	A	2026-10-29 01:22:51.003
32c38ab5-d828-4eaf-9467-d0844344a97b	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-11-02	TELEPATHY	T2	0	2026-11-02 01:22:51.003
69af3ba1-4b7c-49c9-a152-7fd102085f6d	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-11-01	TELEPATHY	T4	0	2026-11-01 01:22:51.003
b330b767-82a6-4fd4-82e8-2970ba93ab11	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-11-01	BALANCE	B1	A	2026-11-01 01:22:51.003
f8e601d0-5d47-4a32-9b18-bd7a54c6211b	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-10-31	TELEPATHY	T1	3	2026-10-31 01:22:51.003
4f8f8433-246f-4ceb-a949-da661aac9a99	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-10-31	BALANCE	B8	A	2026-10-31 01:22:51.003
1f1ad3f8-7f22-45ea-be59-228e0a1e3690	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-10-30	TELEPATHY	T3	3	2026-10-30 01:22:51.003
a278ea6b-5821-4efe-9089-002dec98292d	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	\N	2026-10-29	TELEPATHY	T1	0	2026-10-29 01:22:51.003
dca01207-449f-4d05-8080-1f014995d67b	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	\N	2026-11-02	BALANCE	B2	A	2026-11-02 01:22:51.003
acdc78c4-04c4-462e-b24e-1094c11c469c	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	\N	2026-11-01	TELEPATHY	T2	0	2026-11-01 01:22:51.003
84b0d926-4cdd-4bae-99e1-cb9606efdb2c	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	\N	2026-11-01	BALANCE	B3	A	2026-11-01 01:22:51.003
cbf332b5-6f24-4d4a-9150-1e5472a7f0bb	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	\N	2026-10-31	TELEPATHY	T8	0	2026-10-31 01:22:51.003
187822e4-5fe7-4864-b8ac-1aaca498cbd5	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	\N	2026-10-30	TELEPATHY	T5	2	2026-10-30 01:22:51.003
d0aae105-83f5-422a-bfbf-f67806601c40	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	\N	2026-10-29	TELEPATHY	T6	2	2026-10-29 01:22:51.003
db868015-01ab-4a92-b590-4c9118f58057	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-11-02	BALANCE	B8	B	2026-11-02 01:22:51.003
c0e757a0-e13c-4bc4-a68f-1b27e1da2a75	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-11-01	TELEPATHY	T5	3	2026-11-01 01:22:51.003
19083fa4-0d83-4693-b294-4dc50b0e69de	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-10-31	TELEPATHY	T2	1	2026-10-31 01:22:51.003
528f17c5-0c62-4e04-bb88-87db390c9484	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-10-30	TELEPATHY	T6	1	2026-10-30 01:22:51.003
24f4426f-a336-479f-9280-7665cf35e1bf	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-10-30	BALANCE	B2	A	2026-10-30 01:22:51.003
53738828-034d-4082-a12b-bb60b6746c05	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-10-29	TELEPATHY	T8	1	2026-10-29 01:22:51.003
6909924a-f388-4def-9019-b4b67cfd4c3a	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	\N	2026-10-29	BALANCE	B5	A	2026-10-29 01:22:51.003
be6a3724-6e79-4bce-82c1-8a00af6651de	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	\N	2026-11-02	TELEPATHY	T7	0	2026-11-02 01:22:51.003
3af54caf-6c17-46cc-a04b-ae878c560d9e	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	\N	2026-10-31	BALANCE	B4	A	2026-10-31 01:22:51.003
0e2dc3eb-9f09-4d31-abcf-ef25cd344604	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	\N	2026-10-30	BALANCE	B8	B	2026-10-30 01:22:51.003
85babb26-b0e8-47ef-b652-062eea47de71	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	\N	2026-10-29	BALANCE	B6	A	2026-10-29 01:22:51.003
96f09919-aaeb-48e7-af22-62a8c195b232	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-11-02	TELEPATHY	T2	3	2026-11-02 01:22:51.003
d0fa6256-57fc-410a-a436-ad4ea5693cbd	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-11-02	BALANCE	B7	A	2026-11-02 01:22:51.003
65683a54-6638-4796-b01a-8e02aaff4fb6	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-11-01	TELEPATHY	T1	2	2026-11-01 01:22:51.003
4f216628-ab2c-4c43-a73d-90846f471046	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-11-01	BALANCE	B7	A	2026-11-01 01:22:51.003
3a175bfb-f9e8-4bc5-b02b-c70c6126c6fb	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-10-31	TELEPATHY	T2	3	2026-10-31 01:22:51.003
8cad244c-6e12-47bf-8194-bc426acbaec3	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-10-31	BALANCE	B8	A	2026-10-31 01:22:51.003
56879b8f-88a9-4f5d-a1e4-ca92e6a64a55	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-10-30	TELEPATHY	T1	0	2026-10-30 01:22:51.003
6072d338-ea24-47a3-a589-84ed8eb95014	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-10-29	TELEPATHY	T1	2	2026-10-29 01:22:51.003
881dcc52-6722-4d88-b299-ef1c0f24f036	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	\N	2026-10-29	BALANCE	B8	B	2026-10-29 01:22:51.003
acebcb8a-6c58-4f4f-b2c7-00ba7da09fe8	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	\N	2026-11-02	TELEPATHY	T5	2	2026-11-02 01:22:51.003
bb058291-769a-4cb5-a8fc-e8c893dd3529	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	\N	2026-11-02	BALANCE	B3	A	2026-11-02 01:22:51.003
e76576f5-81ff-4960-85f3-2a87aabe888a	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	\N	2026-10-30	TELEPATHY	T1	2	2026-10-30 01:22:51.003
932291db-009b-4956-84fc-6a972e4faed9	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	\N	2026-10-30	BALANCE	B4	A	2026-10-30 01:22:51.003
40d54705-d3ce-49c2-9c53-5a54edee87ff	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	\N	2026-10-29	TELEPATHY	T6	3	2026-10-29 01:22:51.003
e0576e63-3756-4e91-9684-25848c77a4c2	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	\N	2026-10-29	BALANCE	B4	A	2026-10-29 01:22:51.003
3fdf9ccd-a73b-4a62-b7e3-a46daa1552b5	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-11-02	BALANCE	B4	B	2026-11-02 01:22:51.003
b54678dd-e13c-4ad4-983e-3111b9372925	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-11-01	TELEPATHY	T1	3	2026-11-01 01:22:51.003
a711ca02-b9fc-4f6a-9fda-6b207d9823a4	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-11-01	BALANCE	B2	B	2026-11-01 01:22:51.003
8a7f988a-93c7-44e5-afb2-d78b7a68d8ac	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-10-31	TELEPATHY	T1	3	2026-10-31 01:22:51.003
49f7d7d3-94a3-414c-9564-4988e9dbc255	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-10-31	BALANCE	B6	B	2026-10-31 01:22:51.003
9264bffc-3918-43a9-97b0-5487fe18b225	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-10-30	BALANCE	B8	A	2026-10-30 01:22:51.003
0c7d2924-e32e-4d3b-9286-75bc1ca16104	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-10-29	TELEPATHY	T3	2	2026-10-29 01:22:51.003
4f3e68b7-0415-4c08-9be0-0d4fed69aff9	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	\N	2026-10-29	BALANCE	B2	A	2026-10-29 01:22:51.003
bab1ecb3-46ce-4a03-b047-869f68b8f672	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-11-02	TELEPATHY	T7	3	2026-11-02 01:22:51.003
d3497e18-7135-468f-afab-d4709e936793	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-11-02	BALANCE	B7	B	2026-11-02 01:22:51.003
5c0c519b-0f9d-496c-be78-b64db11e9fd1	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-11-01	BALANCE	B8	B	2026-11-01 01:22:51.003
1b2219f4-7fc3-4b72-9431-4107e76f7d71	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-10-31	TELEPATHY	T5	2	2026-10-31 01:22:51.003
b161def2-b640-4dd3-b1a9-5c4f3a244be7	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-10-31	BALANCE	B6	B	2026-10-31 01:22:51.003
aeae5902-1b21-4abf-9c14-6825a3b33db7	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-10-30	TELEPATHY	T1	0	2026-10-30 01:22:51.003
40d975b7-fbc6-4463-9ea7-7d3a1bff1d22	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-10-30	BALANCE	B5	B	2026-10-30 01:22:51.003
d7af1405-376c-49f4-a23b-6f964f3da523	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-10-29	TELEPATHY	T8	2	2026-10-29 01:22:51.003
3dfec0e1-ea0f-4fdf-ab9c-0ad372cc63e2	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	\N	2026-10-29	BALANCE	B5	A	2026-10-29 01:22:51.003
8b09eb9a-1889-4a15-9a47-8c241ac3a9bd	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-11-02	TELEPATHY	T5	1	2026-11-02 01:22:51.003
a2be934b-4010-47f9-b94d-dde7716241aa	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
438028d2-d22f-4bbe-a4e3-56ea4b88fde2	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-11-01	TELEPATHY	T5	2	2026-11-01 01:22:51.003
c12772cc-388f-4223-9c58-848018ea7a09	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-10-31	TELEPATHY	T4	3	2026-10-31 01:22:51.003
b57b8343-4666-470a-acda-cbefb5b34fab	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-10-31	BALANCE	B8	A	2026-10-31 01:22:51.003
cc76cbf8-f1d2-4a3b-8241-104973ba6f7b	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-10-30	TELEPATHY	T2	1	2026-10-30 01:22:51.003
fc842912-43ea-404f-bdb4-f961fdfc8e9e	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-10-30	BALANCE	B8	A	2026-10-30 01:22:51.003
5a04c151-f982-4175-96a0-34a6cbe2397a	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	\N	2026-10-29	TELEPATHY	T5	2	2026-10-29 01:22:51.003
693240f2-b482-42d6-bf98-7cfbe86e5722	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-11-02	TELEPATHY	T3	2	2026-11-02 01:22:51.003
877cbb0c-2074-4b02-9234-a1d14c54c662	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-11-02	BALANCE	B5	B	2026-11-02 01:22:51.003
d775dc6d-b5d8-4385-8ef2-3935694ff710	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-11-01	BALANCE	B2	A	2026-11-01 01:22:51.003
f9e0e1b1-ad74-4ac4-9ed2-05ff5607c194	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-10-31	TELEPATHY	T2	1	2026-10-31 01:22:51.003
c88f02fa-eaae-4009-abc3-97318c0359db	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-10-31	BALANCE	B2	A	2026-10-31 01:22:51.003
be265bae-ee90-4df1-8733-3684961b649c	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-10-30	TELEPATHY	T4	1	2026-10-30 01:22:51.003
9830b8ff-91bc-4192-ae4d-51769522bd5a	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-10-30	BALANCE	B5	A	2026-10-30 01:22:51.003
2ad9cd29-5e9b-4b5f-b8da-265d7590aa00	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-10-29	TELEPATHY	T4	2	2026-10-29 01:22:51.003
f627ab78-ada5-44bf-9bf7-3c038cdf97f2	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	\N	2026-10-29	BALANCE	B2	B	2026-10-29 01:22:51.003
be0db37a-0cf7-4a67-8630-eaa3bf9f309f	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	\N	2026-11-02	TELEPATHY	T8	3	2026-11-02 01:22:51.003
8e6ff9ea-4e09-4b7b-819c-9e24aec36b11	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	\N	2026-11-01	TELEPATHY	T8	3	2026-11-01 01:22:51.003
4652f3b8-bc63-47e2-b88a-d16495365bc5	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	\N	2026-10-31	BALANCE	B8	A	2026-10-31 01:22:51.003
34a58f36-8a1e-4f3c-adcc-43a9f6f34cbd	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	\N	2026-10-30	TELEPATHY	T6	0	2026-10-30 01:22:51.003
ad03d33e-b1b7-420e-9bd6-8a333cc7d12b	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	\N	2026-10-30	BALANCE	B6	A	2026-10-30 01:22:51.003
1d160e50-3dc8-4060-b634-28aaaa8d58dc	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	\N	2026-10-29	BALANCE	B2	A	2026-10-29 01:22:51.003
a4f2bc7b-07cc-4148-b919-ea37522299ac	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-11-02	TELEPATHY	T3	0	2026-11-02 01:22:51.003
9ef0334e-016b-4abd-a0c7-185e9059b3b2	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-11-02	BALANCE	B4	B	2026-11-02 01:22:51.003
e5b89254-0141-4d72-8be2-6de87b16a5d7	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-11-01	TELEPATHY	T6	3	2026-11-01 01:22:51.003
46eae9ac-84bb-4a3c-bb23-9ffeae7822fd	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-10-31	TELEPATHY	T3	0	2026-10-31 01:22:51.003
bf12f803-532a-4b2f-934f-8c4b0cd5c798	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-10-30	TELEPATHY	T1	3	2026-10-30 01:22:51.003
56dab614-37b2-4f81-b000-d38748de6c47	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-10-29	TELEPATHY	T8	0	2026-10-29 01:22:51.003
cf26ce2e-0ec2-47d6-aed1-1d7d1b21b964	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	\N	2026-10-29	BALANCE	B6	A	2026-10-29 01:22:51.003
b407c5a3-a1e5-4ca0-aaf6-39906b3620ba	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	\N	2026-11-01	TELEPATHY	T3	3	2026-11-01 01:22:51.003
befaa04c-1554-4a4b-ae64-84d2235c1045	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	\N	2026-11-01	BALANCE	B4	B	2026-11-01 01:22:51.003
8f400804-02ba-4a6f-b959-d005c86ff24e	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	\N	2026-10-31	BALANCE	B7	A	2026-10-31 01:22:51.003
592b980d-f565-4cb2-9bf0-1952d91c7bb0	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	\N	2026-10-30	TELEPATHY	T4	0	2026-10-30 01:22:51.003
741fde3d-e98f-4cd0-a9a8-724e847eb665	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	\N	2026-10-30	BALANCE	B8	B	2026-10-30 01:22:51.003
890d017e-410a-43bd-82be-08b13f85e9cf	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	\N	2026-10-29	TELEPATHY	T8	1	2026-10-29 01:22:51.003
197a9d67-cbef-4d02-9a33-c86358f5df1c	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-11-02	TELEPATHY	T8	0	2026-11-02 01:22:51.003
967088c6-ccb2-4a03-baf2-a20491e514af	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-11-02	BALANCE	B5	B	2026-11-02 01:22:51.003
5e86470b-fdaa-46a7-8c6b-7582aa7c2bc4	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-11-01	BALANCE	B4	B	2026-11-01 01:22:51.003
f21f5729-e762-48a1-a11a-5843b7d9f108	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-10-31	BALANCE	B5	A	2026-10-31 01:22:51.003
106c8721-9ff9-406c-8c72-41a55f0278e3	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-10-30	TELEPATHY	T3	2	2026-10-30 01:22:51.003
30128924-d055-4fe0-9933-50e4af8d503f	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-10-30	BALANCE	B7	B	2026-10-30 01:22:51.003
74430fe6-7cd6-44b0-bc37-8779640fc34c	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-10-29	TELEPATHY	T4	0	2026-10-29 01:22:51.003
ffb295b3-ba9f-48d7-9d99-3c9bf961b2ed	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	\N	2026-10-29	BALANCE	B7	B	2026-10-29 01:22:51.003
ecf48e32-c08b-4ced-b182-f451b52b8a01	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-11-02	TELEPATHY	T6	2	2026-11-02 01:22:51.003
5f58c087-23ac-44e1-8f34-37c3c58d68a5	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-11-01	TELEPATHY	T8	3	2026-11-01 01:22:51.003
dee5b8e5-a300-4328-a10a-78ae52e86178	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-11-01	BALANCE	B5	B	2026-11-01 01:22:51.003
c808c4d2-8a8d-4673-b8ad-00b80d80f1fc	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-10-31	TELEPATHY	T1	0	2026-10-31 01:22:51.003
56723a13-9995-4e1b-b35e-4b7328d1f8cf	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-10-30	TELEPATHY	T6	1	2026-10-30 01:22:51.003
bb034f09-11ba-4df3-9668-c78237ee11a8	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-10-29	TELEPATHY	T4	1	2026-10-29 01:22:51.003
28101dbf-4c21-4942-8792-4a5e6d7b80c7	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	\N	2026-10-29	BALANCE	B3	B	2026-10-29 01:22:51.003
05a42c8e-65ff-4a2b-81f1-cb2ebafb200f	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-11-02	TELEPATHY	T5	3	2026-11-02 01:22:51.003
f70326b6-d2c2-43b3-9fb2-56b21dcfaba4	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-11-02	BALANCE	B2	B	2026-11-02 01:22:51.003
fbac6b18-e666-4e76-b3cd-258ee36ef6f1	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-11-01	BALANCE	B6	B	2026-11-01 01:22:51.003
a2d3796b-d457-4195-8348-a818be4cdd7f	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-10-31	BALANCE	B5	B	2026-10-31 01:22:51.003
19e64ac5-963f-4aac-821d-ffe53782726b	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-10-30	BALANCE	B5	B	2026-10-30 01:22:51.003
a940546c-e6c0-44c9-9965-62306dc11089	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-10-29	TELEPATHY	T6	2	2026-10-29 01:22:51.003
f91caa27-0f22-48a8-a858-dfaf587961f7	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	\N	2026-10-29	BALANCE	B4	A	2026-10-29 01:22:51.003
190428bc-5f6e-4b88-86ef-08f900646717	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-11-02	TELEPATHY	T1	3	2026-11-02 01:22:51.003
149ffd49-81c8-4030-8c37-3d8a4f493b47	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-11-01	TELEPATHY	T8	1	2026-11-01 01:22:51.003
791469ee-3232-4d82-bb22-af88fa43023f	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-11-01	BALANCE	B5	B	2026-11-01 01:22:51.003
b404a830-f382-483e-a255-29704de38760	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-10-31	TELEPATHY	T5	2	2026-10-31 01:22:51.003
32617995-eaea-42bd-8df1-71466f74a998	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-10-31	BALANCE	B7	A	2026-10-31 01:22:51.003
181a74c4-dafd-4b7b-b235-cfbfaad416a4	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-10-30	TELEPATHY	T8	2	2026-10-30 01:22:51.003
162cbd47-cf00-411f-a8c9-0df421e28460	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-10-30	BALANCE	B8	B	2026-10-30 01:22:51.003
f7b0fca7-0efe-4045-9f3a-bd8959cbaee3	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	\N	2026-10-29	TELEPATHY	T2	1	2026-10-29 01:22:51.003
4c78b567-2cb2-4310-92ce-f4e3a32f8fc2	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-11-02	TELEPATHY	T1	1	2026-11-02 01:22:51.003
4492988c-fcf5-4fca-af87-6c0b940a92fe	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-11-01	BALANCE	B6	A	2026-11-01 01:22:51.003
62f79b1f-f9e1-49a7-b218-9c0115116029	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-10-31	TELEPATHY	T5	1	2026-10-31 01:22:51.003
05586794-5033-479c-9e5a-f79d063f3dec	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-10-31	BALANCE	B1	B	2026-10-31 01:22:51.003
19acab5d-82d5-478c-8b82-6d7c7d24a1c4	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-10-30	TELEPATHY	T1	2	2026-10-30 01:22:51.003
d9eab513-fedb-4b77-8894-f9e1d11f170c	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-10-30	BALANCE	B6	A	2026-10-30 01:22:51.003
2f4a37c9-dace-495d-bbf0-52bbf84c333a	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-10-29	TELEPATHY	T2	3	2026-10-29 01:22:51.003
8f366e2a-b894-43da-a803-a6ade7e3c2fa	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	\N	2026-10-29	BALANCE	B6	B	2026-10-29 01:22:51.003
641f039c-6435-448f-9952-02344cc49d33	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-11-02	TELEPATHY	T1	3	2026-11-02 01:22:51.003
70c5893d-ae2b-481b-ac53-3e23c8b4e762	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-11-02	BALANCE	B8	A	2026-11-02 01:22:51.003
897f728b-a935-4c23-8309-e8e7d3f459b8	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-11-01	TELEPATHY	T4	0	2026-11-01 01:22:51.003
d2f07ccc-471b-44fd-ad03-2e6709ebaf4e	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-11-01	BALANCE	B5	A	2026-11-01 01:22:51.003
fea01155-5f92-4112-8d3f-bb3580571842	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-10-31	TELEPATHY	T1	1	2026-10-31 01:22:51.003
10d0cb59-c063-467d-8aef-b24f0a9c95fb	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-10-30	TELEPATHY	T1	0	2026-10-30 01:22:51.003
0aea6a12-f981-422c-98b1-8417e22673bf	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-10-29	TELEPATHY	T1	1	2026-10-29 01:22:51.003
8837690d-8a48-4ce2-8352-61d9baea8559	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	\N	2026-10-29	BALANCE	B6	B	2026-10-29 01:22:51.003
429b4ce3-1ef8-4f9f-9a86-20d51a174382	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-11-02	TELEPATHY	T7	3	2026-11-02 01:22:51.003
50b5916f-1351-463f-98d0-8af51a461fbe	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-11-02	BALANCE	B2	B	2026-11-02 01:22:51.003
7cdc0ea1-841e-46ed-95b0-1561d85ff94e	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-11-01	TELEPATHY	T4	2	2026-11-01 01:22:51.003
cc7a17d9-24cb-4e0e-8fc6-4fe1bccce0b0	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-10-31	TELEPATHY	T3	0	2026-10-31 01:22:51.003
0eaadab6-de7f-4595-a04f-7a264d62163b	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-10-31	BALANCE	B5	A	2026-10-31 01:22:51.003
a3634929-bab6-4925-b9fc-43db4f1c28ba	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-10-30	TELEPATHY	T1	0	2026-10-30 01:22:51.003
ed3d6f97-7112-4112-b5ba-a5ade051cf7d	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	2026-10-29	TELEPATHY	T8	3	2026-10-29 01:22:51.003
de04c489-8792-4acd-8c13-086bb374950b	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	2026-11-01	BALANCE	B4	A	2026-11-01 01:22:51.003
f63267fa-5b8e-4786-8e80-de17a060eb7f	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	2026-10-31	TELEPATHY	T4	1	2026-10-31 01:22:51.003
f65f9dab-0584-475a-97d9-ae38f9eca112	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	2026-10-31	BALANCE	B5	A	2026-10-31 01:22:51.003
ae7db22b-c2d4-489c-aa38-b1a381533589	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	2026-10-30	TELEPATHY	T3	3	2026-10-30 01:22:51.003
c6f4f5cb-54e0-48bd-ac57-b34ea8109e66	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	2026-10-30	BALANCE	B2	A	2026-10-30 01:22:51.003
907264d4-fae2-4be5-8739-74b84c5693b7	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	2026-10-29	BALANCE	B7	B	2026-10-29 01:22:51.003
c15a569d-e245-437a-829a-e528da47e412	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-11-02	TELEPATHY	T6	2	2026-11-02 01:22:51.003
5faaf487-5ced-4e3d-822e-1236d0367ed3	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-11-02	BALANCE	B3	B	2026-11-02 01:22:51.003
91b901db-6952-425b-8129-13fd1d96a3a3	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-11-01	TELEPATHY	T4	3	2026-11-01 01:22:51.003
16f82304-78d4-4641-8ec6-f771d23bb5f1	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-11-01	BALANCE	B4	B	2026-11-01 01:22:51.003
faf691ba-58ce-400d-83cc-cf4de7e381db	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-10-31	TELEPATHY	T1	0	2026-10-31 01:22:51.003
b40f54ea-d7fb-4e0f-a49c-624c77b372ab	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-10-30	BALANCE	B2	B	2026-10-30 01:22:51.003
2c672315-b590-4bf8-9b9f-f03b978c36e3	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-10-29	TELEPATHY	T8	2	2026-10-29 01:22:51.003
af01386c-be3c-4177-a5af-4a5963de3324	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	\N	2026-10-29	BALANCE	B4	B	2026-10-29 01:22:51.003
d3b55e67-c356-460f-b999-80126cfadf9c	5c5848001eb7ca3edb5f1d9a	3bce57f6-f335-4961-9676-11b097eb2194	\N	2026-11-01	TELEPATHY	T8	0	2026-11-01 01:22:51.003
89eab71c-c3bf-4542-8236-fd8271fc2ece	5c5848001eb7ca3edb5f1d9a	3bce57f6-f335-4961-9676-11b097eb2194	\N	2026-10-31	BALANCE	B2	A	2026-10-31 01:22:51.003
ff31bfd2-e600-4b66-a828-4f88f3f73db9	5c5848001eb7ca3edb5f1d9a	3bce57f6-f335-4961-9676-11b097eb2194	\N	2026-10-29	BALANCE	B2	B	2026-10-29 01:22:51.003
4313eaca-9bb7-4444-a74a-1f90f96936b7	5c5848001eb7ca3edb5f1d9a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
faefb1e8-d75a-47f3-878e-20460607db1d	5c5848001eb7ca3edb5f1d9a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	2026-11-01	BALANCE	B1	B	2026-11-01 01:22:51.003
b6c28076-0305-4f59-a3f3-7d3e05fd645d	5c5848001eb7ca3edb5f1d9a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	2026-10-31	TELEPATHY	T1	2	2026-10-31 01:22:51.003
e52c7751-efad-4bed-a110-a452ab357e87	5c5848001eb7ca3edb5f1d9a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	2026-10-30	TELEPATHY	T4	1	2026-10-30 01:22:51.003
fffd85a9-6515-4c25-b111-9ede0ac6fca2	5c5848001eb7ca3edb5f1d9a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	2026-10-29	TELEPATHY	T1	2	2026-10-29 01:22:51.003
72b22ffb-3f52-47e4-928e-b17bcf0ecd34	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-11-02	BALANCE	B6	A	2026-11-02 01:22:51.003
51fd80db-2786-4bdc-8fcf-ae5efae63c73	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-11-01	TELEPATHY	T8	2	2026-11-01 01:22:51.003
95d03f21-fc90-4f38-bd5b-8f91c7c44d0d	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-10-31	BALANCE	B5	B	2026-10-31 01:22:51.003
16280b43-1a6e-4176-a2a3-8f8fb7e6921f	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-10-30	TELEPATHY	T7	0	2026-10-30 01:22:51.003
9921b24d-75b0-40b4-a082-f666f0077d18	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-10-30	BALANCE	B5	A	2026-10-30 01:22:51.003
02ce3aef-fb95-4749-bcbc-bf2a44edeb6c	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-10-29	TELEPATHY	T2	3	2026-10-29 01:22:51.003
6cd58361-37b5-4a35-acec-8d4a675ca0ba	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	2026-10-29	BALANCE	B2	A	2026-10-29 01:22:51.003
a1620dbf-aa1d-448e-89c7-38d8a4278449	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-11-02	TELEPATHY	T5	2	2026-11-02 01:22:51.003
3ecb65d4-0a96-4e3d-8008-d34bcefa0ae5	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-11-02	BALANCE	B1	B	2026-11-02 01:22:51.003
dd474855-48dc-46cd-b5b1-418e591345a2	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-11-01	TELEPATHY	T8	0	2026-11-01 01:22:51.003
4528e96a-6c43-47f8-9d23-ed6eafcb768c	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-11-01	BALANCE	B3	A	2026-11-01 01:22:51.003
2b26105d-e6d8-4b43-a662-5107c34e6488	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-10-31	TELEPATHY	T5	3	2026-10-31 01:22:51.003
07a26616-091e-49e2-8a51-3f363924d58e	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-10-30	BALANCE	B3	B	2026-10-30 01:22:51.003
299a8b08-0330-4ab8-ab2b-03aae16eefad	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	\N	2026-10-29	BALANCE	B8	B	2026-10-29 01:22:51.003
b88beec6-d276-4ace-a58f-2be99bac9be1	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-11-02	TELEPATHY	T7	1	2026-11-02 01:22:51.003
56c68653-c9a5-4c19-8b42-919ceed21636	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-11-02	BALANCE	B3	A	2026-11-02 01:22:51.003
414fda77-6c9c-422f-8cb4-4e6b55bd6f91	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-11-01	TELEPATHY	T5	0	2026-11-01 01:22:51.003
1b2642d2-841c-4da6-b646-5c4933a3d3a9	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-11-01	BALANCE	B2	B	2026-11-01 01:22:51.003
77eb4f24-dce7-4978-b9c8-bdf1b20073d8	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-10-31	TELEPATHY	T4	1	2026-10-31 01:22:51.003
f41d919f-95c2-48b0-a64a-7c9228efd43b	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-10-31	BALANCE	B3	A	2026-10-31 01:22:51.003
80b711dd-0593-411f-83fd-c8afbd3372ef	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-10-30	BALANCE	B4	A	2026-10-30 01:22:51.003
877fed62-bc86-40c6-a61a-b9afeaf7c2fd	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-10-29	TELEPATHY	T4	3	2026-10-29 01:22:51.003
9ce05bdf-2a45-4e1c-b737-3ae63ecbebce	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	\N	2026-10-29	BALANCE	B1	A	2026-10-29 01:22:51.003
086e3b08-6d3b-4a70-a12c-7102b88b561a	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-11-02	TELEPATHY	T1	2	2026-11-02 01:22:51.003
d5949858-97a3-4588-b511-49c243892f41	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-11-01	TELEPATHY	T3	3	2026-11-01 01:22:51.003
b4f9b82e-2ade-4c57-987f-32d4400e6aea	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-11-01	BALANCE	B5	B	2026-11-01 01:22:51.003
cd9c576a-ca45-4c38-8316-dfeb91cab3a3	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-10-31	BALANCE	B2	A	2026-10-31 01:22:51.003
fad4932c-48c8-48d2-9599-892841a0696f	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-10-30	TELEPATHY	T3	1	2026-10-30 01:22:51.003
562da5ec-b3bb-4ad7-b0bc-10a6887287b4	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-10-30	BALANCE	B6	A	2026-10-30 01:22:51.003
ac1eb2f8-91ae-43f1-84db-bed318e43d1f	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-10-29	TELEPATHY	T2	1	2026-10-29 01:22:51.003
ebdba248-ad6f-4709-89f1-84066ca30738	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	\N	2026-10-29	BALANCE	B2	A	2026-10-29 01:22:51.003
bbaea231-4653-472c-afae-1e1e11e0bdc4	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
532ca38a-b2b7-401e-a8d5-ec45b79ca4b2	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	\N	2026-11-01	TELEPATHY	T7	3	2026-11-01 01:22:51.003
bcdf42b4-0ab0-4d46-865d-509db206dae6	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	\N	2026-10-31	TELEPATHY	T8	0	2026-10-31 01:22:51.003
1e40e62b-951d-416d-9c10-badf6000e116	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	\N	2026-10-30	BALANCE	B4	B	2026-10-30 01:22:51.003
a52eabe6-c055-49da-9922-58cd3a6be924	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-11-01	TELEPATHY	T3	0	2026-11-01 01:22:51.003
97559dec-a082-41cf-8006-18d0c29deeeb	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-11-01	BALANCE	B1	B	2026-11-01 01:22:51.003
889c217b-c40e-4883-a6fa-c31cd92f0957	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-10-31	BALANCE	B2	B	2026-10-31 01:22:51.003
863c81ee-ac89-4ff7-9d3e-0a7cde02c408	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-10-30	TELEPATHY	T1	3	2026-10-30 01:22:51.003
579c0946-0f6e-451c-b551-d396d8a30c09	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-10-30	BALANCE	B4	A	2026-10-30 01:22:51.003
f22247b0-a26c-4973-8dc9-192e16f48c91	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-10-29	TELEPATHY	T8	2	2026-10-29 01:22:51.003
14ae88eb-f159-4cad-9055-ce30e18bfbd4	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	\N	2026-10-29	BALANCE	B1	A	2026-10-29 01:22:51.003
4a582e95-d0a8-4829-9e8d-7641d0631aae	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	\N	2026-11-02	TELEPATHY	T2	1	2026-11-02 01:22:51.003
afdbe2fe-d921-4650-87e3-2bea12398244	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	\N	2026-11-02	BALANCE	B7	B	2026-11-02 01:22:51.003
f852fe09-37f2-45e4-ab79-7a74cd00fbdc	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	\N	2026-11-01	TELEPATHY	T1	0	2026-11-01 01:22:51.003
813c0b3b-511d-4ae3-83e4-6e3d930e9cc4	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	\N	2026-11-01	BALANCE	B2	B	2026-11-01 01:22:51.003
5903d1ac-c32a-470e-8aac-1290955472ab	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	\N	2026-10-30	BALANCE	B3	A	2026-10-30 01:22:51.003
4dd2213e-9459-4e1d-86dc-525083586bbc	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	\N	2026-10-29	BALANCE	B6	B	2026-10-29 01:22:51.003
8cbd0009-49d3-475e-a086-98e7f5298b0c	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	\N	2026-11-02	TELEPATHY	T3	2	2026-11-02 01:22:51.003
0ac0cd47-0716-4f64-b7b4-c83e1ec9ab60	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	\N	2026-11-02	BALANCE	B4	A	2026-11-02 01:22:51.003
06a4322f-95d0-4808-a5c5-9876c2c73bd9	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	\N	2026-11-01	TELEPATHY	T1	2	2026-11-01 01:22:51.003
eaa451cc-3072-418a-a3e5-bcb5d879e005	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	\N	2026-10-31	TELEPATHY	T6	1	2026-10-31 01:22:51.003
edd32ed9-f017-46f9-9fea-86ce439c58a9	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	\N	2026-10-31	BALANCE	B6	B	2026-10-31 01:22:51.003
4092aae3-df26-4923-9783-b8f4c0453110	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	\N	2026-10-29	BALANCE	B7	B	2026-10-29 01:22:51.003
d942a65f-a643-49d0-a0aa-f4673baff2c8	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-11-02	BALANCE	B5	A	2026-11-02 01:22:51.003
a9604fb2-a961-485e-b9f7-a80cfd8ef3b2	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-11-01	TELEPATHY	T6	0	2026-11-01 01:22:51.003
4f5d7741-d02c-4ce5-9652-aceca0e98b55	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-11-01	BALANCE	B6	A	2026-11-01 01:22:51.003
8abef293-b1a6-45c7-9325-fb94f3dd7032	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-10-31	BALANCE	B7	B	2026-10-31 01:22:51.003
1700d3ed-b270-4888-9295-556f4c9e5861	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-10-30	TELEPATHY	T6	2	2026-10-30 01:22:51.003
2d0ea94e-a4dd-403d-b227-cb06f9ffe409	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-10-30	BALANCE	B5	A	2026-10-30 01:22:51.003
5f42f287-9799-4dff-8cc9-81cddace122d	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	\N	2026-10-29	TELEPATHY	T6	2	2026-10-29 01:22:51.003
967de01f-822b-4118-a34b-e35258337418	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-11-02	BALANCE	B5	B	2026-11-02 01:22:51.003
c1e8a3e4-f39f-415e-8d3b-5f1353a4a28e	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-11-01	TELEPATHY	T6	1	2026-11-01 01:22:51.003
cce711e9-5da5-4408-a962-6672a0ea962b	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-11-01	BALANCE	B1	A	2026-11-01 01:22:51.003
cc4f2d8d-0fb8-4086-a4dd-7c2c0b638a6d	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-10-31	TELEPATHY	T6	0	2026-10-31 01:22:51.003
a1022c36-4451-466b-a398-2713f3f5df9f	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-10-31	BALANCE	B3	A	2026-10-31 01:22:51.003
ff1674ec-30d0-4086-b141-e108c808f61c	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-10-30	BALANCE	B4	A	2026-10-30 01:22:51.003
55c2445a-188e-4acd-8ce4-bf75a2ea2eae	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-10-29	TELEPATHY	T2	3	2026-10-29 01:22:51.003
ef113419-d89c-4518-a03a-791d12f40af4	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	\N	2026-10-29	BALANCE	B7	B	2026-10-29 01:22:51.003
\.


--
-- Data for Name: DinnerPlace; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DinnerPlace" (id, "groupId", "teamId", name, address, lat, lng, category, link, note, "addedById", "createdAt") FROM stdin;
362b0e2b-6409-49d9-ab31-0bee3432f8c9	5c5848001eb7ca3edb5f1d9a	\N	강남 숯불갈비	서울 강남구 테헤란로 123	37.4979	127.0276	고깃집	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
b0edea3f-6a76-45f0-a19c-65cde69a7610	5c5848001eb7ca3edb5f1d9a	\N	을지로 노포 골뱅이	서울 중구 을지로 15길 8	37.5663	126.991	한식	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
7d683cf8-046e-43ee-92a3-574247f24c5e	5c5848001eb7ca3edb5f1d9a	\N	성수 수제맥주 펍	서울 성동구 성수이로 77	37.5446	127.0557	주점	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
3e0e759e-48d9-4b51-95cc-8680c08d290d	5c5848001eb7ca3edb5f1d9a	\N	판교 해산물 포차	경기 성남시 분당구 판교역로 10	37.3948	127.1112	해산물	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
5a7058e8-ba64-4045-8a41-0718f13498b6	5c5848001eb7ca3edb5f1d9a	\N	홍대 이자카야	서울 마포구 와우산로 29길 5	37.5563	126.9236	일식	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
cd480b47-9a40-4b1b-a942-47b29db0bc0c	5c5848001eb7ca3edb5f1d9a	\N	종로 삼계탕	서울 종로구 종로 3길 12	37.5704	126.9822	한식	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
44491010-d8c5-42b2-b131-596fb30be55b	5c5848001eb7ca3edb5f1d9a	\N	여의도 곱창집	서울 영등포구 국제금융로 6길 7	37.5219	126.9245	곱창	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
3fc1d264-103a-4201-9f04-56dd16ca0fa5	5c5848001eb7ca3edb5f1d9a	\N	합정 이탈리안 비스트로	서울 마포구 양화로 45	37.5495	126.9139	양식	\N	\N	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 09:22:59.313
\.


--
-- Data for Name: DinnerPoll; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DinnerPoll" (id, "groupId", "teamId", title, status, "closesAt", "closedAt", "createdById", "createdAt") FROM stdin;
5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	5c5848001eb7ca3edb5f1d9a	\N	10월 회식 투표	OPEN	2026-10-31 09:22:59.313	\N	7e6721aa-8ade-49a8-ade5-6bf2586a606c	2026-10-28 09:22:59.313
\.


--
-- Data for Name: DinnerPollDate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DinnerPollDate" (id, "pollId", date) FROM stdin;
5edfe302-f449-48e9-9c87-e1e69fafc721	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	2026-11-03
ab889ee9-e368-441d-9cb9-f4244faee9cf	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	2026-11-04
8afbfc72-2750-4201-9d50-f757d2e09377	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	2026-11-05
\.


--
-- Data for Name: DinnerPollPlace; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DinnerPollPlace" (id, "pollId", "placeId") FROM stdin;
d1b886bc-ea82-4e9b-b19a-4d609f9cf3de	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	5a7058e8-ba64-4045-8a41-0718f13498b6
b66b7cfb-e187-4a90-a71d-d6f7390a39e4	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3fc1d264-103a-4201-9f04-56dd16ca0fa5
7b0e5d37-f734-402f-96b9-0985bccca406	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7d683cf8-046e-43ee-92a3-574247f24c5e
e1d76711-0ee6-4e5c-b36f-f5fed536c16c	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	44491010-d8c5-42b2-b131-596fb30be55b
\.


--
-- Data for Name: DinnerVote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DinnerVote" (id, "pollId", "userId", kind, "optionId", "createdAt") FROM stdin;
bef6b988-4762-4f3f-9c5f-d6af83279df5	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 04:31:34.024
27588751-d85c-4630-85b0-2a2037a5f7c8	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	4c991d09-c69a-4674-83ac-f21125d5e2e5	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 20:17:45.444
d8bdb82c-9f1f-4376-8672-111068451523	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3515b570-e1cd-4f5c-a65d-67f76e560e99	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 22:15:24.834
2b7c20f2-ca82-4c7b-8380-1e9525411d04	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3ab71819-06a6-48c5-b4ac-1b42894eb74a	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 07:05:15.592
be820f5a-db00-4769-8588-3b71bf6a89d7	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 01:12:50.741
9475bd67-9ffa-4494-9a02-cae5bb846a5a	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 23:15:29.396
210d8960-2033-4574-97ca-a13ea2e9bd84	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	88b3b850-7910-46c4-af8b-ee5d2194d03a	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 07:59:37.407
abb9e7dd-b2f1-4f75-aa15-309a012bb5a2	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	1a398608-3edb-41e6-86dc-e16415bab310	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 15:21:33.638
d8d0ffc7-f48f-4de2-aa8b-4fa462d3e164	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	2c059cd8-7338-4e3c-87c3-54792ec418ac	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 08:24:21.238
264c8e68-6092-41e6-9c32-0c0cbfc725bc	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 18:17:39.538
297b6512-19d5-4005-984e-872760622230	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 19:53:49.366
fe9c2148-11f9-430f-bcca-5ad24a264d04	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	0689dbc7-0ec7-42ef-8625-73fea7a406ce	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 07:14:46.651
37066974-6ae0-4d9f-bbc7-00693ba493ca	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	a2da8743-0244-4399-9c94-724c93b7f0b4	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 06:22:16.113
e1c943ad-bad3-4958-96e4-ef4e5ffbd5dc	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c3937195-11b4-410f-8069-d7007277b086	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 09:08:07.488
2b8b6afb-cbf5-47a0-a71e-cbff88135d70	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	10dd366a-993b-4297-9799-efd799518e9c	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 04:52:04.857
d582ab25-1635-4504-a1b7-57cbc6d27fa9	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	56c18c2f-d43a-4f06-92a0-ad785f48d942	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 17:54:33.17
33b32eb1-aefe-41e5-9d7b-110ce425596b	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	26edcc02-bda5-46af-8759-80c4b24d9872	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 01:46:40.271
47bc7cb5-6a93-4ea2-86ba-1eaf91360a10	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	4ed9481a-8c95-43ba-8832-95d3bb44473a	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 14:47:36.07
3457a603-80ba-43bb-965e-0bbad4ec65b7	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	616d01b4-afce-43ed-b57d-caf88803fe9e	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 15:29:20.7
68e8faaa-8108-41a7-b132-703ee4af0eb0	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3eecafc3-7b6d-4409-a8cf-101d10139dcc	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 02:58:48.048
8f72e970-d5b2-42e7-a6a7-a549a71c7557	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	de04573b-8d39-4c09-9510-054e044ab033	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 20:35:09.079
e8274e4c-ac88-4ba9-beb7-4e3c187a0c79	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 07:29:26.072
afd58a1e-f485-42b0-b620-95328e0f345a	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c3108591-b396-4f8e-b3f7-73ba302fde9f	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 21:15:36.237
76689afb-5a86-4d94-8f14-532a96b869c0	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3d780ace-7474-43cf-b4b0-10c9c3350615	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 04:27:29.158
1315b812-b9ad-4532-ab55-fef90d32ebcf	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	e93bad82-e81d-45d2-8bed-edd34446ee99	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 06:18:42.158
01617b34-04fb-4d35-ac16-f52121fdc538	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7c930bc6-1791-42cd-93ec-9ce4499251d8	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 07:53:53.233
ec675203-c62f-4650-8a63-82b72b197faf	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	415caa6d-731a-4ad9-a412-a928e09264b1	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 00:31:08.403
8f546c3f-efe8-45be-b60e-90a47d624a78	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	032b0ff0-cf49-44de-8478-b79536bce329	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 14:07:59.725
00c9dcd7-4b11-4478-b720-e569d88eb587	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	33bfc592-2a58-4b7a-8775-03b3c0dac293	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 16:48:08.05
23d2223a-66b7-4742-97fc-db7eac4ca5e6	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7136bc09-e698-4590-8e22-03332e6a39ad	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 04:50:07.884
f57f8b8f-f267-4e2f-88e8-c09d307a2404	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	a1bbc3d6-9b5b-48a2-838c-4496457de48c	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 21:34:01.275
64d75089-d461-4493-8362-3be743fa136b	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	e6631004-24e5-4ff6-9dff-c880f38dc227	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 21:23:48.098
9980067c-a2a5-4121-955a-01796ff4b2b9	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7c671f41-3fd5-4aaf-832e-97e6fe96810c	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 03:41:26.272
72077963-5002-4684-9c64-159d3720c159	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3bce57f6-f335-4961-9676-11b097eb2194	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 15:34:27.703
0f7ca282-0119-444d-9bf8-85211559400a	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7e6721aa-8ade-49a8-ade5-6bf2586a606c	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 14:30:35.532
26099101-c7d5-4cb8-8225-37b13d6480c6	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c55107c7-b1e6-48dc-be93-f0e845acbdce	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 14:31:36.785
85d6da04-0d1c-4d18-bf84-fc7583d4abfe	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	0b28c420-7b85-4fae-ac29-c62074c469c9	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 04:33:10.78
f1c77e66-7045-498f-a27a-a8785d64f0a1	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	607bf496-70ab-4622-89d8-433736254355	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 21:22:40.298
7f780c73-eac3-4cfe-b565-3c18f2cb6728	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	ff3b091d-f77f-4429-bf27-98eecc84fed3	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-29 01:32:24.51
310545b6-04a6-42a5-9fd2-008d41ad2782	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	1b47bac3-4ea3-4b82-9631-39730990e8fb	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 13:36:43.691
daff1963-de0b-481e-929c-a8cd09e91480	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7ecdb42f-2194-45b1-8f4b-f399996af2b8	DATE	ab889ee9-e368-441d-9cb9-f4244faee9cf	2026-10-28 21:00:38.402
f69c0a38-d844-41f5-bd59-2be4de5f62a2	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	1a398608-3edb-41e6-86dc-e16415bab310	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 21:40:56.314
54b426c0-9ad1-4e8c-b382-9bcd0048e39e	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 02:02:21.349
8043fdbf-a8e2-464a-8e3d-42711cb6ac0a	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7ecdb42f-2194-45b1-8f4b-f399996af2b8	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 13:59:46.975
3ca3fc8f-628d-4087-b382-99a9d6f0e96f	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	032b0ff0-cf49-44de-8478-b79536bce329	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 07:09:17.702
dbbefd8a-2a4a-4c39-9310-b3b523f2994f	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	de04573b-8d39-4c09-9510-054e044ab033	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 00:07:40.318
4b8c951a-488d-4eda-980a-b31a2a55312e	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	4c991d09-c69a-4674-83ac-f21125d5e2e5	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 20:18:32.374
742f352f-3fde-42d7-9e6b-7cce8efef69f	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	a2da8743-0244-4399-9c94-724c93b7f0b4	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 07:56:10.598
d7eada65-cdd7-4a8d-9e35-21650caf586b	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 04:31:42.07
03e0ea88-5906-4e68-bcb4-d9cf4dd9e4ea	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	4ed9481a-8c95-43ba-8832-95d3bb44473a	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 16:14:00.119
45adae33-21e5-4ca5-b63e-e4a651096501	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	607bf496-70ab-4622-89d8-433736254355	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 14:11:09.482
8667992a-bb24-4d3f-a486-25933b940249	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7c671f41-3fd5-4aaf-832e-97e6fe96810c	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 14:14:07.264
3bf50a88-77d5-4812-a354-84be634bcd78	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	e6631004-24e5-4ff6-9dff-c880f38dc227	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 19:17:54.636
439691eb-51b7-4875-b6e6-18d207d7fd5f	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c55107c7-b1e6-48dc-be93-f0e845acbdce	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 14:30:55.75
379a0204-fb9a-474c-8bce-12e6b6093fcc	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3ab71819-06a6-48c5-b4ac-1b42894eb74a	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 16:16:10.848
d7876e06-b15d-4b15-a295-968ee3078d0d	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	e93bad82-e81d-45d2-8bed-edd34446ee99	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 06:10:53.039
86a7499b-38c2-416f-8a4d-28067789de80	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3d780ace-7474-43cf-b4b0-10c9c3350615	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 23:36:51.411
84c5f411-08e3-4e69-aeb2-9321e9ed552c	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	33bfc592-2a58-4b7a-8775-03b3c0dac293	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 17:42:37.799
3ecfd885-1aad-4751-bd64-9551fc60ed18	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7c930bc6-1791-42cd-93ec-9ce4499251d8	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 00:31:09.344
c9cc3ce5-87c1-4fc8-8d78-60a0617e33b5	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	26edcc02-bda5-46af-8759-80c4b24d9872	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 23:45:49.041
3e157958-d945-4e4a-99ba-cde66c53cd8a	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	10dd366a-993b-4297-9799-efd799518e9c	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 17:42:41.447
651de090-f6c3-4ac0-833d-b73f4fe7e8b6	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	2c059cd8-7338-4e3c-87c3-54792ec418ac	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 02:41:47.596
a36c64c6-1712-4507-b178-53fc5079de81	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 00:34:25.111
3dd9ff1c-6896-4651-a3ca-18906b6e745f	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3eecafc3-7b6d-4409-a8cf-101d10139dcc	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 16:26:51.577
49995100-eeab-440a-a4fd-65cd519b81e7	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	0689dbc7-0ec7-42ef-8625-73fea7a406ce	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 05:40:04.652
eef42c31-1afc-491a-9a38-b14654a4c81f	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	616d01b4-afce-43ed-b57d-caf88803fe9e	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 05:47:46.087
48086055-0607-4e5a-a7fe-2a9eee40efc0	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 06:53:11.286
6c630cb4-1ac7-44e3-8890-b46a9ed60000	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3bce57f6-f335-4961-9676-11b097eb2194	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 19:16:05.391
e6f4d81e-93b0-4200-89ee-6ac9a354d0a6	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	415caa6d-731a-4ad9-a412-a928e09264b1	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 06:05:16.375
00db0fd5-63dd-4953-a822-9ae8b6ea9a04	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7136bc09-e698-4590-8e22-03332e6a39ad	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 21:48:17.269
c0151386-a910-4f96-9ca1-518f8a11aad9	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 06:46:21.61
0f965989-5852-4ff9-b47d-b8eade959de1	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	a1bbc3d6-9b5b-48a2-838c-4496457de48c	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 21:35:20.157
703c3495-ed65-464e-b911-89d31e7af88c	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	7e6721aa-8ade-49a8-ade5-6bf2586a606c	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 20:41:28.231
e7473974-baa2-407d-86c9-3726d9242e74	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	56c18c2f-d43a-4f06-92a0-ad785f48d942	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 22:40:47.432
810349c1-fa23-41b6-8a52-0efcde5f5dbc	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 02:18:30.329
317fe3cd-fcb3-45cb-839b-4e56a992c160	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c3108591-b396-4f8e-b3f7-73ba302fde9f	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 15:21:16.391
c14c91cb-543d-4755-a835-dc41a8772fa2	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	ff3b091d-f77f-4429-bf27-98eecc84fed3	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 00:05:02.217
4082aecd-0062-4d4a-a579-2373a59b565e	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	0b28c420-7b85-4fae-ac29-c62074c469c9	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 22:00:17.92
1acde7a2-2eb5-45db-aaf7-496195351406	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	88b3b850-7910-46c4-af8b-ee5d2194d03a	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 16:11:13.738
0a0995b3-1c39-471a-ab5c-8ee184daf0c3	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	3515b570-e1cd-4f5c-a65d-67f76e560e99	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 07:24:11.429
fbe1db1c-165e-4552-8a19-a6a1ae2d5692	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	1b47bac3-4ea3-4b82-9631-39730990e8fb	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-28 15:51:37.159
b6395307-d4c2-4b1a-b326-c698b055a211	5adfa317-5ccd-4fe6-a177-f1b20d74fcc3	c3937195-11b4-410f-8069-d7007277b086	PLACE	7b0e5d37-f734-402f-96b9-0985bccca406	2026-10-29 08:28:52.451
\.


--
-- Data for Name: Duty; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Duty" (id, "groupId", "teamId", name, icon, description, mode, period, "memberIds", "anchorDate", "offset", active, "createdById", "createdAt", "updatedAt") FROM stdin;
6a4edbe1-ebb7-4d3a-86dd-395e92467a97	5c5848001eb7ca3edb5f1d9a	\N	비품 담당	📦	사무용품 재고를 확인하고 주문해요	ROTATION	WEEKLY	["0b28c420-7b85-4fae-ac29-c62074c469c9", "991b2268-d8b8-4127-a4a1-0648da2a3d88", "ccdbf176-4285-4734-91b4-ea4ee2bf16a5", "032b0ff0-cf49-44de-8478-b79536bce329", "26edcc02-bda5-46af-8759-80c4b24d9872", "56c18c2f-d43a-4f06-92a0-ad785f48d942", "10dd366a-993b-4297-9799-efd799518e9c", "5617b5c6-4bac-467a-9e8a-0075dfc47ec5", "a1bbc3d6-9b5b-48a2-838c-4496457de48c", "aa23cb8d-261f-4a2e-9bd2-771759659a4c", "4ed9481a-8c95-43ba-8832-95d3bb44473a", "88b3b850-7910-46c4-af8b-ee5d2194d03a", "e93bad82-e81d-45d2-8bed-edd34446ee99", "f847adce-31e5-4f77-a666-1fa0efdf6374", "616d01b4-afce-43ed-b57d-caf88803fe9e", "3515b570-e1cd-4f5c-a65d-67f76e560e99", "ca8bbc62-caaf-4ee6-a26d-184b831d1a9d", "c3937195-11b4-410f-8069-d7007277b086", "7ecdb42f-2194-45b1-8f4b-f399996af2b8", "1a398608-3edb-41e6-86dc-e16415bab310", "c3108591-b396-4f8e-b3f7-73ba302fde9f", "3ab71819-06a6-48c5-b4ac-1b42894eb74a", "a2da8743-0244-4399-9c94-724c93b7f0b4", "81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd", "c55107c7-b1e6-48dc-be93-f0e845acbdce", "7e58b8cd-b525-4403-998c-8a6a4ce6cd10", "607bf496-70ab-4622-89d8-433736254355", "1b47bac3-4ea3-4b82-9631-39730990e8fb", "469fb89a-fe8d-4132-82fb-1117609d0d7b", "0689dbc7-0ec7-42ef-8625-73fea7a406ce", "2c059cd8-7338-4e3c-87c3-54792ec418ac", "4c991d09-c69a-4674-83ac-f21125d5e2e5", "c24cbb3e-f6a3-4f57-a11a-75dcaad6c650", "415caa6d-731a-4ad9-a412-a928e09264b1", "e6631004-24e5-4ff6-9dff-c880f38dc227", "3d780ace-7474-43cf-b4b0-10c9c3350615", "7c930bc6-1791-42cd-93ec-9ce4499251d8", "b6bedee2-168d-4f81-b03e-b58676faa40d", "ff3b091d-f77f-4429-bf27-98eecc84fed3", "5d14bba9-a644-40c0-a48b-ab9fdd876b9b", "31bc1950-5112-4d5a-a4df-6c6de4fd12b3", "7136bc09-e698-4590-8e22-03332e6a39ad", "7c671f41-3fd5-4aaf-832e-97e6fe96810c", "f4dc3955-250f-4515-a453-44c3c3f9838d", "de04573b-8d39-4c09-9510-054e044ab033", "33bfc592-2a58-4b7a-8775-03b3c0dac293", "3bce57f6-f335-4961-9676-11b097eb2194", "3eecafc3-7b6d-4409-a8cf-101d10139dcc", "7d092fb1-d8af-4af6-877d-a53c69d3f3c8", "d046a5d5-2a39-420a-995d-ca1ddd237723", "7e6721aa-8ade-49a8-ade5-6bf2586a606c", "4227074a-be01-4a63-8f35-83455ffc653e", "e3513bc4-9e03-4ab3-9f07-3ba7a01a1135", "c6506cc9-39be-4912-ad62-b57a3242549c", "fc0e3f6e-b17f-4350-ba79-19873935640c"]	2026-10-12	0	t	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
ac37f383-baf6-4800-b8f4-ffaf7b367035	5c5848001eb7ca3edb5f1d9a	\N	간식 담당	🍪	간식을 고르고 채워 둬요	ROTATION	WEEKLY	["0b28c420-7b85-4fae-ac29-c62074c469c9", "991b2268-d8b8-4127-a4a1-0648da2a3d88", "ccdbf176-4285-4734-91b4-ea4ee2bf16a5", "032b0ff0-cf49-44de-8478-b79536bce329", "26edcc02-bda5-46af-8759-80c4b24d9872", "56c18c2f-d43a-4f06-92a0-ad785f48d942", "10dd366a-993b-4297-9799-efd799518e9c", "5617b5c6-4bac-467a-9e8a-0075dfc47ec5", "a1bbc3d6-9b5b-48a2-838c-4496457de48c", "aa23cb8d-261f-4a2e-9bd2-771759659a4c", "4ed9481a-8c95-43ba-8832-95d3bb44473a", "88b3b850-7910-46c4-af8b-ee5d2194d03a", "e93bad82-e81d-45d2-8bed-edd34446ee99", "f847adce-31e5-4f77-a666-1fa0efdf6374", "616d01b4-afce-43ed-b57d-caf88803fe9e", "3515b570-e1cd-4f5c-a65d-67f76e560e99", "ca8bbc62-caaf-4ee6-a26d-184b831d1a9d", "c3937195-11b4-410f-8069-d7007277b086", "7ecdb42f-2194-45b1-8f4b-f399996af2b8", "1a398608-3edb-41e6-86dc-e16415bab310", "c3108591-b396-4f8e-b3f7-73ba302fde9f", "3ab71819-06a6-48c5-b4ac-1b42894eb74a", "a2da8743-0244-4399-9c94-724c93b7f0b4", "81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd", "c55107c7-b1e6-48dc-be93-f0e845acbdce", "7e58b8cd-b525-4403-998c-8a6a4ce6cd10", "607bf496-70ab-4622-89d8-433736254355", "1b47bac3-4ea3-4b82-9631-39730990e8fb", "469fb89a-fe8d-4132-82fb-1117609d0d7b", "0689dbc7-0ec7-42ef-8625-73fea7a406ce", "2c059cd8-7338-4e3c-87c3-54792ec418ac", "4c991d09-c69a-4674-83ac-f21125d5e2e5", "c24cbb3e-f6a3-4f57-a11a-75dcaad6c650", "415caa6d-731a-4ad9-a412-a928e09264b1", "e6631004-24e5-4ff6-9dff-c880f38dc227", "3d780ace-7474-43cf-b4b0-10c9c3350615", "7c930bc6-1791-42cd-93ec-9ce4499251d8", "b6bedee2-168d-4f81-b03e-b58676faa40d", "ff3b091d-f77f-4429-bf27-98eecc84fed3", "5d14bba9-a644-40c0-a48b-ab9fdd876b9b", "31bc1950-5112-4d5a-a4df-6c6de4fd12b3", "7136bc09-e698-4590-8e22-03332e6a39ad", "7c671f41-3fd5-4aaf-832e-97e6fe96810c", "f4dc3955-250f-4515-a453-44c3c3f9838d", "de04573b-8d39-4c09-9510-054e044ab033", "33bfc592-2a58-4b7a-8775-03b3c0dac293", "3bce57f6-f335-4961-9676-11b097eb2194", "3eecafc3-7b6d-4409-a8cf-101d10139dcc", "7d092fb1-d8af-4af6-877d-a53c69d3f3c8", "d046a5d5-2a39-420a-995d-ca1ddd237723", "7e6721aa-8ade-49a8-ade5-6bf2586a606c", "4227074a-be01-4a63-8f35-83455ffc653e", "e3513bc4-9e03-4ab3-9f07-3ba7a01a1135", "c6506cc9-39be-4912-ad62-b57a3242549c", "fc0e3f6e-b17f-4350-ba79-19873935640c"]	2026-10-12	0	t	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
63211578-5f61-4b6a-ae7c-8919530a275b	5c5848001eb7ca3edb5f1d9a	\N	커피머신 관리	☕	원두·우유를 채우고 청소해요	ROTATION	DAILY	["0b28c420-7b85-4fae-ac29-c62074c469c9", "991b2268-d8b8-4127-a4a1-0648da2a3d88", "ccdbf176-4285-4734-91b4-ea4ee2bf16a5", "032b0ff0-cf49-44de-8478-b79536bce329", "26edcc02-bda5-46af-8759-80c4b24d9872", "56c18c2f-d43a-4f06-92a0-ad785f48d942", "10dd366a-993b-4297-9799-efd799518e9c", "5617b5c6-4bac-467a-9e8a-0075dfc47ec5", "a1bbc3d6-9b5b-48a2-838c-4496457de48c", "aa23cb8d-261f-4a2e-9bd2-771759659a4c", "4ed9481a-8c95-43ba-8832-95d3bb44473a", "88b3b850-7910-46c4-af8b-ee5d2194d03a", "e93bad82-e81d-45d2-8bed-edd34446ee99", "f847adce-31e5-4f77-a666-1fa0efdf6374", "616d01b4-afce-43ed-b57d-caf88803fe9e", "3515b570-e1cd-4f5c-a65d-67f76e560e99", "ca8bbc62-caaf-4ee6-a26d-184b831d1a9d", "c3937195-11b4-410f-8069-d7007277b086", "7ecdb42f-2194-45b1-8f4b-f399996af2b8", "1a398608-3edb-41e6-86dc-e16415bab310", "c3108591-b396-4f8e-b3f7-73ba302fde9f", "3ab71819-06a6-48c5-b4ac-1b42894eb74a", "a2da8743-0244-4399-9c94-724c93b7f0b4", "81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd", "c55107c7-b1e6-48dc-be93-f0e845acbdce", "7e58b8cd-b525-4403-998c-8a6a4ce6cd10", "607bf496-70ab-4622-89d8-433736254355", "1b47bac3-4ea3-4b82-9631-39730990e8fb", "469fb89a-fe8d-4132-82fb-1117609d0d7b", "0689dbc7-0ec7-42ef-8625-73fea7a406ce", "2c059cd8-7338-4e3c-87c3-54792ec418ac", "4c991d09-c69a-4674-83ac-f21125d5e2e5", "c24cbb3e-f6a3-4f57-a11a-75dcaad6c650", "415caa6d-731a-4ad9-a412-a928e09264b1", "e6631004-24e5-4ff6-9dff-c880f38dc227", "3d780ace-7474-43cf-b4b0-10c9c3350615", "7c930bc6-1791-42cd-93ec-9ce4499251d8", "b6bedee2-168d-4f81-b03e-b58676faa40d", "ff3b091d-f77f-4429-bf27-98eecc84fed3", "5d14bba9-a644-40c0-a48b-ab9fdd876b9b", "31bc1950-5112-4d5a-a4df-6c6de4fd12b3", "7136bc09-e698-4590-8e22-03332e6a39ad", "7c671f41-3fd5-4aaf-832e-97e6fe96810c", "f4dc3955-250f-4515-a453-44c3c3f9838d", "de04573b-8d39-4c09-9510-054e044ab033", "33bfc592-2a58-4b7a-8775-03b3c0dac293", "3bce57f6-f335-4961-9676-11b097eb2194", "3eecafc3-7b6d-4409-a8cf-101d10139dcc", "7d092fb1-d8af-4af6-877d-a53c69d3f3c8", "d046a5d5-2a39-420a-995d-ca1ddd237723", "7e6721aa-8ade-49a8-ade5-6bf2586a606c", "4227074a-be01-4a63-8f35-83455ffc653e", "e3513bc4-9e03-4ab3-9f07-3ba7a01a1135", "c6506cc9-39be-4912-ad62-b57a3242549c", "fc0e3f6e-b17f-4350-ba79-19873935640c"]	2026-10-12	0	t	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
2225433e-7c18-4222-9700-e2f8e735c22a	5c5848001eb7ca3edb5f1d9a	\N	회의실 정리	🪑	회의실 정리와 화이트보드 지우기	ROTATION	DAILY	["0b28c420-7b85-4fae-ac29-c62074c469c9", "991b2268-d8b8-4127-a4a1-0648da2a3d88", "ccdbf176-4285-4734-91b4-ea4ee2bf16a5", "032b0ff0-cf49-44de-8478-b79536bce329", "26edcc02-bda5-46af-8759-80c4b24d9872", "56c18c2f-d43a-4f06-92a0-ad785f48d942", "10dd366a-993b-4297-9799-efd799518e9c", "5617b5c6-4bac-467a-9e8a-0075dfc47ec5", "a1bbc3d6-9b5b-48a2-838c-4496457de48c", "aa23cb8d-261f-4a2e-9bd2-771759659a4c", "4ed9481a-8c95-43ba-8832-95d3bb44473a", "88b3b850-7910-46c4-af8b-ee5d2194d03a", "e93bad82-e81d-45d2-8bed-edd34446ee99", "f847adce-31e5-4f77-a666-1fa0efdf6374", "616d01b4-afce-43ed-b57d-caf88803fe9e", "3515b570-e1cd-4f5c-a65d-67f76e560e99", "ca8bbc62-caaf-4ee6-a26d-184b831d1a9d", "c3937195-11b4-410f-8069-d7007277b086", "7ecdb42f-2194-45b1-8f4b-f399996af2b8", "1a398608-3edb-41e6-86dc-e16415bab310", "c3108591-b396-4f8e-b3f7-73ba302fde9f", "3ab71819-06a6-48c5-b4ac-1b42894eb74a", "a2da8743-0244-4399-9c94-724c93b7f0b4", "81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd", "c55107c7-b1e6-48dc-be93-f0e845acbdce", "7e58b8cd-b525-4403-998c-8a6a4ce6cd10", "607bf496-70ab-4622-89d8-433736254355", "1b47bac3-4ea3-4b82-9631-39730990e8fb", "469fb89a-fe8d-4132-82fb-1117609d0d7b", "0689dbc7-0ec7-42ef-8625-73fea7a406ce", "2c059cd8-7338-4e3c-87c3-54792ec418ac", "4c991d09-c69a-4674-83ac-f21125d5e2e5", "c24cbb3e-f6a3-4f57-a11a-75dcaad6c650", "415caa6d-731a-4ad9-a412-a928e09264b1", "e6631004-24e5-4ff6-9dff-c880f38dc227", "3d780ace-7474-43cf-b4b0-10c9c3350615", "7c930bc6-1791-42cd-93ec-9ce4499251d8", "b6bedee2-168d-4f81-b03e-b58676faa40d", "ff3b091d-f77f-4429-bf27-98eecc84fed3", "5d14bba9-a644-40c0-a48b-ab9fdd876b9b", "31bc1950-5112-4d5a-a4df-6c6de4fd12b3", "7136bc09-e698-4590-8e22-03332e6a39ad", "7c671f41-3fd5-4aaf-832e-97e6fe96810c", "f4dc3955-250f-4515-a453-44c3c3f9838d", "de04573b-8d39-4c09-9510-054e044ab033", "33bfc592-2a58-4b7a-8775-03b3c0dac293", "3bce57f6-f335-4961-9676-11b097eb2194", "3eecafc3-7b6d-4409-a8cf-101d10139dcc", "7d092fb1-d8af-4af6-877d-a53c69d3f3c8", "d046a5d5-2a39-420a-995d-ca1ddd237723", "7e6721aa-8ade-49a8-ade5-6bf2586a606c", "4227074a-be01-4a63-8f35-83455ffc653e", "e3513bc4-9e03-4ab3-9f07-3ba7a01a1135", "c6506cc9-39be-4912-ad62-b57a3242549c", "fc0e3f6e-b17f-4350-ba79-19873935640c"]	2026-10-12	0	t	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
0d71fbe8-2528-420b-b305-8c80572ff7e3	5c5848001eb7ca3edb5f1d9a	\N	분리수거	♻️	분리수거와 쓰레기 정리	FIXED	WEEKLY	["d046a5d5-2a39-420a-995d-ca1ddd237723", "7e6721aa-8ade-49a8-ade5-6bf2586a606c"]	2026-10-12	0	t	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
174517a5-d9aa-47cd-9e45-5c0b732e28be	5c5848001eb7ca3edb5f1d9a	\N	화분 물주기	🪴	사무실 식물에 물을 줘요	FIXED	WEEKLY	["d046a5d5-2a39-420a-995d-ca1ddd237723", "7e6721aa-8ade-49a8-ade5-6bf2586a606c"]	2026-10-12	0	t	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
\.


--
-- Data for Name: DutyLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DutyLog" (id, "dutyId", "periodKey", "userId", "originalId", status, memo, "doneAt", "createdAt", "updatedAt") FROM stdin;
194bbdac-0205-438b-927b-f63716f14c85	6a4edbe1-ebb7-4d3a-86dd-395e92467a97	2026-10-26	2c059cd8-7338-4e3c-87c3-54792ec418ac	\N	DONE	A4 용지 주문 완료	2026-10-30 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
4fba4d4e-1d33-4b16-a7a8-32e506695565	6a4edbe1-ebb7-4d3a-86dd-395e92467a97	2026-10-19	a1bbc3d6-9b5b-48a2-838c-4496457de48c	\N	DONE	화분 물 듬뿍	2026-10-29 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
822890ae-fe58-41d3-890f-5cfc0332b60b	ac37f383-baf6-4800-b8f4-ffaf7b367035	2026-10-26	607bf496-70ab-4622-89d8-433736254355	\N	DONE	화분 물 듬뿍	2026-10-30 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
65232441-eff1-46cf-91a9-7fed59f6d805	ac37f383-baf6-4800-b8f4-ffaf7b367035	2026-10-19	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	\N	DONE	A4 용지 주문 완료	2026-10-29 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
b28b423b-a0d5-4267-82e4-5376a4e18532	63211578-5f61-4b6a-ae7c-8919530a275b	2026-11-01	4c991d09-c69a-4674-83ac-f21125d5e2e5	\N	DONE	회의실 정리 끝	2026-10-30 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
2f037229-f843-4a87-8bf8-6f6a47a60d22	63211578-5f61-4b6a-ae7c-8919530a275b	2026-10-31	c6506cc9-39be-4912-ad62-b57a3242549c	\N	DONE	정수기 필터 교체	2026-10-29 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
708e10ad-613b-48e6-bdf6-f8fc43f4a84a	2225433e-7c18-4222-9700-e2f8e735c22a	2026-11-01	e6631004-24e5-4ff6-9dff-c880f38dc227	\N	DONE	A4 용지 주문 완료	2026-10-30 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
7a1b8509-9c0e-490d-a3b1-0a16571d6e6b	2225433e-7c18-4222-9700-e2f8e735c22a	2026-10-31	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	DONE	회의실 정리 끝	2026-10-29 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
34e37c61-d473-4914-a1e5-f0a1acf9d92c	0d71fbe8-2528-420b-b305-8c80572ff7e3	2026-10-26	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	DONE	회의실 정리 끝	2026-10-30 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
19b73d28-4e5c-47a4-9551-c2abd4d88f31	0d71fbe8-2528-420b-b305-8c80572ff7e3	2026-10-19	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	DONE	회의실 정리 끝	2026-10-29 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
f39d363c-7c5a-4dd2-b8de-5e0d5d50cdac	174517a5-d9aa-47cd-9e45-5c0b732e28be	2026-10-26	d046a5d5-2a39-420a-995d-ca1ddd237723	\N	DONE	회의실 정리 끝	2026-10-30 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
ef8972c6-9b1d-4cd5-9882-319ef4d0fed7	174517a5-d9aa-47cd-9e45-5c0b732e28be	2026-10-19	7e6721aa-8ade-49a8-ade5-6bf2586a606c	\N	DONE	회의실 정리 끝	2026-10-29 23:56:12.508	2026-11-01 23:56:12.508	2026-11-01 23:56:12.508
\.


--
-- Data for Name: EmployeeOfTheMonth; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeOfTheMonth" (id, "groupId", month, "userId", note, "selectedById", "createdAt", "updatedAt") FROM stdin;
001af4bf-4317-4c86-b65c-7d8ecbe794e3	5c5848001eb7ca3edb5f1d9a	2026-08	4ed9481a-8c95-43ba-8832-95d3bb44473a	샘플 선정 사유	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
9bc6b050-cf1e-4ab8-98be-739f702462af	5c5848001eb7ca3edb5f1d9a	2026-08	1a398608-3edb-41e6-86dc-e16415bab310	샘플 선정 사유	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
96b4cb3e-e5fd-43e4-9eb7-5a47ac4101ce	5c5848001eb7ca3edb5f1d9a	2026-09	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	샘플 선정 사유	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
586d2b98-c944-4d8f-b182-d32d2e0ac572	5c5848001eb7ca3edb5f1d9a	2026-09	1a398608-3edb-41e6-86dc-e16415bab310	샘플 선정 사유	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
cmvta8djc0002opx4mrs619hx	5c5848001eb7ca3edb5f1d9a	2026-10	0689dbc7-0ec7-42ef-8625-73fea7a406ce	\N	AUTO	2026-10-29 08:29:28.585	2026-10-29 08:29:28.585
cmvta8djc0003opx4iis0a8zg	5c5848001eb7ca3edb5f1d9a	2026-10	1a398608-3edb-41e6-86dc-e16415bab310	\N	AUTO	2026-10-29 08:29:28.585	2026-10-29 08:29:28.585
\.


--
-- Data for Name: EmployeeOfTheMonthComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeOfTheMonthComment" (id, "groupId", month, "targetUserId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
986c7552-593d-4df0-be6f-a2b2a7d6ca3d	5c5848001eb7ca3edb5f1d9a	2026-08	4ed9481a-8c95-43ba-8832-95d3bb44473a	10dd366a-993b-4297-9799-efd799518e9c	다음 달도 기대할게요	2026-10-22 08:29:16.165	2026-10-29 08:29:26.293
7a136200-fb9a-40df-9874-f10a77ae6668	5c5848001eb7ca3edb5f1d9a	2026-08	4ed9481a-8c95-43ba-8832-95d3bb44473a	f847adce-31e5-4f77-a666-1fa0efdf6374	이번 달도 멋져요	2026-10-22 00:51:34.168	2026-10-29 08:29:26.293
2761b891-1f33-4668-9cf1-6f5793acc80c	5c5848001eb7ca3edb5f1d9a	2026-08	1a398608-3edb-41e6-86dc-e16415bab310	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	다음 달도 기대할게요	2026-10-13 06:44:57.423	2026-10-29 08:29:26.293
bd4cecba-8e3b-4eb3-a661-f7a555937672	5c5848001eb7ca3edb5f1d9a	2026-08	1a398608-3edb-41e6-86dc-e16415bab310	10dd366a-993b-4297-9799-efd799518e9c	수고 많았어요	2026-10-25 23:53:35.585	2026-10-29 08:29:26.293
3e52c334-7a12-4037-a3cf-9fc81b44507a	5c5848001eb7ca3edb5f1d9a	2026-09	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	d046a5d5-2a39-420a-995d-ca1ddd237723	수고 많았어요	2026-10-17 16:12:31.268	2026-10-29 08:29:26.293
7899b007-1c0c-4462-a414-903e02fe17bd	5c5848001eb7ca3edb5f1d9a	2026-09	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	e93bad82-e81d-45d2-8bed-edd34446ee99	축하해요!	2026-10-23 17:24:01.716	2026-10-29 08:29:26.293
711c2567-5911-4e67-82d1-4a457069e446	5c5848001eb7ca3edb5f1d9a	2026-09	1a398608-3edb-41e6-86dc-e16415bab310	3515b570-e1cd-4f5c-a65d-67f76e560e99	같이 일해서 좋아요	2026-10-18 03:02:45.91	2026-10-29 08:29:26.293
7add2192-748b-4a43-b307-2de446c4723f	5c5848001eb7ca3edb5f1d9a	2026-09	1a398608-3edb-41e6-86dc-e16415bab310	0689dbc7-0ec7-42ef-8625-73fea7a406ce	수고 많았어요	2026-10-22 12:03:07.238	2026-10-29 08:29:26.293
\.


--
-- Data for Name: EmployeeOfTheMonthNomination; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeOfTheMonthNomination" (id, "groupId", month, "nominatorId", "nomineeId", reason, "createdAt", "updatedAt") FROM stdin;
196f3668-4a49-41d6-b251-bd36356af5ba	5c5848001eb7ca3edb5f1d9a	2026-08	4c991d09-c69a-4674-83ac-f21125d5e2e5	0689dbc7-0ec7-42ef-8625-73fea7a406ce	문제 해결을 도와줬어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
0ea7322f-0867-4180-93f9-38d2e6632756	5c5848001eb7ca3edb5f1d9a	2026-08	ff3b091d-f77f-4429-bf27-98eecc84fed3	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
e632ad60-2c5e-4844-a433-daabf56e6c4e	5c5848001eb7ca3edb5f1d9a	2026-08	26edcc02-bda5-46af-8759-80c4b24d9872	1a398608-3edb-41e6-86dc-e16415bab310	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
d8205cd1-42fa-4bc9-a85f-8da189710f5b	5c5848001eb7ca3edb5f1d9a	2026-08	c3937195-11b4-410f-8069-d7007277b086	991b2268-d8b8-4127-a4a1-0648da2a3d88	늘 먼저 손을 내밀어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
d3190c15-9111-41c2-a1d3-0dcc83cf1733	5c5848001eb7ca3edb5f1d9a	2026-08	10dd366a-993b-4297-9799-efd799518e9c	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	늘 먼저 손을 내밀어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
37c7a34c-1313-4455-999d-2ef3c9d6e8ba	5c5848001eb7ca3edb5f1d9a	2026-08	0b28c420-7b85-4fae-ac29-c62074c469c9	e6631004-24e5-4ff6-9dff-c880f38dc227	늘 먼저 손을 내밀어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
e7501941-4dff-4866-8cbf-ac615791b8fc	5c5848001eb7ca3edb5f1d9a	2026-08	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
b62fede9-bbc9-42e9-a5af-b9d24a830985	5c5848001eb7ca3edb5f1d9a	2026-08	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	4ed9481a-8c95-43ba-8832-95d3bb44473a	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
3aab81a2-e0f2-4640-9d45-bd46a7f3eebf	5c5848001eb7ca3edb5f1d9a	2026-09	4c991d09-c69a-4674-83ac-f21125d5e2e5	0689dbc7-0ec7-42ef-8625-73fea7a406ce	문제 해결을 도와줬어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
32dbefa3-b8bb-4650-9c50-aaffa48ab4b2	5c5848001eb7ca3edb5f1d9a	2026-09	ff3b091d-f77f-4429-bf27-98eecc84fed3	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
fd0f499f-7b43-4bac-9092-00d687e5b4a3	5c5848001eb7ca3edb5f1d9a	2026-09	26edcc02-bda5-46af-8759-80c4b24d9872	1a398608-3edb-41e6-86dc-e16415bab310	협업이 좋아요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
2df57667-3a26-4e99-834d-99dd7e6e69a0	5c5848001eb7ca3edb5f1d9a	2026-09	c3937195-11b4-410f-8069-d7007277b086	991b2268-d8b8-4127-a4a1-0648da2a3d88	협업이 좋아요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
d59b9b2f-9e1e-45f8-98d6-5797e3b048f0	5c5848001eb7ca3edb5f1d9a	2026-09	10dd366a-993b-4297-9799-efd799518e9c	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
70bfc9d2-5e21-4351-8df0-e65d692a2904	5c5848001eb7ca3edb5f1d9a	2026-09	0b28c420-7b85-4fae-ac29-c62074c469c9	e6631004-24e5-4ff6-9dff-c880f38dc227	밝은 분위기를 만들어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
9beec1c6-6b0e-4787-9781-09ec0e37dd5a	5c5848001eb7ca3edb5f1d9a	2026-09	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	늘 먼저 손을 내밀어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
719b94eb-f34c-4c38-a7c8-6fe4bc82d1c7	5c5848001eb7ca3edb5f1d9a	2026-09	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	4ed9481a-8c95-43ba-8832-95d3bb44473a	문제 해결을 도와줬어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
64d09795-a257-41fb-8bb4-0d27238d3453	5c5848001eb7ca3edb5f1d9a	2026-10	4c991d09-c69a-4674-83ac-f21125d5e2e5	0689dbc7-0ec7-42ef-8625-73fea7a406ce	문제 해결을 도와줬어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
638df103-3b61-4eea-b3a5-aaa9abfb0c50	5c5848001eb7ca3edb5f1d9a	2026-10	ff3b091d-f77f-4429-bf27-98eecc84fed3	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	문제 해결을 도와줬어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
077c9e59-752d-4793-8be8-6ca41e52ea9a	5c5848001eb7ca3edb5f1d9a	2026-10	26edcc02-bda5-46af-8759-80c4b24d9872	1a398608-3edb-41e6-86dc-e16415bab310	문제 해결을 도와줬어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
9097fd6f-c89c-440c-b41a-0bbfe1d96bfd	5c5848001eb7ca3edb5f1d9a	2026-10	c3937195-11b4-410f-8069-d7007277b086	991b2268-d8b8-4127-a4a1-0648da2a3d88	밝은 분위기를 만들어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
fdc60255-f344-4472-8677-9ad70e5b7130	5c5848001eb7ca3edb5f1d9a	2026-10	10dd366a-993b-4297-9799-efd799518e9c	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	늘 먼저 손을 내밀어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
6b3fc520-e376-402c-9cdd-cb3b22602db2	5c5848001eb7ca3edb5f1d9a	2026-10	0b28c420-7b85-4fae-ac29-c62074c469c9	e6631004-24e5-4ff6-9dff-c880f38dc227	밝은 분위기를 만들어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
a4ddd442-a20c-427d-8d20-5ebb5be5066d	5c5848001eb7ca3edb5f1d9a	2026-10	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	꼼꼼한 리뷰가 인상적이에요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
64bb456a-f611-41bf-b14c-b19cf8d0d523	5c5848001eb7ca3edb5f1d9a	2026-10	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	4ed9481a-8c95-43ba-8832-95d3bb44473a	늘 먼저 손을 내밀어요	2026-10-29 08:29:26.293	2026-10-29 08:29:26.293
\.


--
-- Data for Name: EmployeeOfTheMonthSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmployeeOfTheMonthSetting" ("groupId", "publishDay", "updatedById", "updatedAt", "winnerCount") FROM stdin;
5c5848001eb7ca3edb5f1d9a	1	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:29:26.293	2
\.


--
-- Data for Name: FeatureConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureConfig" (feature, active, "updatedAt", "isDefault", "guideSummary", "guideBody", "guideImages") FROM stdin;
MINI_GAMES	t	2026-10-29 09:34:45.654	f	\N	\N	\N
BOARD	t	2026-10-29 09:39:04.233	f	\N	\N	\N
SUGGESTION_BOX	t	2026-10-29 09:53:25.953	t	\N	\N	\N
\.


--
-- Data for Name: FeatureSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FeatureSetting" ("groupId", feature, "values", "updatedById", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GamePhoto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GamePhoto" (id, "groupId", "userId", kind, "mediaUrl", caption, "createdAt") FROM stdin;
dd072d40-2e5d-4450-8e3c-9329d5b24620	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	BELONGING	https://picsum.photos/seed/90f3df72/480/480	출근길 에코백	2026-10-31 18:14:51.638
0bff77b0-6bea-492d-8c06-f956ff1e1b16	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	BELONGING	https://picsum.photos/seed/3888a3d0/480/480	책상 위 텀블러	2026-10-27 13:38:44.241
8bd9b977-0274-4089-8937-83667b6d0b02	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	BELONGING	https://picsum.photos/seed/d7c9bbe2/480/480	매일 쓰는 키보드	2026-10-23 15:22:51.692
349b2938-cab8-4dec-a073-9a0d44774ee6	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	BELONGING	https://picsum.photos/seed/ca882905/480/480	책상 위 텀블러	2026-10-23 12:08:31.429
d0114407-3806-45e0-b40f-452919612184	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	BELONGING	https://picsum.photos/seed/1ae0de49/480/480	책상 위 텀블러	2026-10-28 06:23:03.881
cbe98be1-fdfe-4bf1-8b64-72887bf84642	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	BELONGING	https://picsum.photos/seed/54393bd3/480/480	회의용 노트	2026-10-24 02:11:02.955
83f4a244-49e7-4449-8e10-16e0b1a73461	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	BELONGING	https://picsum.photos/seed/dfa9938e/480/480	회의용 노트	2026-10-28 19:30:14.361
20f97f74-4d2f-4608-b4ff-655d3e76885a	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	BELONGING	https://picsum.photos/seed/a40ce885/480/480	출근길 에코백	2026-10-25 03:22:21.592
ce8339b9-c8b0-420a-9a26-f4c5aa1a763d	5c5848001eb7ca3edb5f1d9a	0689dbc7-0ec7-42ef-8625-73fea7a406ce	BELONGING	https://picsum.photos/seed/8aae3b3a/480/480	커피 쿠폰 카드	2026-10-28 16:44:30.678
a4be1ab0-9a72-452a-b3c1-e9fbeabcbf2f	5c5848001eb7ca3edb5f1d9a	b6bedee2-168d-4f81-b03e-b58676faa40d	BELONGING	https://picsum.photos/seed/2bc96692/480/480	고양이 방석	2026-10-24 07:54:04.773
4f066e1d-2baf-41ac-91ed-b85b653f1981	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	BELONGING	https://picsum.photos/seed/af50a1fa/480/480	사무실 화분	2026-10-30 22:32:21.308
bbbcf1e8-4f99-423f-83bc-4a94ca0db784	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	BELONGING	https://picsum.photos/seed/caca9101/480/480	책상 위 텀블러	2026-10-31 06:14:08.67
91838972-5dd7-4440-a647-596b057b125d	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	BELONGING	https://picsum.photos/seed/193c9175/480/480	회의용 노트	2026-10-30 14:52:27.96
7fee69f5-82a6-4697-b88a-f7f47213fc9f	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	BELONGING	https://picsum.photos/seed/4a6b0fac/480/480	고양이 방석	2026-10-28 02:43:23.818
5bf7a8af-5ad0-41a7-b203-89c0f6a952b2	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	BELONGING	https://picsum.photos/seed/22309904/480/480	책상 위 텀블러	2026-10-31 12:01:03.305
0104e8c6-55b4-48e9-934f-cafc51e612ca	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	BELONGING	https://picsum.photos/seed/bd033913/480/480	커피 쿠폰 카드	2026-10-25 04:05:17.439
e1d39372-34a5-421e-a257-425747444bc9	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	BELONGING	https://picsum.photos/seed/d5f92f39/480/480	매일 쓰는 키보드	2026-10-30 21:57:10.913
9c34d29a-eb16-4d55-8304-f8eb6d860f17	5c5848001eb7ca3edb5f1d9a	7c930bc6-1791-42cd-93ec-9ce4499251d8	BELONGING	https://picsum.photos/seed/c44ddfa6/480/480	커피 쿠폰 카드	2026-10-30 22:28:06.292
ae06893e-3466-40ef-9044-d628cadaf791	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	BELONGING	https://picsum.photos/seed/c1098325/480/480	매일 쓰는 키보드	2026-10-25 13:24:02.381
ce80e5a7-515e-4708-b727-a2182d0c46cf	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	BELONGING	https://picsum.photos/seed/748cb04b/480/480	회의용 노트	2026-10-26 10:51:15.222
ea333ec1-d9a4-4598-bdbd-2f9be0e352c8	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	BELONGING	https://picsum.photos/seed/37651572/480/480	매일 쓰는 키보드	2026-10-28 08:44:22.24
3d295917-41c5-4988-95a3-1645e3b168e0	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	BELONGING	https://picsum.photos/seed/56fac439/480/480	고양이 방석	2026-10-27 08:07:42.208
73ac10c1-656a-431e-9093-d48150799b24	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	BELONGING	https://picsum.photos/seed/b1ae48c3/480/480	매일 쓰는 키보드	2026-10-27 20:51:19.282
fcd3a79e-4d73-4ee2-a925-5ca5d53c6879	5c5848001eb7ca3edb5f1d9a	3bce57f6-f335-4961-9676-11b097eb2194	BELONGING	https://picsum.photos/seed/9dc259fe/480/480	회의용 노트	2026-10-27 01:58:28.891
f8248068-f795-4272-85ad-32ab178dd3fa	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	BELONGING	https://picsum.photos/seed/97fffc92/480/480	고양이 방석	2026-10-31 03:02:01.728
ddec5323-a67e-46eb-9c4e-dcc81b9c8806	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	BELONGING	https://picsum.photos/seed/ce242ab4/480/480	회의용 노트	2026-10-29 11:04:03.927
c96fa4d2-0233-4d8b-a040-abbab2dd0b28	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	BELONGING	https://picsum.photos/seed/2694411e/480/480	매일 쓰는 키보드	2026-10-24 10:20:11.154
\.


--
-- Data for Name: GameScore; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GameScore" (id, "groupId", "userId", game, value, score, "playedOn", "createdAt") FROM stdin;
cmvym05yc0001opsdnjfm6998	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	HIGH_LOW	0	0	2026-11-02	2026-11-02 01:57:51.78
cmvymqyrn0001opmnurx1q155	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	CHOSUNG	0	0	2026-11-02	2026-11-02 02:18:42.179
6cf6765c-5e7c-415b-b4ca-5510c4ea24ee	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	9879.09	97.58	2026-11-02	2026-11-02 00:16:40.668
9cfc9b92-c71f-480f-8b81-ec6e7a212fcb	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	10653.01	86.94	2026-11-02	2026-11-02 05:54:22.094
6acca1d8-99d0-4bf1-8536-c3db98473095	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	MEMORY	12	96	2026-11-02	2026-11-02 08:07:09.695
61812532-0dff-4128-b1b9-62c99c2079ab	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	COLOR_TRAP	22	88	2026-11-02	2026-11-02 07:24:31.548
c2b38a14-7eec-4fa0-978d-2cd4cd8a209e	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	9915.18	98.3	2026-10-29	2026-10-29 00:53:44.94
5fb9ee7e-87d2-44b4-a7fc-19735eee5ec0	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	REACTION	255.94	76.46	2026-10-29	2026-10-29 06:56:56.385
cb9f6b43-c792-4fa6-9390-1a2d9f6c8652	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	10384.54	92.31	2026-10-28	2026-10-28 08:51:22.824
f57399fa-2099-4c6b-9d2b-27087a3d9466	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	NUMBER_TOUCH	12853.87	84.83	2026-10-28	2026-10-28 00:20:41.214
d1c5a284-3844-4fd5-9579-9e0763800472	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	NUMBER_TOUCH	16333.83	73.96	2026-10-28	2026-10-28 03:28:29.871
44d44f78-1519-4d1f-9412-2d6f808a2589	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	10472.01	90.56	2026-10-25	2026-10-25 00:36:23.448
21e6559e-a0fd-487d-9ef2-0ef0ac16f555	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	REACTION	326.63	60.75	2026-10-25	2026-10-25 00:13:01.499
53e67701-6ce4-4765-a780-1b54fb7e0a3d	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	MEMORY	12	96	2026-10-25	2026-10-25 05:14:52.62
f7d7eb42-335b-481e-8d2a-28721c773a9d	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	MEMORY	10	80	2026-10-25	2026-10-25 05:40:33.171
f014ed53-5265-4cdd-84ab-5b67494a1fbc	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	10025.39	99.49	2026-10-24	2026-10-24 04:51:12.775
cce17cd7-7e66-4a7f-a8e8-0f255e700f5a	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEN_SECONDS	10676.62	86.47	2026-10-24	2026-10-24 08:42:26.335
f3e8ad38-5dc3-4cc3-8c05-cc1e949137a9	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	NUMBER_TOUCH	12232.97	86.77	2026-10-24	2026-10-24 07:42:17.526
251c60b1-5a2f-4371-aa75-61c6ab416d0b	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	COLOR_TRAP	21	84	2026-10-24	2026-10-24 05:53:35.539
9e17db04-ea9a-4d35-9ba2-68c48c3559a1	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	REACTION	224.68	83.4	2026-10-23	2026-10-23 01:48:54.497
65045d46-08ca-4e7c-aeaa-4c6d44fcad79	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	COLOR_TRAP	23	92	2026-10-23	2026-10-23 06:53:03.897
2a336369-1add-47d3-b3bf-7171c41ca69f	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	COLOR_TRAP	24	96	2026-10-23	2026-10-23 07:27:11.477
8dce1919-aa54-416e-b358-3909ced2bc53	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	TEN_SECONDS	9931.52	98.63	2026-10-30	2026-10-30 01:45:52.231
e1fe9028-250e-473c-b90e-2f17f0bed4b4	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	TEN_SECONDS	10129.64	97.41	2026-10-30	2026-10-30 06:09:35.492
1a060d1f-da3f-413f-88d7-fd802e438c91	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	NUMBER_TOUCH	13443.34	82.99	2026-10-30	2026-10-30 02:07:17.818
08cbab13-ae40-4b51-887d-4fd30467b981	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	COLOR_TRAP	22	88	2026-10-30	2026-10-30 08:04:27.717
3fa14ab8-4ed5-4ee9-a85b-cbddd0037e8d	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	COLOR_TRAP	22	88	2026-10-30	2026-10-30 07:13:01.885
d65b1ca3-ec0b-45ee-8c68-fafe43021ece	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	TEN_SECONDS	10269.49	94.61	2026-10-27	2026-10-27 08:28:58.092
4bce7109-925e-4b7c-a96f-99e96fd82205	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	NUMBER_TOUCH	15679.69	76	2026-10-27	2026-10-27 04:34:02.388
f0c6ed9c-971b-4853-a273-c551f32cfcf3	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	MEMORY	11	88	2026-10-27	2026-10-27 02:47:36.764
b53effa6-7906-4ee3-ad89-dde1e13113da	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	MEMORY	11	88	2026-10-27	2026-10-27 08:59:15.471
a231ec90-02fa-4d2a-9a86-32474d8391cc	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	COLOR_TRAP	22	88	2026-10-27	2026-10-27 00:01:00.577
6a68b194-0ef2-4ecf-989c-9798f718a162	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	COLOR_TRAP	25	100	2026-10-27	2026-10-27 04:28:18.441
173f9fd6-9055-4265-94ab-bcb8cff93d9e	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	MEMORY	10	80	2026-10-25	2026-10-25 07:06:13.774
41e35505-fee8-4826-bf0c-b7cf8f56c40d	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	MEMORY	11	88	2026-10-25	2026-10-25 06:43:58.623
1c439e1b-c00b-442a-b140-d41c59fce0a7	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	TEN_SECONDS	9463.31	89.27	2026-10-20	2026-10-20 01:04:19.182
bbbb1d02-3343-4d13-8132-aa3a3b1b3852	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	TEN_SECONDS	10519.71	89.61	2026-10-20	2026-10-20 06:22:29.368
f67927b6-80e3-4110-82c3-32811f35e085	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	MEMORY	10	80	2026-10-20	2026-10-20 05:13:41.244
a51ab6b4-97c2-4e3d-a533-93c776c5436c	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	MEMORY	11	88	2026-10-20	2026-10-20 00:45:41.461
028e4732-7d82-48ed-95ff-753536da2026	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	16445.36	73.61	2026-10-31	2026-10-31 08:49:07.534
eb9a8538-e362-4df0-b4b5-5938eac25aec	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	17340.23	70.81	2026-10-31	2026-10-31 02:23:50.755
cdd7803f-86f1-4a08-8f7c-57f8e08d3c73	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	COLOR_TRAP	22	88	2026-10-31	2026-10-31 04:59:11.79
1d8f76fe-9aa1-4533-bc26-bed4d93ba0a7	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	MEMORY	9	72	2026-10-29	2026-10-29 08:58:03.934
760d427a-4959-45e9-b5d7-52c0b9aaa1ec	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	19855.2	62.95	2026-10-28	2026-10-28 00:51:28.103
d1efd08e-ba1a-42d2-9f6d-bfa1dc50c181	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	19101.85	65.31	2026-10-28	2026-10-28 02:08:22.941
15c2d273-f0c7-453d-bf4c-926636f1625e	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	MEMORY	8	64	2026-10-28	2026-10-28 07:26:44.402
efae62bf-211d-4f0f-b4ef-e6dd6e46ed09	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	COLOR_TRAP	22	88	2026-10-28	2026-10-28 04:15:18.981
abf2b492-7a62-4db8-92cd-126862f14324	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	TEN_SECONDS	10529.86	89.4	2026-10-24	2026-10-24 03:11:35.141
20c80ba6-3a8d-437c-82ba-3dfcdb5e46fb	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	TEN_SECONDS	10429.34	91.41	2026-10-24	2026-10-24 00:56:17.795
cf7b9582-2a1f-4acc-a70d-c97edb9f2543	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	16787.24	72.54	2026-10-24	2026-10-24 08:55:39.382
b7a8b6d6-7f4e-413a-85e3-9de2ed7e71c0	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	19028.93	65.53	2026-10-24	2026-10-24 00:27:31.337
202087e9-bdbd-4f2c-a7e7-4b9ca21a2dfa	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	MEMORY	10	80	2026-10-24	2026-10-24 03:44:32.611
0dbe363a-7ead-4b2c-b582-d57c40ca78b7	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	MEMORY	9	72	2026-10-24	2026-10-24 06:08:07.405
c91f41ed-79af-4282-9cb5-732d9a251303	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	TEN_SECONDS	9284.76	85.7	2026-10-23	2026-10-23 03:39:25.482
a7c23509-8902-49eb-aed7-77aba6a9770f	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	TEN_SECONDS	10967.12	80.66	2026-10-23	2026-10-23 04:36:27.114
fb571164-28d7-46ed-a097-0b609756c61d	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	NUMBER_TOUCH	18375.13	67.58	2026-10-23	2026-10-23 02:55:02.523
af43df93-f2b6-4e02-b387-eaa66df64a11	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	MEMORY	10	80	2026-10-23	2026-10-23 07:31:27.074
91b6fe49-248a-40d3-a74d-353181d19226	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	COLOR_TRAP	19	76	2026-10-23	2026-10-23 04:49:56.737
24a34fdf-6b49-4936-9d79-cb63da717062	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	COLOR_TRAP	19	76	2026-10-23	2026-10-23 01:23:14.499
81a0c8aa-329f-49b9-a6a5-d99969699143	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	TEN_SECONDS	9550.92	91.02	2026-10-20	2026-10-20 04:14:15.302
aad0eda8-a2ae-4685-9044-2453952934f1	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	COLOR_TRAP	18	72	2026-10-20	2026-10-20 01:13:59.546
f7f39ec8-30ad-47d7-bd82-0f7e7f3d086d	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	TEN_SECONDS	9712.34	94.25	2026-10-31	2026-10-31 07:16:05.477
4a972e5c-60f2-4756-b091-c72285ca14b1	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	MEMORY	14	100	2026-10-31	2026-10-31 08:36:19.864
16facbb7-d809-4a52-b988-8c7d7016561b	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	TEN_SECONDS	10313.72	93.73	2026-10-29	2026-10-29 07:09:04.649
4148d5c7-c2cd-4ae2-9a6f-d49723af26ea	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	TEN_SECONDS	10235.56	95.29	2026-10-29	2026-10-29 07:33:36.645
130c6cac-2f2c-4d5e-9721-5751ee121d1f	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	REACTION	251.37	77.47	2026-10-29	2026-10-29 02:59:51.877
8049a523-b3a6-4d8f-89ef-e44cd0039c97	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	REACTION	265.79	74.27	2026-10-29	2026-10-29 00:08:00.364
670f4526-8496-4ac4-b3fd-62c077ed28f7	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	TEN_SECONDS	10104.31	97.91	2026-10-28	2026-10-28 02:49:14.844
2718eabd-6378-43bc-8c96-59b5bf7eca58	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	REACTION	268.26	73.72	2026-10-28	2026-10-28 08:54:01.184
c5a83f6c-f386-4a79-a520-571075a2e207	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	REACTION	205.45	87.68	2026-10-28	2026-10-28 06:40:23.634
f036ac93-3e0b-4880-a7bc-25ff8d4704b5	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	NUMBER_TOUCH	12423.23	86.18	2026-10-28	2026-10-28 00:06:33.738
88152b1e-826e-405e-a85f-4a58f9cdafb1	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	COLOR_TRAP	25	100	2026-10-26	2026-10-26 00:27:30.792
0298b2e3-7f02-4ab4-a028-b174135e70c2	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	COLOR_TRAP	23	92	2026-10-26	2026-10-26 08:40:05.493
731e0218-c572-41de-a2c2-7be6d3635627	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	TEN_SECONDS	10047.3	99.05	2026-10-21	2026-10-21 01:03:37.075
36f0ac20-d247-426a-b98c-c33a530a5f28	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	TEN_SECONDS	9703.67	94.07	2026-10-21	2026-10-21 03:39:06.041
5248ec3c-8200-4343-bc7d-1d63e8757501	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	REACTION	178.74	93.61	2026-10-21	2026-10-21 01:12:45.257
0050de82-4241-4946-805f-dfb0cd0aeb91	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	REACTION	189.74	91.17	2026-10-21	2026-10-21 04:32:44.777
167f64b4-764c-454d-8bc2-4093c66d3e11	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	MEMORY	13	100	2026-10-21	2026-10-21 04:53:11.556
1f069700-f32a-49d1-8db7-167f423516ca	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	MEMORY	11	88	2026-10-21	2026-10-21 01:07:34.464
be5d36cb-0475-4dfc-a5a3-9f69fc4acbdc	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	NUMBER_TOUCH	21178.25	58.82	2026-10-30	2026-10-30 05:09:52.4
d76ba64e-a70b-4032-9d39-e5fdef4d0175	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	MEMORY	8	64	2026-10-30	2026-10-30 00:00:53.212
4cce3e3d-3445-473d-bc12-42b8597cfc4c	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	MEMORY	7	56	2026-10-30	2026-10-30 03:11:46.283
01bfba3e-c86c-44c1-92ee-ce3385d3f1da	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	TEN_SECONDS	8912.48	78.25	2026-10-27	2026-10-27 03:28:14.096
c3c3589c-a728-46a5-a3ad-ed0d6d639f3f	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	REACTION	353.9	54.69	2026-10-27	2026-10-27 04:57:43.247
17b8806f-b0bf-4c20-bf99-3a93518b5dbb	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	NUMBER_TOUCH	18496.97	67.2	2026-10-27	2026-10-27 04:37:59.738
5c989fb8-7c7f-402d-9241-9b84fc43787d	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	NUMBER_TOUCH	17220.76	71.19	2026-10-25	2026-10-25 05:12:52.834
688a6213-7309-4187-85fa-7dd4d127b113	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	NUMBER_TOUCH	21210.86	58.72	2026-10-25	2026-10-25 06:09:15.291
73b93b2c-3b32-49ae-9e40-a5c2c7955cca	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	TEN_SECONDS	10982.24	80.36	2026-10-23	2026-10-23 03:04:07.091
8bbd3f58-d8be-4312-8598-e041a52d5889	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	TEN_SECONDS	8562.35	71.25	2026-10-23	2026-10-23 05:07:17.046
980f9aed-b371-4c65-9ca3-96c76e9ffafb	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	REACTION	302.83	66.04	2026-10-23	2026-10-23 01:42:27.912
bd2ababe-39bf-4732-8744-68276650acab	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	REACTION	389.01	46.89	2026-10-23	2026-10-23 07:16:10.48
6ebbb493-4669-4c79-bb1b-29fe3afa4fff	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	12448.06	86.1	2026-10-29	2026-10-29 05:30:03.562
d6dc66c4-04d1-4866-9693-61d9f2108890	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	14591.5	79.4	2026-10-29	2026-10-29 01:56:41.936
91350072-5860-420c-9c5c-dc52cfc82337	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	MEMORY	12	96	2026-10-29	2026-10-29 01:31:50.436
c709a292-b2dd-4903-bc84-a75fe4511bc4	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	MEMORY	13	100	2026-10-29	2026-10-29 00:24:23.322
8fc71611-96df-4994-9b7e-25fbf0bfc514	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	24	96	2026-10-29	2026-10-29 02:20:12.799
ebb0f397-1538-42be-9029-8468e272eb3c	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	TEN_SECONDS	10368.12	92.64	2026-10-28	2026-10-28 05:14:56.164
a0a6db16-067f-4e10-88b2-997c9413ebf6	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	TEN_SECONDS	10041.13	99.18	2026-10-28	2026-10-28 00:54:12.769
eecb3973-48c5-427a-b963-26089d35dee7	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	MEMORY	13	100	2026-10-28	2026-10-28 06:02:57.987
68b754ac-2c57-447a-97ac-288b0600cf58	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	13816.88	81.82	2026-10-27	2026-10-27 02:24:14.876
551e337c-270a-40a7-8b11-fcc38583f29a	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	MEMORY	12	96	2026-10-27	2026-10-27 02:09:14.405
bde9cae6-652b-456e-bc9c-4f9be64bb5b8	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	24	96	2026-10-27	2026-10-27 01:07:58.821
40457269-4e3e-455e-89b9-e56276ccb039	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	26	100	2026-10-27	2026-10-27 00:15:30.122
d49c5516-c0db-4b33-835c-d46f98181aeb	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	TEN_SECONDS	10028.3	99.43	2026-10-25	2026-10-25 00:16:11.13
2a031b59-1981-4268-86e2-08252e9786e0	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	13151.09	83.9	2026-10-25	2026-10-25 08:02:23.668
fa25dbed-6e88-4197-ad24-ae8ea884c830	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	MEMORY	11	88	2026-10-25	2026-10-25 03:03:38.915
f44bb59f-79bd-47c7-ac3b-0b6c1f26cc57	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	MEMORY	13	100	2026-10-25	2026-10-25 04:07:36.928
18a598c9-ab46-4406-a3d5-f81c7344143a	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	11485.74	89.11	2026-10-24	2026-10-24 01:12:41.267
2f66ae5b-16a0-41b6-b8d5-88e125888e90	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	11543.34	88.93	2026-10-24	2026-10-24 01:48:13.844
1d8aa230-e847-42de-9cfe-f7f0ec10f9c5	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	12085.04	87.23	2026-10-23	2026-10-23 07:51:10.552
e1d28acb-f55a-44f6-8649-9e50890dfead	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	9881.29	94.12	2026-10-23	2026-10-23 04:05:24.438
9befa506-62e1-4513-8918-353db366bd1e	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	26	100	2026-10-23	2026-10-23 03:42:35.776
8d5164a3-747d-4a67-9ce3-4c9ca0b68d95	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	25	100	2026-10-23	2026-10-23 08:41:01.069
5bfe4977-401f-4490-b419-e049554a38d5	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	TEN_SECONDS	9661.68	93.23	2026-10-21	2026-10-21 04:01:58.713
1033ae48-1d66-4409-a93e-e1975d09cfaa	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	TEN_SECONDS	10163.24	96.74	2026-10-21	2026-10-21 07:17:39.896
ca0c1a07-f536-42d2-bb25-99876221cb18	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	NUMBER_TOUCH	12260.41	86.69	2026-10-20	2026-10-20 03:56:13.823
30494c6c-846c-4894-a840-b9f367ae835b	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	22	88	2026-10-20	2026-10-20 02:58:02.007
0e6c4315-f076-42ad-88ca-add39597b1bc	5c5848001eb7ca3edb5f1d9a	2c059cd8-7338-4e3c-87c3-54792ec418ac	COLOR_TRAP	26	100	2026-10-20	2026-10-20 03:36:55.092
27620728-ca76-4614-9773-1ce067012b98	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	TEN_SECONDS	10320.73	93.59	2026-11-02	2026-11-02 05:40:01.161
e268421d-e1a7-43f5-9a37-0410a4748276	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	11	88	2026-11-02	2026-11-02 04:39:59.819
9f62cf6a-682e-4b30-8410-2ead9a5aa596	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	13	100	2026-11-02	2026-11-02 08:22:06.986
ac96de47-4724-4cf1-855c-ec639ebc7a67	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	COLOR_TRAP	25	100	2026-11-02	2026-11-02 08:43:59.009
2eea60ba-3cbc-4062-92a3-d659f14d0e7b	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	TEN_SECONDS	9871.93	97.44	2026-10-28	2026-10-28 08:17:51.062
b7fa2aa7-583b-4413-a985-fef60acf6cc2	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	TEN_SECONDS	10183.23	96.34	2026-10-28	2026-10-28 07:51:30.8
18dcef97-c883-44a0-8e58-c069f38fe7b3	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	184.57	92.32	2026-10-28	2026-10-28 08:55:32.986
8f7ef847-8b57-4b24-8e96-f44cb7b067b5	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	254.42	76.8	2026-10-28	2026-10-28 03:15:37.64
f35a6f1c-fc4e-48e9-b5df-20b2584b798d	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	12219.84	86.81	2026-10-28	2026-10-28 05:27:55.636
04629f59-60bc-4ec2-a8e7-8506d9418010	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	12	96	2026-10-28	2026-10-28 00:51:19.829
cddb4e7c-2955-4d04-b46a-a30dc0a8cadc	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	11	88	2026-10-28	2026-10-28 04:50:15.503
5971c4ef-9766-4c20-9890-c8cbd01f3ae5	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	277.16	71.74	2026-10-25	2026-10-25 03:08:52.755
4840a81d-a9f3-4ed1-9242-d97997f2c763	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	12506.36	85.92	2026-10-25	2026-10-25 00:54:33.643
fff52da9-ee8f-45f8-8ca5-ebd310d3bee4	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	9993.16	93.77	2026-10-25	2026-10-25 04:05:01.022
55eaf9f2-8f8f-4abb-9d3c-b15fa5b98f2f	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	13	100	2026-10-25	2026-10-25 05:01:00.802
cea89081-bf4c-4fc1-ac19-d8fd0309c3d3	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	COLOR_TRAP	25	100	2026-10-25	2026-10-25 08:59:04.409
8569f9bc-a0a6-4f37-84f9-831e6886443f	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	COLOR_TRAP	22	88	2026-10-25	2026-10-25 02:11:02.764
3708bad3-0a89-4a9a-95c4-f431a39ab108	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	TEN_SECONDS	9627.01	92.54	2026-10-22	2026-10-22 08:31:51.281
20c7319d-c2f1-42de-8fc2-37ff54a25cc9	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	12441.06	86.12	2026-10-22	2026-10-22 06:40:02.217
cdc5fc06-c8d7-4b57-b580-4beedb7c8666	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	11554.98	88.89	2026-10-22	2026-10-22 07:02:36.182
580ebdae-c3d1-4679-a157-a2e6bcf13fb1	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	12	96	2026-10-22	2026-10-22 07:11:38.837
29af32dc-7c4c-4bb9-bb34-e5186a48e6da	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	MEMORY	11	88	2026-10-22	2026-10-22 07:07:32.272
f796923e-3d67-44a3-b19b-53b430555571	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	191.47	90.78	2026-10-21	2026-10-21 05:23:09.944
6c7cec1d-f8ef-48b9-a42a-261eb973a1c4	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	290.72	68.73	2026-10-21	2026-10-21 03:48:18.822
4c379013-29c9-4b29-b71b-395af896ac3d	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	12046.71	87.35	2026-10-21	2026-10-21 05:14:09.599
d936c44e-2760-41f6-944a-97f78ba77cf8	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	13557	82.63	2026-10-21	2026-10-21 08:49:22.62
87f11771-9cf5-4609-8721-ffe3b0a022a3	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	TEN_SECONDS	9869.6	97.39	2026-10-20	2026-10-20 03:41:11.071
d76166b9-35b1-48a0-bc1f-63839568ac8e	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	TEN_SECONDS	10041.48	99.17	2026-10-20	2026-10-20 02:16:55.571
a9bb08e3-68d0-4a9b-a702-9467c1158360	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	274.65	72.3	2026-10-20	2026-10-20 08:07:18.869
f3b35ba1-4333-408a-a091-ec7edf785164	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	REACTION	227.7	82.73	2026-10-20	2026-10-20 03:31:48.402
186f9047-0cf0-49de-8f5f-b8c939c0dda8	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	NUMBER_TOUCH	14382.83	80.05	2026-10-20	2026-10-20 01:52:26.68
d4b5b526-d55c-4db4-94a3-a34a17d6e490	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	230.99	82	2026-11-01	2026-11-01 02:14:42.765
7fb6f401-efec-42b4-aec3-4d5f677dc18c	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	12	96	2026-11-01	2026-11-01 05:22:37.404
8b1dd2a0-fe9f-4c65-bad5-b7b27a9fd637	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	TEN_SECONDS	10160.83	96.78	2026-10-31	2026-10-31 01:16:26.079
7a279d8b-3754-4127-b843-1a070c3aac0f	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	TEN_SECONDS	9632.82	92.66	2026-10-31	2026-10-31 05:03:04.89
362257e3-2d17-41aa-9d1f-9933781dcdb0	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	277.28	71.72	2026-10-31	2026-10-31 04:37:36.049
780ec1eb-c64a-460f-af62-9e39a344584b	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	181.69	92.96	2026-10-31	2026-10-31 07:27:31.734
3ffcb43d-7c0d-45b1-bd57-a18e723e9627	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	12	96	2026-10-31	2026-10-31 01:22:51.25
f220fd04-18a3-44d8-94d2-4dffcc5f438f	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	13	100	2026-10-31	2026-10-31 07:24:25.623
b6b05484-c650-4929-8814-c828e6d5b2f7	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	263.49	74.78	2026-10-29	2026-10-29 05:22:34.346
e7a5190b-1ed3-460c-9bf5-f9fbff1ebbae	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	281.19	70.85	2026-10-29	2026-10-29 07:36:40.62
fd902e6e-6c05-4580-9102-19bf50c44abf	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	NUMBER_TOUCH	9488.09	95.35	2026-10-29	2026-10-29 02:12:38.639
ca52dc2a-1a2e-4cc8-80e1-e65c34afe2a8	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	NUMBER_TOUCH	11395.91	89.39	2026-10-29	2026-10-29 00:08:15.103
91b48004-1a62-4df0-9f9a-2f6767571441	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	13	100	2026-10-29	2026-10-29 02:13:57.932
5811ae09-d703-43af-af8c-408d3c4583a8	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	13	100	2026-10-29	2026-10-29 00:09:54.494
581392e7-7fc3-42fa-9782-9a15826f2709	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	COLOR_TRAP	23	92	2026-10-29	2026-10-29 00:34:17.389
da2735f4-0305-4e65-9b4f-a3bc7f2cf4fb	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	190.64	90.97	2026-10-27	2026-10-27 04:03:58.585
dc1c2d6d-1916-4688-b52e-4b883b1e1d0a	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	REACTION	199.59	88.98	2026-10-27	2026-10-27 07:56:47.344
3270ce22-4b2f-4cfb-ab21-fb49e5cb2163	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	COLOR_TRAP	27	100	2026-10-27	2026-10-27 01:43:25.698
ac9c967b-3fa1-48b0-a4e3-e1c25e9b372f	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	12	96	2026-10-26	2026-10-26 06:46:11.178
56f8466c-76dc-471b-a9ac-7f033f594b28	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	NUMBER_TOUCH	12598.36	85.63	2026-10-25	2026-10-25 06:21:10.154
c56ead8d-13b3-4d64-a663-e72dcd58b47f	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	NUMBER_TOUCH	13679.67	82.25	2026-10-25	2026-10-25 06:26:27.547
0a1be9b9-0b7e-4cc8-b0da-77dabd647c36	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	13	100	2026-10-25	2026-10-25 00:44:59.595
4ffb768d-26c1-4a43-9b10-b9aea216513a	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	COLOR_TRAP	23	92	2026-10-25	2026-10-25 06:08:10.204
1eec4fb2-3c3f-4503-b607-b79bc5551e08	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	NUMBER_TOUCH	12331.32	86.46	2026-10-22	2026-10-22 06:55:16.031
e5057769-7af1-4484-9449-30f26e11a068	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	MEMORY	12	96	2026-10-22	2026-10-22 08:31:31.292
442dff69-84ed-4bbe-bf49-dc3ea1f882c0	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	COLOR_TRAP	23	92	2026-10-22	2026-10-22 03:10:58.527
3c0891c6-2950-463a-8879-cc3c19b64856	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	COLOR_TRAP	25	100	2026-10-21	2026-10-21 07:24:58.058
4644d4a5-2e83-472a-9cde-f24c17862c34	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	TEN_SECONDS	10982.04	80.36	2026-11-01	2026-11-01 04:15:50.918
fabb544b-7a44-4154-b657-d1ad6724efa4	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	NUMBER_TOUCH	16411.81	73.71	2026-10-29	2026-10-29 07:21:37.246
204399c9-3763-4e27-944f-33ab00f0ad29	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	MEMORY	8	64	2026-10-29	2026-10-29 05:13:33.027
ca430258-3131-4f58-828b-33faa108fc1b	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	MEMORY	10	80	2026-10-29	2026-10-29 02:28:19.59
0d3be982-dbfc-46d4-82cf-f79a90de78de	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	COLOR_TRAP	22	88	2026-10-29	2026-10-29 06:01:20.578
bcdd2a10-dc29-4728-914e-5c9d78ed10e4	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	REACTION	309.24	64.61	2026-10-27	2026-10-27 07:36:32.706
bc0cc5a9-ceb4-4d0b-87e8-ecd95c0c76bd	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	MEMORY	9	72	2026-10-27	2026-10-27 02:36:42.422
14af09d6-4c73-45cf-a439-b659c64eb1dd	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	MEMORY	8	64	2026-10-27	2026-10-27 02:13:43.766
8e48d711-4a8d-4704-b0f6-ea4a2b5a6ccf	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	COLOR_TRAP	21	84	2026-10-27	2026-10-27 02:04:30.879
91b21e4e-123b-4374-a0dd-5ef75c984af9	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	NUMBER_TOUCH	16255.43	74.2	2026-10-25	2026-10-25 01:41:17.149
5fe7f2d4-df84-4081-b752-ab49adc9592c	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	NUMBER_TOUCH	16198.87	74.38	2026-10-25	2026-10-25 04:49:28.44
bbd43948-ce19-4030-8550-df9e766c64c2	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	COLOR_TRAP	19	76	2026-10-25	2026-10-25 07:10:22.504
0d5dc0f5-4360-4c87-a8a7-1c74eb603a0b	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	COLOR_TRAP	20	80	2026-10-25	2026-10-25 02:13:03.306
70732741-8550-4785-b104-22c18c04ece6	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	TEN_SECONDS	10095.58	98.09	2026-10-31	2026-10-31 02:59:10.706
9e572d99-274a-454c-9f64-7481648a85a9	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	COLOR_TRAP	22	88	2026-10-31	2026-10-31 01:43:32.253
b66db6be-1277-41b0-990a-f99f3ee1c203	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	TEN_SECONDS	9679.87	93.6	2026-10-27	2026-10-27 01:32:19.138
2de2308d-a6f9-4bf0-ba31-e578eb299dc7	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	TEN_SECONDS	10548.39	89.03	2026-10-27	2026-10-27 06:02:40.338
27878c3e-85af-4add-bbec-e1be11b23dcc	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	REACTION	318.74	62.5	2026-10-27	2026-10-27 07:40:33.915
c2c802be-012c-48b8-be32-724442e89932	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	REACTION	327.37	60.58	2026-10-27	2026-10-27 01:34:43.907
3fc73abe-db04-4d39-ba2c-d4425fa1ed36	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	NUMBER_TOUCH	15178.87	77.57	2026-10-27	2026-10-27 01:31:14.495
6c35d8e9-541b-478e-aefe-dbc5ff35b5e8	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	NUMBER_TOUCH	14475.2	79.77	2026-10-27	2026-10-27 03:08:02.576
9d9aebb0-057f-4a3a-81c4-cd753f23a633	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	MEMORY	12	96	2026-10-27	2026-10-27 06:00:34.072
e6406914-6f33-4eff-84b4-cb74a9ecacbd	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	MEMORY	10	80	2026-10-27	2026-10-27 00:19:08.399
877766bf-3e46-46dd-b964-3a67e07fd332	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	COLOR_TRAP	23	92	2026-10-25	2026-10-25 01:39:44.429
7be8c42e-5259-48f8-96e8-06f416530846	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	TEN_SECONDS	10017.04	99.66	2026-10-21	2026-10-21 05:18:51.018
c6adb3c2-d883-4050-9422-b6be90395a35	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	NUMBER_TOUCH	15426.5	76.79	2026-10-21	2026-10-21 00:27:49.524
f0957661-24bd-49f0-90f6-197704ebd024	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	MEMORY	11	88	2026-10-21	2026-10-21 08:09:05.226
0d9a131e-133c-45d8-b4f1-582033fa8f1e	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	COLOR_TRAP	24	96	2026-10-21	2026-10-21 02:45:10.986
bce057dc-271a-4a1d-883b-180f6de51765	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	COLOR_TRAP	24	96	2026-10-21	2026-10-21 02:45:39.457
0a9f1f78-d381-4644-82d3-9aa5926cec8d	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	NUMBER_TOUCH	14924.15	78.36	2026-10-20	2026-10-20 06:25:14.765
6b955cff-7347-413d-ba5a-6db10498a24d	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	REACTION	314.21	63.51	2026-11-02	2026-11-02 03:17:15.745
532810bd-6228-470a-9272-fd2502266bd4	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	NUMBER_TOUCH	14243.09	80.49	2026-11-02	2026-11-02 03:50:51.755
c285de7e-459e-491b-b2b8-b3c75d62b214	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	NUMBER_TOUCH	16636.16	73.01	2026-11-02	2026-11-02 00:30:32.723
9266fb4b-13e9-44f4-a573-c713e334babc	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	MEMORY	12	96	2026-11-02	2026-11-02 08:13:14.618
5d7cf9eb-8ad3-42d9-bcad-1e4e472a2f13	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	COLOR_TRAP	23	92	2026-11-02	2026-11-02 08:32:51.783
dbb7aa95-38c5-4494-8b98-a43b80f7b6c1	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	TEN_SECONDS	9682.06	93.64	2026-11-01	2026-11-01 04:06:40.526
f8950fe4-81ee-4585-a91a-10c639bf7403	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	TEN_SECONDS	9619.21	92.38	2026-11-01	2026-11-01 06:15:17.44
97c29456-5881-4afb-be37-eaaf567eda33	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	COLOR_TRAP	21	84	2026-11-01	2026-11-01 01:16:35.102
ebc4ce8e-2f06-4711-b3a5-177493c2a27e	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	COLOR_TRAP	21	84	2026-11-01	2026-11-01 03:45:55.031
9e243bac-1cba-4b84-85b6-c819d0a9c9b3	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	NUMBER_TOUCH	16736.58	72.7	2026-10-31	2026-10-31 00:21:42.47
5df15080-2044-418a-b28f-8a374754586f	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	NUMBER_TOUCH	15167.16	77.6	2026-10-31	2026-10-31 02:31:13.152
9f4e917d-f238-47b1-80ea-9281e2b48b94	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	TEN_SECONDS	10791.43	84.17	2026-10-22	2026-10-22 07:54:58.517
88dafbc5-7db8-4e79-948a-f20f1a8ed393	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	REACTION	264.95	74.46	2026-10-22	2026-10-22 05:59:31.509
2c7027bc-3940-43c5-a9d3-3608bfc2b339	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	REACTION	322.31	61.71	2026-10-22	2026-10-22 03:18:14.712
10c0dcb8-493f-43c5-903d-08f4d4cdc13a	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	MEMORY	11	88	2026-10-22	2026-10-22 06:06:03.549
186fdb7c-63f4-4fcb-a1f6-7d929110ad0b	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	TEN_SECONDS	9662.91	93.26	2026-10-20	2026-10-20 08:18:30.605
61ce04d5-3fe6-4989-a7d7-3122149583c6	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	TEN_SECONDS	9902.84	98.06	2026-10-20	2026-10-20 07:28:25.407
d6046fa6-130d-4873-90cf-f607f5e66471	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	COLOR_TRAP	25	100	2026-10-20	2026-10-20 08:09:19.648
8c7934d1-14a5-4100-a928-52e926e22142	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	TEN_SECONDS	10246.63	95.07	2026-11-01	2026-11-01 08:00:39.994
98e15fe4-9110-47c6-a10e-64caad8a7b4d	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	NUMBER_TOUCH	12597.56	85.63	2026-11-01	2026-11-01 00:07:48.163
bf88761c-af4b-4b81-8122-e07a1e758dfb	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	26	100	2026-11-01	2026-11-01 03:42:31.868
aaeb7975-fc24-4e15-9f6f-4488ac74f1b2	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	26	100	2026-11-01	2026-11-01 04:28:42.558
59904947-c9dc-464a-9f2c-79d80726bd04	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	REACTION	250.69	77.62	2026-10-31	2026-10-31 06:41:19.659
c970544c-3581-4ca3-abdf-699fad1f16b0	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	MEMORY	12	96	2026-10-31	2026-10-31 06:08:17.378
b616bfaf-ca40-4826-9aef-7d09fd5d9a07	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	MEMORY	12	96	2026-10-31	2026-10-31 00:05:53.169
f42fffc9-282f-44dd-84ae-6843e45c504b	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	26	100	2026-10-31	2026-10-31 06:46:07.658
3a3648f7-9c84-4e46-a30d-d3a146ab3758	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	25	100	2026-10-31	2026-10-31 01:15:33.194
d6d66c55-7f5f-4ff8-8840-152bde0f2494	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	NUMBER_TOUCH	11550.61	88.9	2026-10-27	2026-10-27 06:18:40.206
5a561f87-e65b-4b89-8b1c-c9c408829f9d	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	NUMBER_TOUCH	9840.45	94.25	2026-10-27	2026-10-27 05:54:51.785
ccbbb2fa-96f1-49e7-922b-6c2cb1391a9c	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	24	96	2026-10-27	2026-10-27 07:43:04.637
c8da3318-276e-494c-93f3-3f8de349ae9a	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	TEN_SECONDS	9942.03	98.84	2026-10-25	2026-10-25 00:12:39.162
fb0b2922-ea0c-4198-93d5-6d5995c1c6f2	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	TEN_SECONDS	10135.57	97.29	2026-10-25	2026-10-25 04:39:19.7
023aae81-b682-40c8-88bc-6d98565cc837	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	MEMORY	12	96	2026-10-25	2026-10-25 06:47:51.717
fea9106b-a160-41b6-baf3-172bdf969004	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	22	88	2026-10-25	2026-10-25 07:51:19.819
41ade4e2-44b3-4e04-8bf6-99ed12647c0e	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	REACTION	210.87	86.47	2026-10-23	2026-10-23 08:23:47.786
a9582dda-8825-4d9b-a47d-3778e581c729	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	REACTION	289.96	68.9	2026-10-23	2026-10-23 02:23:51.892
b527a770-f177-4d7e-b341-c5354b23ba1c	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	NUMBER_TOUCH	11848.48	87.97	2026-10-23	2026-10-23 06:45:23.324
b173d439-2717-48f8-a49b-35ebddc50baf	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	TEN_SECONDS	10402.71	91.95	2026-10-20	2026-10-20 06:47:10.428
e30011f0-7d9b-46d7-a228-b715c0243d81	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	TEN_SECONDS	10194.1	96.12	2026-10-20	2026-10-20 05:18:57.472
b2c6a6fe-5e05-40c7-91f1-8015297010e9	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	MEMORY	11	88	2026-10-20	2026-10-20 05:23:53.455
eefa24bb-0fd5-465e-939e-d7b1df659af4	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	25	100	2026-10-20	2026-10-20 05:41:38.221
e04056fc-3dcc-40df-950f-1cd44b779310	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	COLOR_TRAP	27	100	2026-10-20	2026-10-20 05:41:22.764
69097dce-12e4-4687-a1c9-9d7d20e57478	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	NUMBER_TOUCH	22286.19	55.36	2026-10-28	2026-10-28 01:32:00.925
4473c379-5ddc-45a4-b4b1-2ccfb4b00dd6	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	MEMORY	8	64	2026-10-28	2026-10-28 06:42:45.823
6b61c604-3605-425f-8679-7ed5bd6cc883	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	COLOR_TRAP	17	68	2026-10-28	2026-10-28 00:08:11.955
85ef3c31-9532-416c-8ad2-a8b27b06e9bf	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	TEN_SECONDS	9313.07	86.26	2026-10-27	2026-10-27 08:51:22.39
46cf8616-29ca-4df9-81bc-def5e426165e	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	REACTION	430.6	37.64	2026-10-27	2026-10-27 01:53:49.914
7b2b3522-0863-44a7-ab41-cd216f40cdf3	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	REACTION	458.63	31.42	2026-10-27	2026-10-27 08:43:01.773
e9ab9fad-4fa5-4f13-831f-7d8b793187d1	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	NUMBER_TOUCH	23891.28	50.34	2026-10-27	2026-10-27 07:39:29.297
dac4594c-510c-426f-bc9f-658c648f7f95	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	NUMBER_TOUCH	24069.58	49.78	2026-10-24	2026-10-24 01:03:06.743
6e04ef52-617d-4473-b5c0-a31d26ef2120	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	NUMBER_TOUCH	22052.09	56.09	2026-10-24	2026-10-24 01:23:45.695
7bb7be39-fb13-4c32-9b93-b5af511d3945	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	MEMORY	5	40	2026-10-24	2026-10-24 00:31:50.317
0597a8e1-1e38-46c0-b686-705578cdf5b6	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	MEMORY	8	64	2026-10-24	2026-10-24 00:08:13.149
98bcf999-5c1e-4597-95f8-e9d57be6b70b	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	TEN_SECONDS	9481.05	89.62	2026-10-23	2026-10-23 06:05:57.357
33f012aa-8924-47d9-9c4f-bf0ab7f728ae	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	TEN_SECONDS	11214.96	75.7	2026-10-23	2026-10-23 03:18:51.979
9aad97ec-cb4e-477c-9897-0d7bfdbc4acd	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	REACTION	423.46	39.23	2026-10-23	2026-10-23 01:13:58.455
eb2aa740-ae00-4863-96c7-c11f41963062	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	REACTION	391.4	46.36	2026-10-23	2026-10-23 03:38:24.462
6f5a05ca-2927-44da-b9bd-311d242d57a8	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	COLOR_TRAP	17	68	2026-10-23	2026-10-23 07:41:30.969
7c2f2096-f712-4f1a-bf5b-0d41a7d13fa1	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	TEN_SECONDS	10378.54	92.43	2026-11-01	2026-11-01 04:51:38.608
d2d2359e-3802-4ce8-9cdc-942fc23c6a4f	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	TEN_SECONDS	9853.06	97.06	2026-11-01	2026-11-01 01:49:31.817
638a759a-0bbc-40ea-bb88-87954471424d	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	REACTION	375.69	49.85	2026-11-01	2026-11-01 05:37:21.268
5e853c2b-828a-4e34-baf4-52b9689236d2	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	18077.15	68.51	2026-11-01	2026-11-01 04:05:00.304
8fec3407-0f05-482f-8248-b8e52e864ea2	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	17691.24	69.71	2026-11-01	2026-11-01 05:08:37.431
e261e000-2093-4b8c-b816-0d55d1b4fc6d	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	7	56	2026-11-01	2026-11-01 08:12:04.508
1b0d44d0-c74f-4f8c-807c-773043ace1a0	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	9	72	2026-11-01	2026-11-01 05:30:09.326
5f85f3c5-4439-4f4f-85bb-dbd66e4a9fa4	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	20	80	2026-11-01	2026-11-01 00:44:39.049
4c5db58f-efeb-4448-950e-1e78c948e6c9	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	19	76	2026-11-01	2026-11-01 05:57:02.387
14446648-c2a7-44c1-ab1c-21d9845ac285	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	TEN_SECONDS	10795.31	84.09	2026-10-30	2026-10-30 05:50:14.811
af4eea54-baab-4f6e-8930-bb74ebb6da90	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	TEN_SECONDS	10234.6	95.31	2026-10-30	2026-10-30 02:27:06.594
d8e6ba62-b7ed-410b-9d98-661bf456a0d3	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	REACTION	368.67	51.41	2026-10-30	2026-10-30 05:27:48.692
035e5744-9e08-4ba3-9a60-ca55c2a67aa4	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	REACTION	374.16	50.19	2026-10-30	2026-10-30 02:04:49.821
65f730e7-9f41-463e-8bad-3767e86869a9	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	8	64	2026-10-30	2026-10-30 01:53:36.538
bcfa3963-45ee-4c2e-974b-30f6fee22618	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	9	72	2026-10-30	2026-10-30 03:36:11.997
d804beb2-82f1-49ab-bfe6-8b7e88768a58	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	8	64	2026-10-29	2026-10-29 08:34:46.82
94e144ee-0cfe-44f5-9d00-e55aff4558a4	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	8	64	2026-10-29	2026-10-29 04:12:00.408
61e082ed-1265-475b-9414-f4e28a74570e	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	18	72	2026-10-29	2026-10-29 01:05:19.297
0fb58bc7-a05f-4665-a3db-6d8f4d696aab	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	TEN_SECONDS	11582.5	68.35	2026-10-26	2026-10-26 02:48:32.589
3905ae09-8ae4-4867-82c5-d67a6101a9d3	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	TEN_SECONDS	10310.13	93.8	2026-10-26	2026-10-26 05:54:38.294
fb23f9ac-e0f8-4b2c-b214-eed4484fcc91	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	REACTION	328.12	60.42	2026-10-26	2026-10-26 00:56:29.038
3b1f8e7d-fe4d-4464-a25a-4ba4cc42050c	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	REACTION	393.59	45.87	2026-10-26	2026-10-26 05:14:16.159
298e1bf3-3977-40bd-9433-cd14f9abd5ab	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	21782.75	56.93	2026-10-26	2026-10-26 02:36:26.512
bb4d7573-ab32-492f-a246-f3341ff6836f	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	17625.46	69.92	2026-10-26	2026-10-26 08:47:30.908
14e8cfca-4849-4662-91ae-1b1866969c87	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	7	56	2026-10-26	2026-10-26 02:33:18.298
7585c237-4f95-4cbd-acaa-74391d666340	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	19	76	2026-10-26	2026-10-26 01:09:39.979
ff27e55e-9c5f-4515-84a3-6ba21facb5cd	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	17	68	2026-10-26	2026-10-26 04:32:19.939
6b0845b3-a3df-47bc-ae88-a04abcb07ba0	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	8	64	2026-10-24	2026-10-24 02:41:42.289
0ac2d17c-d200-4a8e-9edf-164fdd92ce63	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	17	68	2026-10-24	2026-10-24 07:49:17.729
4d15b06f-4df2-4eb4-b32a-f4cfe7685336	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	20012.14	62.46	2026-10-22	2026-10-22 06:42:36.971
0023fb38-90ab-4369-a5c8-75b4e3df3664	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	9	72	2026-10-22	2026-10-22 07:50:16.527
f9864544-a5a1-4ddb-a6a3-d8991c66bc65	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	MEMORY	9	72	2026-10-22	2026-10-22 03:04:42.322
6d47709d-225d-4ddf-a5f4-bec3c07bc0d7	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	REACTION	410.26	42.16	2026-10-21	2026-10-21 00:54:20.672
6facceeb-68fc-4743-af92-ebb3db2b7a65	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	20304.44	61.55	2026-10-21	2026-10-21 02:02:50.012
cdc452e0-72a2-42f9-8a23-00466df287d7	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	NUMBER_TOUCH	18143.48	68.3	2026-10-21	2026-10-21 06:33:04.015
3bfddd45-136d-41e4-b413-52265d7c5192	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	18	72	2026-10-21	2026-10-21 01:00:38.533
c198a4ba-7197-4d73-a55f-c88b633d70ed	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	COLOR_TRAP	17	68	2026-10-21	2026-10-21 07:00:37.517
fba7eea6-f411-4c9a-b7ba-ffdd67fce01c	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	11067.17	78.66	2026-11-01	2026-11-01 04:12:51.696
233a1203-4504-4433-aef2-afbffeeb6de0	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	8661.06	73.22	2026-11-01	2026-11-01 00:30:35.473
0cd90d30-ad60-46bf-baa8-c60d5042a9d8	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	323.81	61.38	2026-11-01	2026-11-01 04:27:13.376
29c3da52-1894-40cd-a18c-9a0e8fa36f5d	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	394.98	45.56	2026-11-01	2026-11-01 06:31:36.215
0ab10403-24a2-430e-b219-1b596da37b27	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	18103.21	68.43	2026-11-01	2026-11-01 04:22:33.954
211a47d8-a9d5-46cf-b67f-0ec915a2206c	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	18114.77	68.39	2026-11-01	2026-11-01 08:32:25.106
1ed2f6b5-6dba-4f57-919f-47dec17031ea	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	9	72	2026-11-01	2026-11-01 03:20:19.87
eb269229-379e-4561-83b4-1449348e565a	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	17	68	2026-11-01	2026-11-01 08:07:05.74
87a83e1f-a99c-44d6-97a6-7a078d2d1234	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	11490.59	70.19	2026-10-31	2026-10-31 03:19:45.125
c54cf1da-0bb9-44d3-8f28-2092c3832c1e	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	385.83	47.59	2026-10-31	2026-10-31 01:27:12.449
3029c704-705c-4bec-a39a-bc0200fa5c68	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	323.45	61.46	2026-10-31	2026-10-31 00:34:18.406
8c87c22b-242d-421d-b86a-b4591fa75dcc	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	19341.04	64.56	2026-10-31	2026-10-31 04:02:48.027
9e1d4439-adeb-49ec-b9bb-9680b9bdb084	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	7	56	2026-10-31	2026-10-31 03:50:11.588
5d5cdced-5799-4b4b-9e02-166336b62733	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	7	56	2026-10-31	2026-10-31 00:40:58.6
6d3b30d3-73b6-4970-9915-4cc3b9870aa0	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	17	68	2026-10-31	2026-10-31 03:23:32.931
dbe8892d-2578-4b09-9727-30ba3314561e	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	18	72	2026-10-31	2026-10-31 04:47:51.822
d7a6823b-6af9-4e44-9746-bb189ccb6c12	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	10921.18	81.58	2026-10-30	2026-10-30 04:44:53.457
2b9e4e41-1e04-44fe-8116-d5dc33f90765	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	9520.23	90.4	2026-10-30	2026-10-30 07:16:16.511
f2a128ab-1ba4-4fce-aeec-276ff3a238cb	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	349.13	55.75	2026-10-30	2026-10-30 07:09:02.146
953f9485-7653-4c5b-ae6b-0c8d2ea5dfcf	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	349.96	55.56	2026-10-30	2026-10-30 02:35:48.084
4cbbb2a9-0639-40a2-b8bb-9a956558d26b	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	7	56	2026-10-30	2026-10-30 03:43:51.337
e1b9a184-f8de-4798-a780-18240e23acf2	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	7	56	2026-10-30	2026-10-30 06:56:31.219
20f7fa4d-0258-4060-a383-0becb4e1fe6d	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	17	68	2026-10-30	2026-10-30 06:45:42.819
37631ca2-a20a-4539-acf2-867208354b1c	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	16	64	2026-10-30	2026-10-30 03:03:03.027
c26a765d-f990-407a-a0b0-7778e28f3f28	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	374.34	50.15	2026-10-28	2026-10-28 01:40:05.842
b1525238-7284-41bd-b215-fdfa3cae907b	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	20	80	2026-10-28	2026-10-28 02:36:17.192
90585c7b-6158-433b-9722-f220ee34622c	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	COLOR_TRAP	17	68	2026-10-28	2026-10-28 06:50:47.937
8690a7b4-8129-4a46-9c6f-59f081039a04	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	19812.71	63.09	2026-10-27	2026-10-27 06:04:38.497
f10ee849-6303-4e46-9059-8e5cf9b031d3	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	8	64	2026-10-27	2026-10-27 07:02:50.226
6e72dbee-2f10-4585-9047-d81ea8be17de	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	10426.06	91.48	2026-10-24	2026-10-24 07:10:40.584
875f98a3-f36a-4543-8d88-84da01d72649	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	10575.21	88.5	2026-10-24	2026-10-24 05:51:35.346
468eaa89-b3ce-4ccf-a885-a44683d1bf29	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	18126.42	68.35	2026-10-24	2026-10-24 04:06:22.182
818ff625-9370-438a-9bde-fa2917085b0a	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	20719.09	60.25	2026-10-24	2026-10-24 00:42:20.817
48de1409-121f-436e-9785-e76e72396cb7	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	TEN_SECONDS	9902.14	98.04	2026-10-22	2026-10-22 04:51:57.445
fe4e3841-8953-4fe4-992c-2f697611b6f7	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	365.64	52.08	2026-10-22	2026-10-22 06:37:02.857
8a4bf86a-7394-49fb-8787-8532583e8e2e	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	REACTION	346.55	56.32	2026-10-22	2026-10-22 06:48:46.407
0d0e503a-43fa-4cf8-8e8d-f303bc10f035	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	16739.4	72.69	2026-10-22	2026-10-22 08:22:43.687
482c0d1e-bff3-4d33-ad22-e96c8f86f5c4	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	NUMBER_TOUCH	21165.03	58.86	2026-10-22	2026-10-22 06:45:15.555
0fac1355-13e1-412c-98aa-9cb9a7fe6783	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	MEMORY	8	64	2026-10-22	2026-10-22 02:00:40.467
53f30578-7b8a-4308-ad83-2f05f415ed7e	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	12213.1	55.74	2026-11-02	2026-11-02 04:40:14.823
2b391557-c7ae-40e7-a10c-928ef5e66873	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	12603.74	47.93	2026-11-02	2026-11-02 02:12:00.661
b7c43525-5b13-407d-9805-cd4f31e37fe1	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	REACTION	513.58	19.2	2026-11-02	2026-11-02 00:06:37.163
cec73f56-2f4e-4778-a606-ea7afc721f4e	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	REACTION	510.61	19.86	2026-11-02	2026-11-02 02:38:57.794
9e6520a2-7420-4da9-b027-96ec9032f57e	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	NUMBER_TOUCH	25601.32	45	2026-11-02	2026-11-02 03:54:14.369
fea36fb5-f87b-4cc8-8f36-3ac57c0c7083	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	NUMBER_TOUCH	24226.45	49.29	2026-11-02	2026-11-02 08:37:58.205
11a648ca-7067-486f-b09e-7e1861524594	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	9426.95	88.54	2026-10-30	2026-10-30 03:53:48.286
a3cb0145-4327-4ab1-b958-2f69909955f4	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	REACTION	480.81	26.49	2026-10-30	2026-10-30 08:31:40.896
aeb7dcbb-340a-4f3f-94a5-a887bfd3c01d	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	NUMBER_TOUCH	28572.53	35.71	2026-10-30	2026-10-30 05:00:50.73
7b1a6d6a-1cc2-4bd6-b5d5-9b0f1fee0be1	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	9291.24	85.82	2026-10-29	2026-10-29 00:15:48.535
72dc363d-847b-45ad-91e5-45ee4a636a23	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	9537.26	90.75	2026-10-29	2026-10-29 04:23:24.844
70a43720-fdc5-4da5-bebd-9a5e918edf78	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	NUMBER_TOUCH	28186.47	36.92	2026-10-29	2026-10-29 03:34:02.318
d8350689-edfd-4743-ba03-ba3b785006ce	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	NUMBER_TOUCH	28604.38	35.61	2026-10-29	2026-10-29 07:50:25.046
2cf0f4e3-6f0a-4e37-9137-98a7e55afa0d	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	MEMORY	5	40	2026-10-29	2026-10-29 08:39:05.735
2fec3bb9-72d9-41d3-ad03-84f041448799	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	11649.7	67.01	2026-10-26	2026-10-26 04:30:21.8
95513e30-6fa8-4975-b6c5-6d3cd4e31e45	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	NUMBER_TOUCH	28009.73	37.47	2026-10-26	2026-10-26 08:17:12.752
50a18980-d335-495e-bde3-41c38ef3287c	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	REACTION	514.25	19.06	2026-10-25	2026-10-25 00:02:49.792
83804ccc-ca5f-4395-8330-df3d6a1084e7	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	COLOR_TRAP	13	52	2026-10-25	2026-10-25 03:33:38.656
77984966-d908-4c7d-91e8-7c2ad860f560	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	TEN_SECONDS	10000.22	100	2026-10-21	2026-10-21 01:18:22.13
e8a8461c-4c67-4b2d-b2d2-1d1135542826	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	REACTION	472.71	28.29	2026-10-21	2026-10-21 01:52:24.379
cdb0237d-e65a-4d5e-b298-3a63fb5085ac	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	MEMORY	5	40	2026-10-21	2026-10-21 07:13:52.086
c26299dc-b65c-4379-aba1-80a111de34d9	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	MEMORY	5	40	2026-10-21	2026-10-21 06:49:39.97
ae8d6d38-4676-49f7-9473-f3ec14455119	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	COLOR_TRAP	12	48	2026-10-21	2026-10-21 06:27:25.721
ce272320-90fa-43dc-b47d-d2ff757468f2	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	COLOR_TRAP	14	56	2026-10-21	2026-10-21 05:12:37.227
6c7e80ab-9100-4c7b-af32-d1d05b511e33	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	TEN_SECONDS	11225.57	75.49	2026-10-31	2026-10-31 03:51:07.806
2ad0f3c9-f7b8-49f3-8d57-9eaa4174e275	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	REACTION	334.11	59.09	2026-10-31	2026-10-31 05:43:23.721
70e5cc3b-8f26-4b71-91c6-51dacf61a0dd	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	REACTION	275.62	72.08	2026-10-31	2026-10-31 04:56:23.832
2286a946-c957-4675-bbfe-8dccb9f9aed1	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	COLOR_TRAP	19	76	2026-10-31	2026-10-31 06:00:39.257
2b34ac27-16c5-4cfe-930a-0df502d5bc17	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	COLOR_TRAP	18	72	2026-10-31	2026-10-31 00:08:08.586
e36ba48e-1751-4038-ba96-ea80f47de57a	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	COLOR_TRAP	20	80	2026-10-30	2026-10-30 06:34:05.755
93ab955a-d2d7-4fbb-a0b7-0594acb64e74	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	COLOR_TRAP	22	88	2026-10-30	2026-10-30 07:08:24.196
fc0a19ad-1fb6-4d11-9dfc-851b390a0f48	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	16885.64	72.23	2026-10-28	2026-10-28 00:38:38.109
871f4a4f-ca0d-422d-abcc-5bafbde1ab61	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	16906.66	72.17	2026-10-28	2026-10-28 03:01:29.071
5d4a8647-7c7a-4785-b4a3-d58b2335234c	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	MEMORY	10	80	2026-10-28	2026-10-28 03:09:18.356
37740c97-f1c7-4b9b-90e0-de1283df512e	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	18190.99	68.15	2026-10-27	2026-10-27 07:33:50.644
71059c28-993f-45cf-b61d-2cf1a4b500af	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	19375.53	64.45	2026-10-27	2026-10-27 05:10:06.879
e1300114-88b0-48f2-9956-029c6c7e0f29	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	COLOR_TRAP	21	84	2026-10-27	2026-10-27 00:55:42.429
60a7a1d7-495b-4f88-abb0-fde1e890061f	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	COLOR_TRAP	21	84	2026-10-27	2026-10-27 03:40:27.529
17374a96-7708-453f-ac7e-d46654f092ec	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	15518.57	76.5	2026-10-26	2026-10-26 05:15:11.312
bd3569aa-705c-4aaa-bf9a-7d8592153d22	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	18620.41	66.81	2026-10-26	2026-10-26 06:50:47.934
6f185fe7-7d3d-41b7-bc7d-e10ce6d5c581	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	MEMORY	9	72	2026-10-26	2026-10-26 04:25:04.376
71cd130c-3747-4db2-8940-1c8502b42089	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	18041.02	68.62	2026-10-25	2026-10-25 02:09:30.248
18d17d83-96b2-49aa-841b-65ccdf70f7b4	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	NUMBER_TOUCH	16601.11	73.12	2026-10-25	2026-10-25 00:40:48.292
7dc450eb-c4b6-49ed-a4b2-dee968d031f3	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	REACTION	421.07	39.76	2026-10-28	2026-10-28 07:16:12.682
a3515a6f-f784-4a34-8f8d-aa1fbcda5fe3	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	NUMBER_TOUCH	25203.32	46.24	2026-10-28	2026-10-28 07:47:12.822
51e9f252-c34a-4cdc-9783-0bcbc3a34961	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	MEMORY	6	48	2026-10-28	2026-10-28 06:31:23.697
deb26e6b-360a-4e58-b022-39fcb39272db	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	MEMORY	5	40	2026-10-28	2026-10-28 03:53:07.353
e9db90d4-4f2e-4919-8e41-a6077083c93e	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	TEN_SECONDS	9162.36	83.25	2026-10-22	2026-10-22 00:00:01.71
e28b338a-3900-4b49-a271-22c69b17e0ea	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	COLOR_TRAP	12	48	2026-10-22	2026-10-22 01:40:21.589
de21a6e5-301e-4869-9acd-1c7f9f2cb2c7	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	MEMORY	4	32	2026-10-20	2026-10-20 04:10:06.913
2810625a-e679-4b2a-9d4b-cd01bad4dbcc	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	MEMORY	3	24	2026-10-20	2026-10-20 00:02:38.868
7c3dcc3e-ff83-4601-ac3a-3974315c79f0	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	REACTION	338.62	58.08	2026-10-29	2026-10-29 01:03:40.84
7a33460b-a63c-43d6-aee3-ef554cb0bf4a	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	NUMBER_TOUCH	17932.34	68.96	2026-10-29	2026-10-29 05:26:17.927
f68942db-f03c-4421-a0f6-2e862b13a9b8	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	NUMBER_TOUCH	15272.99	77.27	2026-10-29	2026-10-29 02:04:08.841
b06c0a46-0776-4d51-bbe2-b17df06524c4	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	TEN_SECONDS	10282.56	94.35	2026-10-27	2026-10-27 04:49:52.365
fb74f307-c7cc-461e-b85a-a5c09b0cd932	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	REACTION	332.58	59.43	2026-10-27	2026-10-27 08:26:50.293
352fd5d8-0e08-4660-9d07-4ffa43a2dddd	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	REACTION	314.97	63.34	2026-10-27	2026-10-27 07:49:16.556
fdfa1ba1-55a8-4826-b7fe-631403d17bf9	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	COLOR_TRAP	21	84	2026-10-27	2026-10-27 01:17:55.92
759fd2cc-c491-4cde-8092-9d3deb407919	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	COLOR_TRAP	21	84	2026-10-27	2026-10-27 06:35:22.418
cbf62dd3-f41c-46cb-8ad1-a5ff1163333c	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	TEN_SECONDS	10400.54	91.99	2026-10-20	2026-10-20 00:26:50.253
cb1ceab6-7a68-4922-ab1c-282874acb5c9	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	NUMBER_TOUCH	15571.34	76.34	2026-10-20	2026-10-20 06:10:29.685
729f7f8d-c8f1-48d8-bbda-6196a54c8ab1	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	MEMORY	9	72	2026-10-20	2026-10-20 02:18:31.131
a8637757-f624-4636-87d7-b0c61da04f78	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	MEMORY	11	88	2026-10-20	2026-10-20 05:03:55.703
7c0c4920-1062-4475-be23-dab7ac89dd39	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	COLOR_TRAP	22	88	2026-10-20	2026-10-20 00:01:48.231
ba661653-bfa0-42e7-9d85-290adf6f697b	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	MEMORY	9	72	2026-10-30	2026-10-30 05:04:07.301
79231d44-d3f3-46b2-8dcd-623bf4d3d17c	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	MEMORY	9	72	2026-10-30	2026-10-30 08:49:42.402
d449b5e4-699e-4644-a62b-3bd656f6e4d2	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	COLOR_TRAP	20	80	2026-10-28	2026-10-28 03:37:31.5
b2e10cae-e59b-4baa-af31-23da09d5b8e2	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	NUMBER_TOUCH	20386.69	61.29	2026-10-25	2026-10-25 03:29:43.59
fbc90a1c-f8d2-40f3-8c30-0fd38c2a6647	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	NUMBER_TOUCH	17665.28	69.8	2026-10-25	2026-10-25 07:04:46.541
2c7bf125-37ae-46a0-aca9-f92b4a9309aa	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	COLOR_TRAP	20	80	2026-10-25	2026-10-25 03:41:22.633
79f16f25-9baa-4bfb-9f01-860790ee3e91	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	REACTION	335.31	58.82	2026-10-23	2026-10-23 02:14:06.486
46a786df-41e0-4346-b5e1-bf9cebca9773	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	NUMBER_TOUCH	18984.42	65.67	2026-10-23	2026-10-23 08:08:00.867
e0adf51c-9e43-488d-b494-465c4e51ebd4	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	NUMBER_TOUCH	18309.7	67.78	2026-10-23	2026-10-23 01:31:55.644
c0497d5e-7d8e-4595-94b9-5db5fdbee8ca	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	MEMORY	8	64	2026-10-23	2026-10-23 01:34:26.826
630939b3-2f4a-4a94-94c6-c95c46201b12	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	MEMORY	7	56	2026-10-23	2026-10-23 03:31:51.869
36bccf0e-0cad-4166-982b-c6ce4d9f25c6	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	REACTION	323.11	61.53	2026-11-01	2026-11-01 02:16:12.701
92bab354-6255-48a5-848f-570438944ead	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	MEMORY	9	72	2026-11-01	2026-11-01 01:41:39.012
b2c52ca7-c1c4-4e1e-8983-700053d0a181	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	COLOR_TRAP	21	84	2026-11-01	2026-11-01 05:15:08.179
12b24832-0581-4e8a-aebc-d8bf16f87a76	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	COLOR_TRAP	19	76	2026-11-01	2026-11-01 07:30:59.7
c1eec901-dc38-480c-9567-4fb4f29d8794	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	NUMBER_TOUCH	15780.37	75.69	2026-10-30	2026-10-30 00:53:40.439
7de5af4a-1cd8-444a-ab9c-8467b684a22e	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	NUMBER_TOUCH	18251.2	67.97	2026-10-30	2026-10-30 02:41:56.481
03e30955-95e6-412c-b66c-293dc7667bc9	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	COLOR_TRAP	20	80	2026-10-30	2026-10-30 01:36:46.749
8e2b5961-7e53-4e82-b231-c42250c0505d	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	COLOR_TRAP	21	84	2026-10-30	2026-10-30 01:48:43.975
76124cfb-e732-4828-8045-39e178a72d1f	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	TEN_SECONDS	9844.02	96.88	2026-10-26	2026-10-26 02:53:37.159
5d02077d-5a4f-4110-9fb9-1e54e6ed8dad	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	TEN_SECONDS	8946.47	78.93	2026-10-26	2026-10-26 06:13:32.978
8af5c824-864f-40e5-a647-b5ef749c27a3	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	NUMBER_TOUCH	16900	72.19	2026-10-26	2026-10-26 07:56:01.494
dc8c3c97-b5e3-442b-bd46-d4cea13c3ecb	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	NUMBER_TOUCH	14895.45	78.45	2026-10-26	2026-10-26 03:52:30.707
e93e3135-3437-4e0d-aa61-e8dfea20c044	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	TEN_SECONDS	11018.04	79.64	2026-10-21	2026-10-21 06:20:18.317
3b7271d1-2176-4bdb-80aa-0eb2f97f03da	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	REACTION	322.32	61.71	2026-10-21	2026-10-21 02:06:52.309
465e53d5-d1a7-41cd-8a2b-85c0c548af26	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	REACTION	336.51	58.55	2026-10-21	2026-10-21 08:16:53.517
58c4d9c2-ed22-40da-86c6-698537f20061	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	NUMBER_TOUCH	15616.24	76.2	2026-10-21	2026-10-21 05:27:07.132
b422a455-328f-4e91-aef3-cbfc72e28c97	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	MEMORY	8	64	2026-10-21	2026-10-21 07:16:24.188
16be6da5-af47-4695-9b66-17852de499f9	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	MEMORY	8	64	2026-10-21	2026-10-21 03:28:52.818
6bd935d6-00ca-4a51-8aa4-28f250a40944	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	TEN_SECONDS	9786.09	95.72	2026-10-30	2026-10-30 00:43:16.912
fabc5b08-d53f-4f3a-958d-8d6ee54a8643	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	REACTION	228.85	82.48	2026-10-30	2026-10-30 07:40:49.871
6be0c49e-bd2c-4013-adad-739ac1cdf400	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	13	100	2026-10-30	2026-10-30 00:01:11.803
0f434bcd-a164-49ca-8b59-88777bfefc9c	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	11	88	2026-10-30	2026-10-30 03:13:20.11
4827ce74-bc69-428b-b29b-a36caa50268a	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	COLOR_TRAP	22	88	2026-10-30	2026-10-30 00:03:04.507
ebed6442-8904-4ab2-8a96-4dc203b11495	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	COLOR_TRAP	22	88	2026-10-30	2026-10-30 03:45:29.241
43cbe056-01a2-48d5-b5fc-822648cbfa73	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	TEN_SECONDS	9678.11	93.56	2026-10-29	2026-10-29 01:48:22.353
4dbefa78-efa4-4fda-8f3d-f3fa0e70cbf4	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	10429.73	92.41	2026-10-29	2026-10-29 01:17:10.455
de4fbf41-9eb6-425c-aa33-c4e64f063b80	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	11	88	2026-10-29	2026-10-29 00:40:51.2
00cff575-e23f-44f8-8374-27c896954348	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	COLOR_TRAP	23	92	2026-10-29	2026-10-29 07:54:14.733
8fda9081-1d2f-4713-984f-c71a295d5f08	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	TEN_SECONDS	10082.85	98.34	2026-10-28	2026-10-28 06:57:25.203
9c994305-8738-4ff5-86e5-fdd810900ae9	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	10389.53	92.53	2026-10-28	2026-10-28 02:59:37.647
d2c9d608-5a47-44b6-af5e-53c09da36efe	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	10	80	2026-10-28	2026-10-28 06:56:08.934
3fa1344b-808d-41bb-85a2-18698d58c543	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	12	96	2026-10-28	2026-10-28 07:59:17.005
8cdd23fb-e899-442b-b9ba-900381c93031	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	COLOR_TRAP	26	100	2026-10-28	2026-10-28 00:12:50.19
258c76b6-e14c-47f7-87b3-535decef7d51	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	COLOR_TRAP	23	92	2026-10-28	2026-10-28 07:08:09.831
bdad166c-3d77-4e15-bcd0-8298dbd385a5	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	REACTION	253.75	76.94	2026-10-27	2026-10-27 02:15:27.306
56e85a33-8c58-4a95-a21b-d28ddad45361	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	10600.06	91.87	2026-10-27	2026-10-27 07:11:18.494
2a21dcc4-0c5e-49fe-861c-d17d8b49cf9c	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	14090.19	80.97	2026-10-27	2026-10-27 01:10:44.238
83b571d4-261c-4594-9c56-96951e786ec4	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	12613.1	85.58	2026-10-23	2026-10-23 08:17:26.758
d2f304c5-3edf-4fd0-9ce3-4064cc4539b7	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	12894.21	84.71	2026-10-23	2026-10-23 07:52:03.032
dd9f7c58-bf89-43b5-8036-51f094f059eb	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	REACTION	298.09	67.09	2026-10-22	2026-10-22 03:48:24.331
2a4fb36c-f67e-423d-bfae-64d32368db0c	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	REACTION	266.29	74.16	2026-10-22	2026-10-22 04:44:26.504
bf426f12-2e26-4c04-a823-0f35491a0ff6	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	NUMBER_TOUCH	13348.25	83.29	2026-10-22	2026-10-22 08:45:49.133
548a4ccc-cfec-4572-a0d9-18ef225a18bf	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	13	100	2026-10-22	2026-10-22 05:27:09.923
65645ab5-7463-47f5-9781-29a447dcb4e4	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	MEMORY	13	100	2026-10-22	2026-10-22 08:16:19.955
088cf7ee-741e-454c-8926-69b1f9d3e6bc	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	TEN_SECONDS	9941.84	98.84	2026-10-27	2026-10-27 02:24:31.735
4db7cb4d-51b5-444d-837c-aaf0ed428dc7	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	MEMORY	7	56	2026-10-27	2026-10-27 04:32:06.612
49e303bf-0741-48ab-93ad-48981a31a1fc	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	REACTION	327.1	60.64	2026-10-24	2026-10-24 00:38:00.113
d54cadde-592c-4549-aab5-7acd2775fe90	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	REACTION	336.93	58.46	2026-10-24	2026-10-24 00:55:22.53
0d6837f2-fb58-45ca-a699-31ad416d0109	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	NUMBER_TOUCH	21083.38	59.11	2026-10-24	2026-10-24 02:01:55.527
2e923b4f-8b26-42f3-8684-7369e82086bb	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	NUMBER_TOUCH	20430.01	61.16	2026-10-24	2026-10-24 03:05:54.64
911c06ef-354d-4b8b-a3e5-312a4eeeadaa	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	TEN_SECONDS	9474.21	89.48	2026-10-22	2026-10-22 02:37:12.187
e8111474-2d12-4ff7-beaa-91caa5573858	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	TEN_SECONDS	9587.55	91.75	2026-10-22	2026-10-22 07:05:23.389
93e8f355-9140-45d3-8a0c-e59639b02e97	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	REACTION	368.7	51.4	2026-10-22	2026-10-22 01:29:17.527
d5696e11-d163-44df-b416-60b3c40ddc4d	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	NUMBER_TOUCH	18470.42	67.28	2026-10-22	2026-10-22 04:03:11.667
3e2665f6-94c7-43b5-98f7-2fa7483b96f3	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	NUMBER_TOUCH	18228.13	68.04	2026-10-22	2026-10-22 03:26:41.307
fdadc838-e23e-44c2-8fed-9289bfe9d8af	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	MEMORY	8	64	2026-10-22	2026-10-22 06:20:06.226
5c5fe4e4-e73a-4a68-b0f8-ab47f299387c	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	MEMORY	8	64	2026-10-22	2026-10-22 08:14:34.033
9316088c-e7c1-4aee-9511-95e59d6d12df	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	COLOR_TRAP	19	76	2026-10-22	2026-10-22 06:17:18.196
194aeea6-310e-43d4-b1ca-2e99eb935545	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	COLOR_TRAP	19	76	2026-10-22	2026-10-22 02:21:49.513
d711dc21-92f3-4599-9616-39094e7e64c2	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	TEN_SECONDS	8465.08	69.3	2026-11-01	2026-11-01 07:48:58.969
3fcea965-600a-4dd7-8981-3e4cb6e1a41b	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	TEN_SECONDS	8377.78	67.56	2026-11-01	2026-11-01 03:35:47.053
19bcda4f-88bf-4f22-9c58-8e126355cbee	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	REACTION	480.54	26.55	2026-11-01	2026-11-01 03:50:12.5
bdf6c1e0-2eca-446b-8cb3-b15c2680937f	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	COLOR_TRAP	14	56	2026-11-01	2026-11-01 00:02:56.317
73501a0c-9e6c-4c64-b536-046cb5ee30b3	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	COLOR_TRAP	15	60	2026-11-01	2026-11-01 01:33:23.959
d52bc65c-7005-4fbc-aba4-f7b7577faf03	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	TEN_SECONDS	12112.78	57.74	2026-10-24	2026-10-24 00:40:27.799
60252310-20a3-4015-8ec4-5cf70e49d1b5	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	REACTION	403.6	43.64	2026-10-24	2026-10-24 04:24:08.171
235b064b-e6bb-4fbb-a88f-de7118970af3	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	REACTION	455.33	32.15	2026-10-24	2026-10-24 06:02:54.703
55b2aaff-0099-40ab-918d-a7b8741c41d2	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	NUMBER_TOUCH	22592.36	54.4	2026-10-24	2026-10-24 07:01:27.829
6582f2c1-9aff-4f64-ac49-90fbd704bc0a	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	NUMBER_TOUCH	24299.25	49.06	2026-10-24	2026-10-24 02:28:59.144
0c02ec70-bfe1-4eca-a5be-719e529fbcd2	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	MEMORY	4	32	2026-10-24	2026-10-24 07:16:16.968
60ae6b5c-541d-4a2d-9bcc-300864ca3e40	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	MEMORY	4	32	2026-10-24	2026-10-24 06:23:28.713
f46f774f-3e64-4536-9447-2930939016a8	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	COLOR_TRAP	13	52	2026-10-24	2026-10-24 07:33:00.796
178c9c4d-476d-4e1d-994c-93f16e8b9ac6	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	TEN_SECONDS	7648.26	52.97	2026-10-21	2026-10-21 07:49:49.279
ae97634d-7665-41c8-beea-d19f4dc561c2	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	REACTION	489.82	24.48	2026-10-21	2026-10-21 08:54:00.755
95599b41-6c3c-4f8e-a063-396a62c24aab	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	REACTION	431.07	37.54	2026-10-21	2026-10-21 06:41:49.393
c18b28da-c12a-4421-bf5c-669e86995224	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	COLOR_TRAP	14	56	2026-10-21	2026-10-21 06:24:23.871
0a54e89e-bba9-4d53-bc33-82f55eb091eb	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	REACTION	208.3	87.04	2026-10-28	2026-10-28 04:26:28.373
7a04b94c-2d74-4f90-abfa-82684b36620c	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	MEMORY	11	88	2026-10-28	2026-10-28 03:04:46.217
77a1931e-bcea-425f-8096-fcccd2253681	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	COLOR_TRAP	22	88	2026-10-28	2026-10-28 05:35:09.768
a79b4cd8-c68a-4ca5-b37d-e54c96f31a00	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	TEN_SECONDS	9649.48	92.99	2026-10-27	2026-10-27 00:43:16.558
31ad50e3-95c5-45fa-8c0e-3108d9ed5ea6	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	REACTION	240.41	79.91	2026-10-27	2026-10-27 05:13:13.327
7cd0c046-10f5-4f6c-b4db-6d6bce5aad8a	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	REACTION	231.28	81.94	2026-10-27	2026-10-27 06:05:48.039
4abe61c5-16bc-4868-8b42-9212fdfd7fe3	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	NUMBER_TOUCH	13872.51	81.65	2026-10-27	2026-10-27 06:13:24.232
1fe514e6-fb2b-459c-a74a-e46386ad04ca	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	MEMORY	11	88	2026-10-27	2026-10-27 04:24:52.852
39a1d3f7-dc49-4471-a941-aef3f3a72f38	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	TEN_SECONDS	9656.25	93.13	2026-10-24	2026-10-24 01:16:36.451
55e67332-0bab-4136-9d8c-050e35eb1e67	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	REACTION	235.24	81.06	2026-10-24	2026-10-24 00:48:27.855
d70a2573-727a-42b1-bd37-0ac36a94cc7a	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	NUMBER_TOUCH	11263.62	89.8	2026-10-24	2026-10-24 00:29:20.698
786cc8ba-fcf4-4e7e-9be2-4fb79c271dee	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	NUMBER_TOUCH	14339.62	80.19	2026-10-24	2026-10-24 03:25:33.408
69868fb2-026b-4da6-9b35-a501099f7f72	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	MEMORY	12	96	2026-10-24	2026-10-24 00:56:01.834
09648a34-829e-4ca2-8da8-313ea338871f	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	MEMORY	13	100	2026-10-24	2026-10-24 00:12:36.542
b0ca8f7d-f9d0-4f62-b542-5d1b148ff713	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	REACTION	266.83	74.04	2026-11-01	2026-11-01 00:37:59.233
b2b15435-c155-441e-a053-7e61a9fcc682	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	REACTION	289.93	68.9	2026-11-01	2026-11-01 06:42:22.079
414b35a6-07e6-4565-8afa-ce064da71e4e	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	NUMBER_TOUCH	17397.8	70.63	2026-11-01	2026-11-01 05:10:12.172
df84e4a9-08ed-49a1-bb11-dbcdb155f66b	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	MEMORY	11	88	2026-11-01	2026-11-01 06:17:08.758
8424aa80-633c-4103-99cc-cd0f627e7de4	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	COLOR_TRAP	20	80	2026-11-01	2026-11-01 08:26:58.41
80da196e-b5ab-42e9-84a4-57bb3495ac62	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	REACTION	291.85	68.48	2026-10-29	2026-10-29 05:05:49.864
96265ce7-0dd9-48c2-9abf-735d3bc38e6f	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	REACTION	257.73	76.06	2026-10-29	2026-10-29 06:56:57.484
0b43444f-fdab-4975-a1c6-9ba480e979ed	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	NUMBER_TOUCH	15760.56	75.75	2026-10-29	2026-10-29 03:08:00.553
909db50e-6340-4f61-bef9-6783c80b2348	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	TEN_SECONDS	10254.18	94.92	2026-10-28	2026-10-28 08:08:34.688
7ade7abd-98fd-499f-975a-2f1b8794b241	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	TEN_SECONDS	10193.69	96.13	2026-10-28	2026-10-28 00:56:06.907
44f36845-7939-44e1-ab72-393efd4493e4	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	NUMBER_TOUCH	16433.02	73.65	2026-10-28	2026-10-28 03:46:31.67
6c8f6930-8212-4e5d-89e0-96a8474d83c3	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	NUMBER_TOUCH	15662.8	76.05	2026-10-28	2026-10-28 06:10:08.384
f283d66e-9307-4218-a720-a7d325f977c1	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	COLOR_TRAP	19	76	2026-10-28	2026-10-28 02:20:40.875
a2c254e9-ea5e-4835-a3ee-a824a2281fe0	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	TEN_SECONDS	9204.87	84.1	2026-10-21	2026-10-21 02:50:55.738
56791cd0-5768-4b7c-939a-77683426190c	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	REACTION	346.28	56.38	2026-10-21	2026-10-21 05:30:41.985
4d7a5966-c96b-469f-9437-28141efafd59	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	COLOR_TRAP	23	92	2026-10-21	2026-10-21 03:23:04.799
ec6dca6a-ac2e-4481-9edb-717f1a85fb26	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	COLOR_TRAP	20	80	2026-10-21	2026-10-21 06:04:50.486
46c5cc7c-db59-43b1-80b3-3909991d8afb	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	NUMBER_TOUCH	17329.42	70.85	2026-10-20	2026-10-20 05:25:01.08
10d3471b-8d0d-4c35-9db7-90f2b52e950c	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	MEMORY	12	96	2026-10-20	2026-10-20 02:00:00.269
6e4c760f-77c0-49f8-8c16-ee098c2efe84	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	COLOR_TRAP	20	80	2026-10-20	2026-10-20 04:02:33.316
0f5420eb-982c-4348-90e4-28a06e5f9bf9	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	COLOR_TRAP	17	68	2026-11-02	2026-11-02 08:40:39.559
33b84afb-eced-472f-abdb-d7bc7d288945	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	MEMORY	7	56	2026-10-31	2026-10-31 08:47:25.397
be8d5699-a5e4-4a58-a61e-207114d351b3	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	MEMORY	6	48	2026-10-31	2026-10-31 06:14:04.849
29150596-4e1d-427c-b134-657624154da3	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	COLOR_TRAP	15	60	2026-10-31	2026-10-31 01:44:15.955
c9fb1bcb-f352-4550-b8ef-4f31f78452d0	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	COLOR_TRAP	13	52	2026-10-31	2026-10-31 02:07:50.438
afb83866-d579-4aca-abdd-c6db196db61d	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	COLOR_TRAP	14	56	2026-10-29	2026-10-29 06:46:15.049
faa0df17-d1f1-447b-abdd-9cd7fe179cfa	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	NUMBER_TOUCH	25643.33	44.86	2026-10-28	2026-10-28 07:24:20.044
1e507a2b-81f6-4207-b30a-45cf93b84f89	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	NUMBER_TOUCH	23411.51	51.84	2026-10-28	2026-10-28 06:48:49.983
5583b2b5-533c-442f-ac98-89190116a207	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	COLOR_TRAP	12	48	2026-10-28	2026-10-28 01:49:02.705
efd39f04-2105-4e38-a70f-c63e75460bf4	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	MEMORY	5	40	2026-10-24	2026-10-24 02:15:09.125
505c22f3-3d04-481d-96f7-4634dc472f63	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	MEMORY	5	40	2026-10-24	2026-10-24 08:13:27.029
878694cd-6dc9-43a6-b3a2-f589e3c34b25	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	REACTION	409.36	42.36	2026-10-23	2026-10-23 07:36:51.919
74db33d4-cd40-4e7e-8779-e182e570f305	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	REACTION	392.07	46.21	2026-10-23	2026-10-23 01:10:26.009
47971a6b-9ccc-46ae-889a-fd935c4b6452	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	NUMBER_TOUCH	22239.56	55.5	2026-10-23	2026-10-23 00:19:58.104
cb43c52b-9dcc-4165-81c0-b275c1adc05f	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	MEMORY	5	40	2026-10-23	2026-10-23 06:39:01.355
8be9849e-ad40-46d5-afa4-f5a2d1876d6a	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	TEN_SECONDS	10686.14	86.28	2026-10-22	2026-10-22 05:54:23.088
1f53d25b-a34c-4397-b651-147bef47fdfc	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	TEN_SECONDS	10306.08	93.88	2026-10-22	2026-10-22 02:59:31.752
e8760118-3cd1-4323-bf64-1941d4015872	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	REACTION	399.61	44.53	2026-10-22	2026-10-22 07:22:39.692
117f1ad7-d2fa-44fc-a739-0369c36e3beb	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	REACTION	402.42	43.91	2026-10-22	2026-10-22 08:04:52.821
d889c367-f70d-495f-9e40-bd8726784b14	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	COLOR_TRAP	14	56	2026-10-22	2026-10-22 03:00:19.071
935a8218-9e1d-48fd-b2f9-7a0ccc17e82e	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	TEN_SECONDS	10162.87	96.74	2026-10-20	2026-10-20 01:36:36.634
e8691b7a-5733-4a67-a655-a4d8bf034329	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	REACTION	411.09	41.98	2026-10-20	2026-10-20 01:49:13.894
27c5815e-1ea4-4501-bd64-ff07bfb8abb5	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	REACTION	483	26	2026-10-20	2026-10-20 03:33:52.732
df29f198-8b2f-4818-88a9-13b4de207563	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	NUMBER_TOUCH	22822.66	53.68	2026-10-20	2026-10-20 05:21:47.903
9df0ee2e-1aa1-4e8d-b7ea-5a8bed2a33f2	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	TEN_SECONDS	11093.3	78.13	2026-10-22	2026-10-22 07:01:56.153
43026d90-0046-4d36-8101-fe6beba27cbe	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	TEN_SECONDS	11139.63	77.21	2026-10-22	2026-10-22 05:30:01.751
74d32f10-5ffa-4153-9f91-42cb2626f8f2	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	REACTION	287.17	69.52	2026-10-22	2026-10-22 02:25:34.13
78eb86b0-5a42-48c0-b5ff-1837b6083a64	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	NUMBER_TOUCH	19397.32	64.38	2026-10-22	2026-10-22 00:19:57.378
6232155f-e475-49bc-aa48-8fc560f5e8de	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	NUMBER_TOUCH	9458.42	95.44	2026-11-02	2026-11-02 02:55:44.332
2126bf14-b897-497b-8c91-08a70a2b5e14	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	MEMORY	14	100	2026-11-02	2026-11-02 07:01:19.716
7d9c2e94-609e-4691-ac6b-77cc510affc6	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	203.92	88.02	2026-10-30	2026-10-30 06:22:55.731
073c6e54-fe9d-4a7c-aeab-0cbfc72fa987	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	NUMBER_TOUCH	10161.9	93.24	2026-10-30	2026-10-30 08:27:24.843
129e12ff-ad7b-4ccb-a506-c3d0299dfa8f	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	MEMORY	12	96	2026-10-30	2026-10-30 01:41:13.144
45f537a6-5ae0-465c-95ce-ea3cf7df0fad	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	221.47	84.12	2026-10-28	2026-10-28 00:03:29.444
85d71aeb-2b2e-4fd3-ad3b-f82c674fd340	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	231.04	81.99	2026-10-28	2026-10-28 03:52:57.647
f7e2d242-505c-4c36-ab82-5f2a279dba2f	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	MEMORY	11	88	2026-10-28	2026-10-28 05:53:13.326
55b89e50-c1c8-4754-bc72-07cf5145d68b	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	MEMORY	12	96	2026-10-28	2026-10-28 01:44:40.069
6e57d7f0-c3e1-4f4c-975b-08363c039339	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	COLOR_TRAP	25	100	2026-10-28	2026-10-28 06:56:53.78
1b1cd5b3-c942-429d-8389-c8a3735e6948	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	200.07	88.87	2026-10-25	2026-10-25 00:48:05.171
314cfdce-a356-413e-922d-5274aef62832	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	192.79	90.49	2026-10-25	2026-10-25 01:05:39.363
457873cd-307e-4086-9d13-9d067b2f8a76	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	NUMBER_TOUCH	9819.27	94.31	2026-10-25	2026-10-25 01:08:31.587
66376697-53d3-4ccb-a4dc-50eccc7c2625	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	NUMBER_TOUCH	13710.25	82.16	2026-10-25	2026-10-25 00:09:57.263
2d2089d2-20d2-45a7-a750-abbbcbe1effa	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	COLOR_TRAP	26	100	2026-10-25	2026-10-25 01:30:26.329
be227704-566f-4b8a-8a7a-8b1d555b87d0	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	TEN_SECONDS	10116	97.68	2026-10-24	2026-10-24 05:17:05.862
f113836a-96f6-461f-a949-fcec8d71483c	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	222.24	83.95	2026-10-24	2026-10-24 08:42:39.11
2b3957d7-a989-448c-8ecb-dec887bfafe4	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	REACTION	210.06	86.65	2026-10-24	2026-10-24 05:15:57.694
4b625c4e-c63d-461a-80a1-eb04ea0f9aee	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	COLOR_TRAP	26	100	2026-10-24	2026-10-24 06:35:41.964
541dad80-242c-4e5b-afb8-8a31185bc39d	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	TEN_SECONDS	10802.71	83.95	2026-11-02	2026-11-02 07:45:41.973
f8aead8f-470f-47bb-a029-8268769947d5	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	TEN_SECONDS	7649.79	53	2026-11-02	2026-11-02 08:10:48.986
115453c8-66cc-4d2e-8227-a3f0f4bfbc08	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	REACTION	463.9	30.24	2026-11-02	2026-11-02 07:51:10.422
35630d19-aaa4-4764-99c1-f705ce79188f	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	MEMORY	3	24	2026-11-02	2026-11-02 00:39:46.551
522f1984-4b3c-4ec9-9be0-548ba0c6c5a1	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	COLOR_TRAP	14	56	2026-11-02	2026-11-02 00:49:11.831
2d9dfd1e-874c-4223-be08-71f2aaee173b	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	COLOR_TRAP	10	40	2026-11-02	2026-11-02 01:00:03.552
ef06c7ca-8a26-4ce0-87ff-591fb5edbc7e	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	NUMBER_TOUCH	26332.9	42.71	2026-10-31	2026-10-31 02:37:01.84
397467bb-276f-4883-a972-9b492ec7ac98	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	COLOR_TRAP	13	52	2026-10-31	2026-10-31 04:50:00.375
2a7bb503-3aa6-4c61-bd16-93e0e73591e0	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	TEN_SECONDS	10871.46	82.57	2026-10-29	2026-10-29 00:06:53.646
7ef8bf6e-32fd-4644-b971-795ebd54904e	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	NUMBER_TOUCH	25584.15	45.05	2026-10-29	2026-10-29 06:57:17.549
1117d9b9-d3d6-43b9-8f26-b90bf4c4bf04	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	COLOR_TRAP	11	44	2026-10-29	2026-10-29 03:47:57.41
60fece47-27c1-4583-8a03-0905de42d593	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	REACTION	458.04	31.55	2026-10-28	2026-10-28 02:51:25.794
4a4c8dc3-f527-45da-a37f-4c7c1c91e7ee	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	TEN_SECONDS	11958.49	60.83	2026-10-25	2026-10-25 05:07:58.152
185d2dce-224f-4b2d-a193-237b53522b02	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	TEN_SECONDS	9420.67	88.41	2026-10-25	2026-10-25 07:32:12.114
0be49c73-7665-4b4e-8542-d55dee895d1c	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	REACTION	471.05	28.66	2026-10-21	2026-10-21 06:15:15.704
45be30d8-6be6-4060-8c5d-81884cf585fa	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	MEMORY	6	48	2026-10-21	2026-10-21 08:07:02.695
6e2ae790-6d3f-4236-9408-add16622a999	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	MEMORY	6	48	2026-10-21	2026-10-21 04:26:25.685
605f3aec-998e-4e5e-a0bb-98a32e5c33cd	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	COLOR_TRAP	13	52	2026-10-21	2026-10-21 02:26:43.828
419043f1-4937-4ce1-b790-4da30b1d308b	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	COLOR_TRAP	14	56	2026-10-21	2026-10-21 07:08:01.694
ead2b6e6-4ad9-4ed9-8b11-63bcc549c802	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	REACTION	229.85	82.26	2026-11-02	2026-11-02 01:03:11.697
d116a826-0182-4dc2-80d3-534d54153ffe	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	MEMORY	13	100	2026-11-02	2026-11-02 04:33:48.221
c7c1a36a-229d-4ed2-bd9b-ae2a0af9b144	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	MEMORY	12	96	2026-11-02	2026-11-02 03:51:43.946
69607a4b-e318-421e-8483-cc253e935bd2	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	23	92	2026-11-02	2026-11-02 00:23:48.049
b9053bcd-3fed-42b3-aefb-5fc1fbc92ea8	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	TEN_SECONDS	9788.19	95.76	2026-11-01	2026-11-01 04:32:31.058
4a406cff-970c-4d80-a4b2-fef3d02638f5	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	TEN_SECONDS	9698.19	93.96	2026-11-01	2026-11-01 03:10:45.141
d63bebbe-f4a8-4061-ba25-a750cf1313b2	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	REACTION	251.08	77.54	2026-11-01	2026-11-01 05:43:30.827
6cf5d1bb-43cc-4d08-a0e3-3482cd7f7081	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	11059.19	90.44	2026-11-01	2026-11-01 08:53:05.821
4906797e-b6d5-4f55-9f9f-4fdafb0fd8b6	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	13658.18	82.32	2026-11-01	2026-11-01 07:38:25.774
9abca38c-e83f-4d83-8f6e-ed2e066c09ed	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	MEMORY	13	100	2026-11-01	2026-11-01 07:36:41.321
15af3b1e-a7a7-4d2a-a2e6-3d7b0edb208f	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	MEMORY	11	88	2026-11-01	2026-11-01 00:13:42.159
6481bb46-dfdd-4dc6-84bf-c151fda81853	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	24	96	2026-11-01	2026-11-01 01:44:46.692
b3cfe5a7-bd13-46ae-b915-5e6d02e7d099	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	26	100	2026-11-01	2026-11-01 04:00:04.499
05ebf57b-057b-4196-8d0c-4f802b1512a6	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	11448.76	89.22	2026-10-28	2026-10-28 06:54:14.938
fbcce0ca-2dfb-46e8-a0f9-8f9c9eac74f0	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	23	92	2026-10-28	2026-10-28 05:43:47.135
0cdcbcf7-09a7-4f78-809d-c1e8d1d7a76a	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	REACTION	231.89	81.8	2026-10-25	2026-10-25 01:13:26
e61ca0db-607f-42cf-8330-07916aee2ea2	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	MEMORY	12	96	2026-10-25	2026-10-25 06:44:14.522
f96558b7-ee05-4f18-8368-423f21a02457	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	MEMORY	12	96	2026-10-25	2026-10-25 04:37:16.357
92ce4e1a-e525-4286-bf33-a11d613e123d	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	23	92	2026-10-25	2026-10-25 03:07:29.366
457997b2-63d5-4fce-b8ef-9a45b232c15b	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	26	100	2026-10-25	2026-10-25 01:48:42.947
9ae0c5b7-ea24-4620-a504-8ddf3a398421	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	REACTION	242.42	79.46	2026-10-23	2026-10-23 02:52:36.886
64dff1c5-0881-44f8-95ec-f9b65c60e8eb	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	REACTION	240.8	79.82	2026-10-23	2026-10-23 00:06:09.879
2c89a7c3-cb2e-442c-8970-47e5ee6db717	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	11004.58	90.61	2026-10-23	2026-10-23 00:26:51.879
e0f7fa36-39ca-497f-943b-bc74e4a4ef74	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	11577.33	88.82	2026-10-23	2026-10-23 05:15:05.043
3bfed969-aede-4fa8-acea-437862c4930d	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	23	92	2026-10-23	2026-10-23 02:08:51.641
29f5ebf3-0232-4858-a159-9cceae4519c8	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	23	92	2026-10-23	2026-10-23 03:36:57
d5b3badd-583a-431c-9d01-2dbd897edc5c	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	TEN_SECONDS	9664.67	93.29	2026-10-20	2026-10-20 03:02:42.552
1e972f5e-7705-42d7-b500-81e1e15f1557	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	TEN_SECONDS	9802.07	96.04	2026-10-20	2026-10-20 03:39:47.272
7af92243-7fc9-4a05-b3f8-377920457d2d	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	12972.18	84.46	2026-10-20	2026-10-20 07:59:37.875
7aabaccf-56d5-49a3-8b42-1dc0ac7f0040	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	NUMBER_TOUCH	10199.29	93.13	2026-10-20	2026-10-20 01:09:37.457
15ab425e-17a1-4e34-9964-0f30beba7c24	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	24	96	2026-10-20	2026-10-20 04:40:23.044
97ffdbf5-88d8-4d42-9aa5-abe8cf1b6ec0	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	COLOR_TRAP	27	100	2026-10-20	2026-10-20 01:15:16.328
cmvyn7gji0004opmnvqkcunkc	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	QUICK_MATH	20	100	2026-11-02	2026-11-02 02:31:31.709
\.


--
-- Data for Name: Group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Group" (id, name, description, "joinCode", "joinCodeRotatedAt", "joinCodeEnabled", status, "primaryAdminId", "createdById", "createdAt", "updatedAt", "deletedAt", "storageQuotaMb") FROM stdin;
5c5848001eb7ca3edb5f1d9a	데모그룹172735	\N	C11530D2	2026-10-29 08:27:35.625	t	ACTIVE	7ecdb42f-2194-45b1-8f4b-f399996af2b8	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:27:35.625	2026-10-29 08:28:29.331	\N	1024
\.


--
-- Data for Name: GroupBadgeRule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupBadgeRule" ("groupId", key, target, enabled, "updatedById", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GroupFeature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupFeature" (id, "groupId", feature, status, "requestedById", "reviewedById", "reviewedAt", "rejectReason", "createdAt", "updatedAt") FROM stdin;
c020eaa5-afde-4e5c-97d2-f0475cfcddab	5c5848001eb7ca3edb5f1d9a	EMPLOYEE_OF_THE_MONTH	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 08:29:22.149	2026-11-01 23:56:14.256
fca65d96-c4aa-46c5-acf1-49a56bdb7aa4	5c5848001eb7ca3edb5f1d9a	COMPLIMENT_CARD	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 08:30:28.524	2026-11-01 23:56:14.256
83b0faf7-a798-41f7-8807-61d8ae0601e1	5c5848001eb7ca3edb5f1d9a	POINTS_BADGE	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 08:30:28.524	2026-11-01 23:56:14.256
cmvtb3xvc0001optga0ezjrez	5c5848001eb7ca3edb5f1d9a	MANITTO	APPROVED	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 08:54:01.273	2026-11-01 23:56:14.256
c5e6343e-57d5-48a3-9eda-b230080c83b0	5c5848001eb7ca3edb5f1d9a	ROLLING_PAPER	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:22:24.882	2026-11-01 23:56:14.256
3b57a1bb-bac0-4b0c-ae5d-57f91ff816d8	5c5848001eb7ca3edb5f1d9a	PHOTO_MISSION	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:22:26.25	2026-11-01 23:56:14.256
9a2abb33-edb6-4f11-b1a2-7fb7516fc8ab	5c5848001eb7ca3edb5f1d9a	DINNER_VOTE	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:22:27.677	2026-11-01 23:56:14.256
1b2cb6c0-932e-4b2e-b545-3e80edf03854	5c5848001eb7ca3edb5f1d9a	RANDOM_SURVEY	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:22:29.201	2026-11-01 23:56:14.256
ca6d053c-9cbe-441f-af00-47a9e691711d	5c5848001eb7ca3edb5f1d9a	SNACK_DRAW	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:22:30.738	2026-11-01 23:56:14.256
cmvtcpork0002op4crj7narjc	5c5848001eb7ca3edb5f1d9a	BOARD	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:38:55.52	2026-11-01 23:56:14.256
55b4b99e-6fe7-452e-9459-56c6a49d289d	5c5848001eb7ca3edb5f1d9a	MINI_GAMES	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-10-29 09:34:08.715	2026-11-01 23:56:14.256
a47d87f2-bc08-4ed0-8410-ae49e1212f60	5c5848001eb7ca3edb5f1d9a	DUTY_ROSTER	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-11-01 23:56:11.781	2026-11-01 23:56:14.256
06d49aae-2d80-491d-bdc2-dc21b82361ce	5c5848001eb7ca3edb5f1d9a	SUGGESTION_BOX	APPROVED	cmvrda1rw0000opgd9c0i30ss	cmvrda1rw0000opgd9c0i30ss	2026-11-01 23:56:14.256	\N	2026-11-01 23:56:13.171	2026-11-01 23:56:14.256
\.


--
-- Data for Name: GroupMembership; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupMembership" (id, "userId", "groupId", role, status, "joinedAt", "leftAt", "updatedAt") FROM stdin;
b29628c2-2aea-478b-8c63-5159a3a46f77	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
1aad9434-28b7-437b-817d-ae9c227e74e0	4c991d09-c69a-4674-83ac-f21125d5e2e5	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
0610345c-acef-450e-aa1f-998d06d2c4a5	3515b570-e1cd-4f5c-a65d-67f76e560e99	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
2568a415-5d94-4f4b-9616-af315b968001	aa23cb8d-261f-4a2e-9bd2-771759659a4c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
34977f41-dd77-4537-8ae7-16f3a9a223ef	3ab71819-06a6-48c5-b4ac-1b42894eb74a	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
2f76c63c-05c8-4552-bb93-521f2805f89d	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
94f5be21-c0fc-4059-8256-df3dd3cff308	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
bc5c467f-b6e1-472c-be41-eedf66760795	88b3b850-7910-46c4-af8b-ee5d2194d03a	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
f20a3a1d-950a-4fad-bafc-a4ff5b34f64b	1a398608-3edb-41e6-86dc-e16415bab310	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
0b49705d-2597-425b-b65a-5b47c96c6979	2c059cd8-7338-4e3c-87c3-54792ec418ac	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
46d8ba23-3d48-412c-83a5-f7c22aac7aef	4227074a-be01-4a63-8f35-83455ffc653e	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
76e3dad6-1668-4d18-a904-6958f598b910	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
7aa1ee3f-abed-4250-9a2f-a2fc168bf9f3	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
89b7b6b6-e237-435f-84b2-029e519df872	0689dbc7-0ec7-42ef-8625-73fea7a406ce	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
a36ec30e-7ce7-4dce-8288-11822441cee6	a2da8743-0244-4399-9c94-724c93b7f0b4	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
3491b352-a4c3-472d-ba09-a7daff25ee49	b6bedee2-168d-4f81-b03e-b58676faa40d	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
0869324c-28a2-4b56-8792-ac7c4db4f742	c3937195-11b4-410f-8069-d7007277b086	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
c91d7188-6865-4a6b-a407-644c8c8655a9	10dd366a-993b-4297-9799-efd799518e9c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
596374ec-d371-4e40-b0cd-66ba02e41d82	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
13663d60-0187-41b7-9999-c931d138b958	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
d0415025-921d-4c5f-a71d-31b3560d4990	56c18c2f-d43a-4f06-92a0-ad785f48d942	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
bb7ac45b-797b-4252-9915-bf26453595ac	26edcc02-bda5-46af-8759-80c4b24d9872	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
d0fbfa76-8220-4794-8889-4e2400239975	4ed9481a-8c95-43ba-8832-95d3bb44473a	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
cc6d4549-8e98-4f70-aca8-2821a5d409b3	616d01b4-afce-43ed-b57d-caf88803fe9e	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
7840fd6a-b09a-4b39-8d08-67f6d9c87a39	469fb89a-fe8d-4132-82fb-1117609d0d7b	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
e026cdf4-fab2-4b5f-b50a-1edf559f66ec	991b2268-d8b8-4127-a4a1-0648da2a3d88	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
1412d7f9-7065-419a-a774-28231f7f25a7	f4dc3955-250f-4515-a453-44c3c3f9838d	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
ecb44508-7bc3-40aa-aa94-cf877b2d1b5b	3eecafc3-7b6d-4409-a8cf-101d10139dcc	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
7e9081ad-2f34-4d0e-8eb3-6c465400b0bd	de04573b-8d39-4c09-9510-054e044ab033	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
eedbd7f1-e568-45d5-9227-dbb41d54d5e2	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
89c812db-4dfe-40de-8c15-0192420df6f0	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
0919ba58-d565-4cce-b95b-249a134ba3ac	c3108591-b396-4f8e-b3f7-73ba302fde9f	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
87835898-3053-4b41-ac31-51ea09aa30e6	3d780ace-7474-43cf-b4b0-10c9c3350615	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
de45ba54-895e-4a0b-8a6d-dab5b64dc948	e93bad82-e81d-45d2-8bed-edd34446ee99	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
6c3c2453-6af0-4377-b1bc-2e05ff6dc7ee	7c930bc6-1791-42cd-93ec-9ce4499251d8	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
44e49508-ba4a-473a-af33-2e0400096678	415caa6d-731a-4ad9-a412-a928e09264b1	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
a14ad021-1e03-4fe4-8c89-d607f658d27a	c6506cc9-39be-4912-ad62-b57a3242549c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
5dfcee30-b1f9-4df3-a6c5-18b70850794d	032b0ff0-cf49-44de-8478-b79536bce329	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
447a544b-8a76-4126-ae64-4976907cde93	33bfc592-2a58-4b7a-8775-03b3c0dac293	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
b74f24cf-9e47-4146-b27f-1cbd70f2a23a	7136bc09-e698-4590-8e22-03332e6a39ad	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
9f18876b-7cbe-44fb-9bee-7e29e58dd96d	a1bbc3d6-9b5b-48a2-838c-4496457de48c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
d4dd2feb-05f2-4495-85e3-e703835a44fa	e6631004-24e5-4ff6-9dff-c880f38dc227	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
b196bdc5-01b9-4316-91e1-28cd501bc539	7c671f41-3fd5-4aaf-832e-97e6fe96810c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
1fe7aabd-ef3e-483a-bc9a-71d6d4c183ce	3bce57f6-f335-4961-9676-11b097eb2194	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
84a38632-64f4-48e6-8cb8-8ea191806872	7e6721aa-8ade-49a8-ade5-6bf2586a606c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
391ee943-d9d7-40eb-8e9f-a30ecf88fa77	d046a5d5-2a39-420a-995d-ca1ddd237723	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
564058e3-ebd1-460f-9c4f-bb3200ecc927	fc0e3f6e-b17f-4350-ba79-19873935640c	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
e84172b4-4c5d-4857-815d-bc9c9f1f14d1	c55107c7-b1e6-48dc-be93-f0e845acbdce	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
78729e97-3ff2-4fa3-ada6-ddc158d53fc8	0b28c420-7b85-4fae-ac29-c62074c469c9	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
5515e9b1-9ff4-498e-a758-54994d113ee2	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
7a5158e6-444e-459c-86ed-a30e0bef3eb3	607bf496-70ab-4622-89d8-433736254355	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
03469c20-3d54-41d8-ad00-51e061c1c579	f847adce-31e5-4f77-a666-1fa0efdf6374	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
4995d30a-77e2-4815-8617-85462a2d63da	ff3b091d-f77f-4429-bf27-98eecc84fed3	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
0addad9b-1632-49eb-a282-45dd5e70ca14	1b47bac3-4ea3-4b82-9631-39730990e8fb	5c5848001eb7ca3edb5f1d9a	USER	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:27:52.88
7d3373f0-eb01-40a3-9219-026ed5bae100	7ecdb42f-2194-45b1-8f4b-f399996af2b8	5c5848001eb7ca3edb5f1d9a	ADMIN	APPROVED	2026-10-29 08:27:52.88	\N	2026-10-29 08:28:29.329
\.


--
-- Data for Name: GroupMembershipRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupMembershipRequest" (id, type, "userId", "groupId", status, message, "reviewerId", "reviewNote", "reviewedAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GroupPointRule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GroupPointRule" ("groupId", metric, points, "updatedById", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Inquiry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Inquiry" (id, "userId", "groupId", category, title, body, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: InquiryReply; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InquiryReply" (id, "inquiryId", "authorId", "fromMaster", body, "createdAt") FROM stdin;
\.


--
-- Data for Name: ManittoAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManittoAssignment" (id, "roundId", "giverId", "receiverId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ManittoMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManittoMessage" (id, "assignmentId", "senderId", body, "createdAt") FROM stdin;
\.


--
-- Data for Name: ManittoRound; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManittoRound" (id, "groupId", status, "startAt", "endAt", "endedAt", "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: MembershipRequestTeam; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MembershipRequestTeam" ("requestId", "teamId", approved) FROM stdin;
\.


--
-- Data for Name: Notice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notice" (id, "groupId", "teamId", "authorId", title, body, pinned, important, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: NoticeRead; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."NoticeRead" ("noticeId", "userId", "readAt") FROM stdin;
\.


--
-- Data for Name: PhotoMission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PhotoMission" (id, "groupId", "hostId", theme, description, "referenceUrl", "referenceType", status, deadline, "createdAt", "closedAt") FROM stdin;
d3d792f9-6fbb-447b-904c-62aaa796eb25	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	오늘의 점심 한 컷 🍱	주제에 어울리는 사진을 올려 주세요. 가장 마음에 드는 컷을 뽑을게요!	\N	\N	CLOSED	2026-10-28 09:22:58.336	2026-10-26 09:22:58.336	2026-10-28 09:22:58.336
c9965137-3d8b-4a52-9a58-755b4b10f824	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	내 책상 위 풍경 🖥️	주제에 어울리는 사진을 올려 주세요. 가장 마음에 드는 컷을 뽑을게요!	\N	\N	CLOSED	2026-10-31 09:22:58.336	2026-10-26 09:22:58.336	2026-11-02 01:57:54.344
de120cde-9086-4d35-9a76-e99674603a4d	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	퇴근길 하늘 🌇	주제에 어울리는 사진을 올려 주세요. 가장 마음에 드는 컷을 뽑을게요!	\N	\N	CLOSED	2026-10-31 09:22:58.336	2026-10-26 09:22:58.336	2026-11-02 01:57:54.344
\.


--
-- Data for Name: PhotoSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PhotoSubmission" (id, "missionId", "authorId", "mediaUrl", "mediaType", caption, "isBest", "createdAt") FROM stdin;
60cb49cd-e0c7-456c-9517-1309565adb69	d3d792f9-6fbb-447b-904c-62aaa796eb25	fc0e3f6e-b17f-4350-ba79-19873935640c	https://picsum.photos/seed/8516da15/640/480	IMAGE	저의 최선입니다 😎	f	2026-10-28 06:23:10.765
021064a5-dd44-4231-81e0-2d9bfac2980c	d3d792f9-6fbb-447b-904c-62aaa796eb25	032b0ff0-cf49-44de-8478-b79536bce329	https://picsum.photos/seed/ddbd54e6/640/480	IMAGE	오늘의 한 컷!	f	2026-10-28 06:50:27.196
e6e18a89-4ce7-4382-8885-05985a6012da	d3d792f9-6fbb-447b-904c-62aaa796eb25	e93bad82-e81d-45d2-8bed-edd34446ee99	https://picsum.photos/seed/2ced6674/640/480	IMAGE		f	2026-10-28 12:59:19.322
bcaa03f4-d3f8-4f88-b677-0cdaebc30ee2	c9965137-3d8b-4a52-9a58-755b4b10f824	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	https://picsum.photos/seed/d6e3f0fa/640/480	IMAGE		f	2026-10-27 11:22:24.395
6e94b85f-4415-4ca8-88de-c06742def14d	c9965137-3d8b-4a52-9a58-755b4b10f824	3515b570-e1cd-4f5c-a65d-67f76e560e99	https://picsum.photos/seed/8a85e68a/640/480	IMAGE	저의 최선입니다 😎	f	2026-10-28 15:29:47.073
bcbd0400-027b-4b4a-a1a7-d54f365b5098	c9965137-3d8b-4a52-9a58-755b4b10f824	4ed9481a-8c95-43ba-8832-95d3bb44473a	https://picsum.photos/seed/49cd43fb/640/480	IMAGE	저의 최선입니다 😎	f	2026-10-27 12:05:03.297
fa7a354b-1dd4-4b90-be73-65042e10a4dd	de120cde-9086-4d35-9a76-e99674603a4d	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	https://picsum.photos/seed/a9e3cf7d/640/480	IMAGE	이 정도면 괜찮죠?	f	2026-10-28 07:27:34.187
f66525ce-98bd-4eef-9cb9-a44ef0ae98f6	de120cde-9086-4d35-9a76-e99674603a4d	c3108591-b396-4f8e-b3f7-73ba302fde9f	https://picsum.photos/seed/5b27fe97/640/480	IMAGE	오늘의 한 컷!	f	2026-10-27 10:28:01.623
6855732d-b86b-4cd9-aed2-1c3bcd9d60d1	de120cde-9086-4d35-9a76-e99674603a4d	616d01b4-afce-43ed-b57d-caf88803fe9e	https://picsum.photos/seed/fa2505b3/640/480	IMAGE	찍는 데 한참 걸렸어요 📷	f	2026-10-28 09:50:48.019
f23fe44f-5462-4816-b57c-97302ad6c2d0	de120cde-9086-4d35-9a76-e99674603a4d	7ecdb42f-2194-45b1-8f4b-f399996af2b8	https://picsum.photos/seed/81daeee4/640/480	IMAGE	이 정도면 괜찮죠?	f	2026-10-28 19:09:13.962
a1b43f13-75c9-4a6f-b4b1-d73f20f9bb3b	de120cde-9086-4d35-9a76-e99674603a4d	88b3b850-7910-46c4-af8b-ee5d2194d03a	https://picsum.photos/seed/07595d76/640/480	IMAGE	찍는 데 한참 걸렸어요 📷	f	2026-10-27 19:28:11.172
6773f5aa-5640-4d67-bb35-4f620f5587db	d3d792f9-6fbb-447b-904c-62aaa796eb25	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	https://picsum.photos/seed/b88e55de/640/480	IMAGE	저의 최선입니다 😎	t	2026-10-27 14:47:20.458
\.


--
-- Data for Name: PointAdjustment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PointAdjustment" (id, "groupId", "userId", amount, reason, "actorId", "createdAt") FROM stdin;
\.


--
-- Data for Name: PointLedger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PointLedger" (id, "groupId", "userId", amount, kind, "refId", memo, "counterpartId", "createdAt") FROM stdin;
cmvykieh50005opkrs0rl7d0u	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	-2	GAME_FEE	turn:cmvykiegx0003opkry38qz8bj	체인 퀴즈 참가비: smoke 체인 퀴즈	\N	2026-11-02 01:16:03.401
cmvykiehf0008opkrsabo13cy	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	-2	GAME_FEE	turn:cmvykiegx0003opkry38qz8bj	체인 퀴즈 참가비: smoke 체인 퀴즈	\N	2026-11-02 01:16:03.411
cmvykieib000dopkrdbtron67	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	1	GAME_REWARD	chain:cmvykieia000copkrudltn46p	체인 퀴즈 정답: smoke 체인 퀴즈	\N	2026-11-02 01:16:03.444
cmvykieig000gopkroqplasal	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	4	GAME_REWARD	turn-done:cmvykiegx0003opkry38qz8bj	체인 퀴즈: smoke 체인 퀴즈 완주 보상	\N	2026-11-02 01:16:03.449
cmvykieig000hopkrn1g0a8s2	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	4	GAME_REWARD	turn-done:cmvykiegx0003opkry38qz8bj	체인 퀴즈: smoke 체인 퀴즈 완주 보상	\N	2026-11-02 01:16:03.449
cmvykieis000lopkrdmiu8bfi	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	-2	GAME_FEE	turn:cmvykieip000jopkr6cish0rx	AI 협동 추리 참가비: smoke 추리	\N	2026-11-02 01:16:03.461
cmvykieiz000oopkr58v24avw	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	-2	GAME_FEE	turn:cmvykieip000jopkr6cish0rx	AI 협동 추리 참가비: smoke 추리	\N	2026-11-02 01:16:03.468
cmvykiek0000yopkromzxqopl	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	-2	GAME_FEE	turn:cmvykiejy000wopkrjoiu4l1t	그림 이어그리기 참가비: smoke 그림	\N	2026-11-02 01:16:03.504
cmvykiek60011opkrk5hjd2pz	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	-2	GAME_FEE	turn:cmvykiejy000wopkrjoiu4l1t	그림 이어그리기 참가비: smoke 그림	\N	2026-11-02 01:16:03.51
cmvykiel20016opkr8zzsoqbk	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	4	GAME_REWARD	turn-done:cmvykiejy000wopkrjoiu4l1t	그림 이어그리기: smoke 그림 완주 보상	\N	2026-11-02 01:16:03.543
cmvykiel20017opkr1qna80qj	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	4	GAME_REWARD	turn-done:cmvykiejy000wopkrjoiu4l1t	그림 이어그리기: smoke 그림 완주 보상	\N	2026-11-02 01:16:03.543
cmvym05ye0002opsd2kug0kg1	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	-1	GAME_FEE	cmvym05yc0001opsdnjfm6998	High / Low 참가비	\N	2026-11-02 01:57:51.783
cmvym05ye0003opsdk5j0wcxo	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2	GAME_REWARD	weekly:2026-11-02	주간 챌린지 보너스	\N	2026-11-02 01:57:51.783
cmvymqyrq0002opmnnbo9guc3	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	-1	GAME_FEE	cmvymqyrn0001opmnurx1q155	초성 퀴즈 참가비	\N	2026-11-02 02:18:42.182
cmvyn7gjp0005opmnxwyiz15w	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	-1	GAME_FEE	cmvyn7gji0004opmnvqkcunkc	번개 계산 참가비	\N	2026-11-02 02:31:31.717
cmvyn7gjp0006opmn205k7mln	5c5848001eb7ca3edb5f1d9a	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	3	GAME_REWARD	cmvyn7gji0004opmnvqkcunkc	번개 계산 100.0점 보상	\N	2026-11-02 02:31:31.717
\.


--
-- Data for Name: PointRuleDefault; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PointRuleDefault" (metric, points) FROM stdin;
sentCard	2
receivedCard	3
nomination	1
win	10
comment	1
rollingPaperNote	1
missionSubmission	2
missionHost	3
missionBest	5
dinnerVote	1
surveyResponse	1
surveyCreate	2
snackJoin	1
snackTreat	3
boardPost	2
boardComment	1
gameDay	1
\.


--
-- Data for Name: ProfileFact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProfileFact" (id, "groupId", "userId", text, "createdAt") FROM stdin;
25cc029d-b1f6-4976-9a56-aad806ea047b	5c5848001eb7ca3edb5f1d9a	4c991d09-c69a-4674-83ac-f21125d5e2e5	예전에 마라톤 완주를 했어요	2026-10-21 18:17:14.279
aa8f83ae-980e-440b-813f-a1a60ec3a2bf	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	노래방에서는 발라드만 불러요	2026-10-27 16:39:57.436
a8a49605-1a14-47c1-8a2f-50c7620e9b32	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	출근길엔 항상 같은 노래를 들어요	2026-10-27 23:05:07.149
e4b6bf6b-90f7-4a46-83dd-d41605aa554a	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	간식은 매운 맛만 골라요	2026-10-21 22:08:30.307
865ea4e5-094e-432e-910d-c4d14a474da1	5c5848001eb7ca3edb5f1d9a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	엑셀 단축키를 100개 넘게 외웠어요	2026-10-29 09:40:51.011
affd4a0d-b417-4a30-b599-c15fd7103774	5c5848001eb7ca3edb5f1d9a	88b3b850-7910-46c4-af8b-ee5d2194d03a	간식은 매운 맛만 골라요	2026-10-23 05:48:28.653
9d2923f2-1a0e-413f-97b4-abe50f553101	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	고수는 한 번도 못 먹어 봤어요	2026-10-24 17:45:33.914
b7526026-bd48-4662-aff0-0f762125130c	5c5848001eb7ca3edb5f1d9a	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	첫 직장은 편의점 야간 알바였어요	2026-10-16 02:21:02.654
62d4b8d1-d5ac-41bc-b7f3-8464fe496a10	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	고양이 두 마리와 살고 있어요	2026-10-27 03:52:10.365
f0125eec-82c1-4d6c-bb66-a88e42ba1312	5c5848001eb7ca3edb5f1d9a	0689dbc7-0ec7-42ef-8625-73fea7a406ce	주말마다 한강에서 달리기를 해요	2026-10-19 12:27:34.687
1d857580-48f8-4c94-8efb-ba0178477cd8	5c5848001eb7ca3edb5f1d9a	a2da8743-0244-4399-9c94-724c93b7f0b4	엑셀 단축키를 100개 넘게 외웠어요	2026-10-24 00:06:41.681
e20ae138-8255-4602-a52c-ffbf029d76c2	5c5848001eb7ca3edb5f1d9a	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	커피는 하루 두 잔까지만 마셔요	2026-10-21 22:05:18.858
66ccd7a0-5049-40c8-a3d4-a5870680efc9	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	간식은 매운 맛만 골라요	2026-10-25 12:11:05.082
56d3a90c-d548-4d23-9b8f-cb7a2982d246	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	예전에 마라톤 완주를 했어요	2026-11-01 16:44:38.64
73150d3e-e96c-49d6-b448-6762f0c1d3c5	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	첫 직장은 편의점 야간 알바였어요	2026-10-22 06:58:02.953
61b67aa6-f77b-4b0c-bc23-5f1a42f3687f	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	고수는 한 번도 못 먹어 봤어요	2026-10-30 15:29:04.895
a21be763-73a2-4888-8e32-7dbbb079f324	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	커피는 하루 두 잔까지만 마셔요	2026-11-01 04:58:55.769
d63068aa-ce6d-4331-af46-a04d2e684710	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	고수는 한 번도 못 먹어 봤어요	2026-10-23 14:04:14.621
de23ddee-f0c4-402e-b33e-c035a36012fc	5c5848001eb7ca3edb5f1d9a	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	간식은 매운 맛만 골라요	2026-10-14 17:32:35.948
d8d194e6-8d0b-4e5d-bdb5-7d52277680c7	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	커피는 하루 두 잔까지만 마셔요	2026-10-24 21:43:31.582
5b242c41-1793-4892-8c00-2aea877a8e7c	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	출근길엔 항상 같은 노래를 들어요	2026-10-14 02:19:31.837
4a662713-5ce5-4b23-beba-2c833328f3aa	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	커피는 하루 두 잔까지만 마셔요	2026-11-01 04:33:57.629
ab0ee1d9-eb1d-4c5b-947a-5193bb089817	5c5848001eb7ca3edb5f1d9a	032b0ff0-cf49-44de-8478-b79536bce329	고수는 한 번도 못 먹어 봤어요	2026-10-23 20:35:20.659
c4290bb2-8a8b-4a4b-b54d-562e965f3e64	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	커피는 하루 두 잔까지만 마셔요	2026-10-30 14:34:58.068
54c0a87d-6dc3-424e-ade6-bca210bd2788	5c5848001eb7ca3edb5f1d9a	7136bc09-e698-4590-8e22-03332e6a39ad	예전에 마라톤 완주를 했어요	2026-11-01 15:22:52.507
060674ad-ac33-4fa1-90cf-94a3b1d63499	5c5848001eb7ca3edb5f1d9a	e6631004-24e5-4ff6-9dff-c880f38dc227	노래방에서는 발라드만 불러요	2026-10-18 19:33:39.644
614877de-7e39-4117-bd97-3ef304f19db3	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	여행 가면 지도 없이 걸어 다녀요	2026-10-30 22:07:24.565
8f90d5f0-0220-4be6-9143-31a3cbcf3229	5c5848001eb7ca3edb5f1d9a	3bce57f6-f335-4961-9676-11b097eb2194	간식은 매운 맛만 골라요	2026-10-26 20:17:24.436
f36693d3-4e1a-4566-9927-e640b3eacdc2	5c5848001eb7ca3edb5f1d9a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	예전에 마라톤 완주를 했어요	2026-10-15 21:31:03.16
c147ad38-aabd-43d1-945b-2010d841388a	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	여행 가면 지도 없이 걸어 다녀요	2026-10-15 07:48:26.931
1d0560f0-c4dd-4e56-817c-ff43f5b111c9	5c5848001eb7ca3edb5f1d9a	fc0e3f6e-b17f-4350-ba79-19873935640c	엑셀 단축키를 100개 넘게 외웠어요	2026-10-27 03:23:11.745
2998583b-865e-422e-b248-7f7dfc0d3d14	5c5848001eb7ca3edb5f1d9a	0b28c420-7b85-4fae-ac29-c62074c469c9	점심 메뉴는 3분 안에 정해요	2026-10-26 13:00:20.851
024ef84f-7f7e-4bfa-a85f-3c728fbbf164	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	출근길엔 항상 같은 노래를 들어요	2026-10-22 06:57:59.246
74e2572c-e73d-449c-ba0e-0bad17f23b79	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	고수는 한 번도 못 먹어 봤어요	2026-10-17 19:49:13.595
11cdb329-105a-4dd2-b01c-8be940a14e09	5c5848001eb7ca3edb5f1d9a	ff3b091d-f77f-4429-bf27-98eecc84fed3	노래방에서는 발라드만 불러요	2026-10-17 11:00:54.776
a9c8c978-de7b-4571-ae82-d4f0e52e4eba	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	출근길엔 항상 같은 노래를 들어요	2026-10-26 00:44:10.94
6cf32148-5009-4dda-8210-f6cef2467fb1	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	커피는 하루 두 잔까지만 마셔요	2026-10-28 14:40:36.801
f5c59368-b925-4009-b96c-facf39af389e	5c5848001eb7ca3edb5f1d9a	3515b570-e1cd-4f5c-a65d-67f76e560e99	노래방에서는 발라드만 불러요	2026-10-13 18:17:48
c501afb7-ee5f-4dcc-aac1-f4e24e1f0b5c	5c5848001eb7ca3edb5f1d9a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	고수는 한 번도 못 먹어 봤어요	2026-10-17 03:45:59.701
758be80f-9dbe-46f0-98ed-c600c7b4acdf	5c5848001eb7ca3edb5f1d9a	3ab71819-06a6-48c5-b4ac-1b42894eb74a	점심 메뉴는 3분 안에 정해요	2026-10-20 06:04:03.58
b2e9ff0d-8aff-4a35-9276-00b2c7e7ef5a	5c5848001eb7ca3edb5f1d9a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	첫 직장은 편의점 야간 알바였어요	2026-10-19 10:12:11.194
97ddaade-bdeb-4845-968a-02317ac7050a	5c5848001eb7ca3edb5f1d9a	1a398608-3edb-41e6-86dc-e16415bab310	노래방에서는 발라드만 불러요	2026-10-27 21:33:14.809
2dc30b64-bc97-482d-beae-36a72745f3eb	5c5848001eb7ca3edb5f1d9a	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	출근길엔 항상 같은 노래를 들어요	2026-10-26 06:17:42.258
1c3c189c-568f-43d0-bb94-fd62fb77e3cb	5c5848001eb7ca3edb5f1d9a	c3937195-11b4-410f-8069-d7007277b086	간식은 매운 맛만 골라요	2026-10-16 22:38:33.754
34033ad8-b90f-43a6-9768-ddb0d50155d2	5c5848001eb7ca3edb5f1d9a	10dd366a-993b-4297-9799-efd799518e9c	고수는 한 번도 못 먹어 봤어요	2026-10-22 08:22:43.484
9098dedf-e14c-4e49-bc3e-7f61322585b0	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	첫 직장은 편의점 야간 알바였어요	2026-10-24 13:02:57.027
fd308f8f-d512-4ee9-bff1-e423cb38fb61	5c5848001eb7ca3edb5f1d9a	56c18c2f-d43a-4f06-92a0-ad785f48d942	주말마다 한강에서 달리기를 해요	2026-10-31 23:14:39.34
62408cd2-f458-4ef6-b99b-a7e9bf720683	5c5848001eb7ca3edb5f1d9a	26edcc02-bda5-46af-8759-80c4b24d9872	점심 메뉴는 3분 안에 정해요	2026-10-14 13:07:19.091
923928a5-4d56-4a12-9238-ff34c0205b9c	5c5848001eb7ca3edb5f1d9a	4ed9481a-8c95-43ba-8832-95d3bb44473a	고양이 두 마리와 살고 있어요	2026-10-29 11:00:33.278
0a2f4a08-40a9-4c4d-adfb-21e01b7e56b0	5c5848001eb7ca3edb5f1d9a	616d01b4-afce-43ed-b57d-caf88803fe9e	예전에 마라톤 완주를 했어요	2026-10-19 04:56:38.109
ef99abe3-053d-41a2-9103-4db57e9c4267	5c5848001eb7ca3edb5f1d9a	469fb89a-fe8d-4132-82fb-1117609d0d7b	고수는 한 번도 못 먹어 봤어요	2026-10-27 08:00:44.577
30cfcb3d-6c2a-48bf-b03e-c41c2e38905c	5c5848001eb7ca3edb5f1d9a	991b2268-d8b8-4127-a4a1-0648da2a3d88	첫 직장은 편의점 야간 알바였어요	2026-10-29 08:33:58.655
d138f4d4-4e2d-49ac-ab26-b04b89bbe645	5c5848001eb7ca3edb5f1d9a	f4dc3955-250f-4515-a453-44c3c3f9838d	주말마다 한강에서 달리기를 해요	2026-10-27 11:55:11.02
5080c0a7-269c-4c84-9e71-b183a78f03a6	5c5848001eb7ca3edb5f1d9a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	간식은 매운 맛만 골라요	2026-10-18 05:36:55.636
be0a71fa-c34c-4f8b-9d4b-4aa614ee68b9	5c5848001eb7ca3edb5f1d9a	de04573b-8d39-4c09-9510-054e044ab033	커피는 하루 두 잔까지만 마셔요	2026-10-21 11:54:27.592
9faf6820-1bd8-47fd-b94a-a15395bd9d58	5c5848001eb7ca3edb5f1d9a	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	여행 가면 지도 없이 걸어 다녀요	2026-10-23 01:36:45.638
979338e9-472b-4a4c-bac7-69efe504b6f3	5c5848001eb7ca3edb5f1d9a	c3108591-b396-4f8e-b3f7-73ba302fde9f	주말마다 한강에서 달리기를 해요	2026-10-24 03:59:06.45
9b9aec3b-9a09-4586-974e-6a5ee179cd58	5c5848001eb7ca3edb5f1d9a	3d780ace-7474-43cf-b4b0-10c9c3350615	엑셀 단축키를 100개 넘게 외웠어요	2026-10-16 02:33:53.558
a55182e7-a876-480b-ba5c-df0c8990e74e	5c5848001eb7ca3edb5f1d9a	415caa6d-731a-4ad9-a412-a928e09264b1	예전에 마라톤 완주를 했어요	2026-10-31 17:00:48.525
f67e32c0-2a29-4412-b59f-2daa6c649dc1	5c5848001eb7ca3edb5f1d9a	c6506cc9-39be-4912-ad62-b57a3242549c	고수는 한 번도 못 먹어 봤어요	2026-10-21 10:36:10.854
b6b64955-3d4b-4baf-b31e-8a0ca3b5e5ef	5c5848001eb7ca3edb5f1d9a	33bfc592-2a58-4b7a-8775-03b3c0dac293	간식은 매운 맛만 골라요	2026-10-21 13:25:48.435
a653b171-4c48-46d8-8b5b-e065f40a97f0	5c5848001eb7ca3edb5f1d9a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	노래방에서는 발라드만 불러요	2026-10-20 13:56:52.888
40cdcc34-957d-44b0-906c-b0d9dd6c241e	5c5848001eb7ca3edb5f1d9a	7c671f41-3fd5-4aaf-832e-97e6fe96810c	출근길엔 항상 같은 노래를 들어요	2026-10-28 06:13:53.314
fef9e1b8-e3f9-4c1a-aa61-2d33c4c2998c	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	엑셀 단축키를 100개 넘게 외웠어요	2026-10-19 10:48:11.455
63d82865-d29f-4768-89c5-3d7d5e4c5ef7	5c5848001eb7ca3edb5f1d9a	c55107c7-b1e6-48dc-be93-f0e845acbdce	여행 가면 지도 없이 걸어 다녀요	2026-10-16 19:22:40.09
59af4b99-6982-4061-b6b7-1fc57c15c48f	5c5848001eb7ca3edb5f1d9a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	간식은 매운 맛만 골라요	2026-10-27 13:35:21.101
2fe89984-c36a-4a9f-b0a5-680928203392	5c5848001eb7ca3edb5f1d9a	607bf496-70ab-4622-89d8-433736254355	고양이 두 마리와 살고 있어요	2026-10-28 13:43:24.933
b0a3cb3a-2c46-45bc-9415-e9ddfdf54fa3	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	첫 직장은 편의점 야간 알바였어요	2026-10-14 15:09:20.592
b0b1a346-b237-4521-81c1-bdd4993ed815	5c5848001eb7ca3edb5f1d9a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	점심 메뉴는 3분 안에 정해요	2026-10-13 10:01:23.498
\.


--
-- Data for Name: RollingPaper; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RollingPaper" (id, "groupId", "targetUserId", title, message, theme, status, "closeAt", "closedAt", "createdById", "createdAt") FROM stdin;
70a41c7f-ea99-4b5b-a153-ba4c517365fb	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	고은별님을 위한 롤링페이퍼	한 줄씩 마음을 남겨 주세요 💌	PINK	OPEN	\N	\N	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-10-26 09:22:57.376
e7742404-0eed-46f2-9126-5023b56eb182	5c5848001eb7ca3edb5f1d9a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	석민아님을 위한 롤링페이퍼	수고 많았어요! 응원 한마디씩 🙌	YELLOW	OPEN	\N	\N	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-26 09:22:57.376
e8440c93-3830-483b-9f15-6306229f3acd	5c5848001eb7ca3edb5f1d9a	f847adce-31e5-4f77-a666-1fa0efdf6374	조수빈님을 위한 롤링페이퍼	함께해서 즐거웠어요 🎉	PINK	CLOSED	\N	2026-10-28 09:22:57.376	607bf496-70ab-4622-89d8-433736254355	2026-10-26 09:22:57.376
\.


--
-- Data for Name: RollingPaperNote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RollingPaperNote" (id, "paperId", "authorId", body, color, rotation, anonymous, "createdAt") FROM stdin;
b0a54c64-f121-46e0-85ee-ec0f95e6b4b8	70a41c7f-ea99-4b5b-a153-ba4c517365fb	991b2268-d8b8-4127-a4a1-0648da2a3d88	응원합니다! 화이팅 💪	#E6D9FF	-2	f	2026-10-28 18:15:35.744
3f8d802d-602a-4113-997d-ccb6c973664a	70a41c7f-ea99-4b5b-a153-ba4c517365fb	616d01b4-afce-43ed-b57d-caf88803fe9e	건강 잘 챙기세요 🌿	#FFD6E0	-4	f	2026-10-27 13:21:07.597
784e78ae-34a1-4203-911f-f36691465501	70a41c7f-ea99-4b5b-a153-ba4c517365fb	c55107c7-b1e6-48dc-be93-f0e845acbdce	항상 고마워요! 덕분에 든든했어요 😊	#FFE2B8	-3	f	2026-10-28 08:54:28.262
4f7f09f3-66be-47bc-9376-0f270e659550	70a41c7f-ea99-4b5b-a153-ba4c517365fb	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	최고예요! 🏆	#FFD6E0	0	f	2026-10-27 15:35:42.419
3cc07104-613e-4679-b495-0ed90f833f43	70a41c7f-ea99-4b5b-a153-ba4c517365fb	a1bbc3d6-9b5b-48a2-838c-4496457de48c	건강 잘 챙기세요 🌿	#FFF3A3	-2	f	2026-10-27 10:06:54.96
d9ea4532-efac-4e96-8819-5da96fec09d9	70a41c7f-ea99-4b5b-a153-ba4c517365fb	c6506cc9-39be-4912-ad62-b57a3242549c	다음에 맛있는 거 먹으러 가요 🍚	#FFD6E0	-3	f	2026-10-28 09:56:10.403
d408a6c0-5513-4015-8a1d-949c480af3bf	70a41c7f-ea99-4b5b-a153-ba4c517365fb	3eecafc3-7b6d-4409-a8cf-101d10139dcc	같이 일해서 즐거웠습니다 👍	#FFE2B8	3	t	2026-10-28 22:30:02.17
b7009229-ddd4-42fb-94c5-7679dc55dda1	e7742404-0eed-46f2-9126-5023b56eb182	0b28c420-7b85-4fae-ac29-c62074c469c9	건강 잘 챙기세요 🌿	#FFF3A3	3	f	2026-10-27 20:28:47.482
17e9d607-cb35-49a7-aa5a-7f28e1a78140	e7742404-0eed-46f2-9126-5023b56eb182	7c930bc6-1791-42cd-93ec-9ce4499251d8	꼼꼼하게 챙겨주셔서 감사했어요 🙏	#FFF3A3	1	f	2026-10-28 00:59:52.89
52f50c38-cd5f-4b98-aae4-e92117601562	e7742404-0eed-46f2-9126-5023b56eb182	56c18c2f-d43a-4f06-92a0-ad785f48d942	늘 밝은 에너지 감사해요 ✨	#FFE2B8	4	f	2026-10-28 00:26:30.342
89f92a82-bf97-4aa6-9be6-eacd0d6d6e45	e7742404-0eed-46f2-9126-5023b56eb182	3d780ace-7474-43cf-b4b0-10c9c3350615	늘 밝은 에너지 감사해요 ✨	#D6EBFF	-4	f	2026-10-27 20:24:27.458
b174e234-2255-4cb3-b06b-5d92a937a1c1	e7742404-0eed-46f2-9126-5023b56eb182	c55107c7-b1e6-48dc-be93-f0e845acbdce	최고예요! 🏆	#E6D9FF	-1	f	2026-10-28 18:19:26.42
9e9215b2-7bff-440d-a16b-36b09a0dd36c	e7742404-0eed-46f2-9126-5023b56eb182	10dd366a-993b-4297-9799-efd799518e9c	건강 잘 챙기세요 🌿	#D9F7D2	-4	t	2026-10-29 00:21:15.782
962be057-eae9-40d8-b82c-3f963deb82d8	e7742404-0eed-46f2-9126-5023b56eb182	415caa6d-731a-4ad9-a412-a928e09264b1	꼼꼼하게 챙겨주셔서 감사했어요 🙏	#E6D9FF	4	f	2026-10-29 07:14:52.135
765accec-c74f-4f48-aec4-c36b49c22e86	e7742404-0eed-46f2-9126-5023b56eb182	fc0e3f6e-b17f-4350-ba79-19873935640c	같이 일해서 즐거웠습니다 👍	#E6D9FF	-4	t	2026-10-27 17:39:50.187
bf0853bc-ad06-4dd2-ad76-8319e74c5d91	e7742404-0eed-46f2-9126-5023b56eb182	e93bad82-e81d-45d2-8bed-edd34446ee99	다음에 맛있는 거 먹으러 가요 🍚	#D9F7D2	4	f	2026-10-28 15:06:16.088
6023da55-0dc4-439d-b03e-94cd1119f60f	e7742404-0eed-46f2-9126-5023b56eb182	aa23cb8d-261f-4a2e-9bd2-771759659a4c	꼼꼼하게 챙겨주셔서 감사했어요 🙏	#E6D9FF	-2	t	2026-10-28 13:40:38.648
af8049de-491d-4588-9889-8d61bcb07a05	e7742404-0eed-46f2-9126-5023b56eb182	4227074a-be01-4a63-8f35-83455ffc653e	항상 고마워요! 덕분에 든든했어요 😊	#FFE2B8	-2	f	2026-10-28 19:47:03.757
871bb407-9eaf-417f-aea7-5cb556495617	e7742404-0eed-46f2-9126-5023b56eb182	a2da8743-0244-4399-9c94-724c93b7f0b4	최고예요! 🏆	#E6D9FF	3	f	2026-10-27 17:47:30.073
2f732dc2-5c03-4e72-9235-5a4b6013252d	e7742404-0eed-46f2-9126-5023b56eb182	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	항상 고마워요! 덕분에 든든했어요 😊	#D6EBFF	1	f	2026-10-28 21:51:44.974
59e5b0d4-b325-4e82-a07f-ff16e35cfb8c	e8440c93-3830-483b-9f15-6306229f3acd	0b28c420-7b85-4fae-ac29-c62074c469c9	항상 고마워요! 덕분에 든든했어요 😊	#E6D9FF	0	f	2026-10-27 19:42:12.055
f38cda3a-b8c6-4fac-aaeb-6092bac631f6	e8440c93-3830-483b-9f15-6306229f3acd	415caa6d-731a-4ad9-a412-a928e09264b1	항상 고마워요! 덕분에 든든했어요 😊	#D6EBFF	4	f	2026-10-27 15:44:18.933
499113c5-b949-49c9-8b36-171635802b96	e8440c93-3830-483b-9f15-6306229f3acd	b6bedee2-168d-4f81-b03e-b58676faa40d	늘 밝은 에너지 감사해요 ✨	#D9F7D2	0	t	2026-10-27 15:53:52.132
8599af43-825c-4e66-9e27-352bbc5ae4fd	e8440c93-3830-483b-9f15-6306229f3acd	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	늘 밝은 에너지 감사해요 ✨	#D9F7D2	-4	f	2026-10-28 01:36:32.404
59ab3571-a016-48cc-a821-f8247d111192	e8440c93-3830-483b-9f15-6306229f3acd	de04573b-8d39-4c09-9510-054e044ab033	늘 밝은 에너지 감사해요 ✨	#FFE2B8	-4	f	2026-10-28 14:03:34.372
627fdc7d-7e54-4098-a8af-1d2450188814	e8440c93-3830-483b-9f15-6306229f3acd	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	건강 잘 챙기세요 🌿	#D6EBFF	0	f	2026-10-27 19:29:51.907
f03a8783-5d45-472a-9439-196b17810218	e8440c93-3830-483b-9f15-6306229f3acd	ff3b091d-f77f-4429-bf27-98eecc84fed3	건강 잘 챙기세요 🌿	#FFE2B8	-1	t	2026-10-28 13:25:51.888
8ad4b2fa-1504-4da4-93ac-605358bb13df	e8440c93-3830-483b-9f15-6306229f3acd	7136bc09-e698-4590-8e22-03332e6a39ad	다음에 맛있는 거 먹으러 가요 🍚	#FFF3A3	0	f	2026-10-28 16:51:31.751
683c4558-aefd-4d1a-998a-c03893d200d6	e8440c93-3830-483b-9f15-6306229f3acd	c3937195-11b4-410f-8069-d7007277b086	항상 고마워요! 덕분에 든든했어요 😊	#FFF3A3	-3	f	2026-10-29 00:36:11.791
9007ff19-7672-44b7-84c1-518d6dde7ec5	e8440c93-3830-483b-9f15-6306229f3acd	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	늘 밝은 에너지 감사해요 ✨	#D9F7D2	-1	f	2026-10-28 03:40:15.435
29f018ba-c5df-4311-8e62-2b1ffa221349	e8440c93-3830-483b-9f15-6306229f3acd	c6506cc9-39be-4912-ad62-b57a3242549c	늘 밝은 에너지 감사해요 ✨	#FFF3A3	4	f	2026-10-27 11:26:46.858
687ef1ab-9c6f-4b9f-9871-3970993447b7	e8440c93-3830-483b-9f15-6306229f3acd	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	최고예요! 🏆	#D6EBFF	-3	f	2026-10-27 22:23:53.667
7a3c1f1f-a0da-4638-849a-70e979f3937d	e8440c93-3830-483b-9f15-6306229f3acd	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	같이 일해서 즐거웠습니다 👍	#FFE2B8	-1	f	2026-10-28 06:40:41.976
\.


--
-- Data for Name: SnackGame; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SnackGame" (id, "groupId", "teamId", title, status, "winnerCount", "createdById", "createdAt", "startedAt", "doneAt") FROM stdin;
ca822330-4b54-4e73-8065-18023edd69c8	5c5848001eb7ca3edb5f1d9a	\N	금요일 커피 쏘기 ☕	DONE	1	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 09:23:01.267	2026-10-28 09:23:01.267	2026-10-28 13:23:01.267
cd6abeff-3940-4332-abb9-bc6808dbdf06	5c5848001eb7ca3edb5f1d9a	\N	오후 간식 내기 🍩	DRAWING	2	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 09:23:01.267	2026-10-28 09:23:01.267	\N
81b50b58-7547-449b-9ee6-bf33b616c15c	5c5848001eb7ca3edb5f1d9a	\N	팀 회식 후 아이스크림 🍦	RECRUITING	1	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 09:23:01.267	\N	\N
cmvtcpuuy0005op4ch1yegsj7	5c5848001eb7ca3edb5f1d9a	0449c2085cbb9704a6021685	222	CANCELED	2	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-29 09:39:03.419	\N	\N
\.


--
-- Data for Name: SnackParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SnackParticipant" (id, "gameId", "userId", "joinedAt") FROM stdin;
fee3266c-c5d7-4b1d-bdcd-ee99b8d57176	ca822330-4b54-4e73-8065-18023edd69c8	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 09:23:01.267
2abd35cb-45b1-4bf0-af1e-88a12275e4bd	ca822330-4b54-4e73-8065-18023edd69c8	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 09:23:01.267
2e3b4a6a-a5d4-4661-8d3d-682196c537fe	ca822330-4b54-4e73-8065-18023edd69c8	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-28 09:23:01.267
90b1774c-b47f-4ccb-8eab-63f73c26f5fd	ca822330-4b54-4e73-8065-18023edd69c8	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-28 09:23:01.267
3fa4387f-d383-4bc1-bb56-ef5dcde29e28	ca822330-4b54-4e73-8065-18023edd69c8	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-28 09:23:01.267
4112d9b6-da2e-46f8-8129-8c188bd3ec17	ca822330-4b54-4e73-8065-18023edd69c8	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	2026-10-28 09:23:01.267
d4e01d4f-83ae-4de9-a5f1-0537f359625c	cd6abeff-3940-4332-abb9-bc6808dbdf06	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 09:23:01.267
2379d8ee-8a60-4af6-846c-21de933ba5a5	cd6abeff-3940-4332-abb9-bc6808dbdf06	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 09:23:01.267
83eaa758-9863-4fe2-9453-f4c6136a13ec	cd6abeff-3940-4332-abb9-bc6808dbdf06	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-28 09:23:01.267
0a74c396-a603-450c-8b6f-c2c679476e26	cd6abeff-3940-4332-abb9-bc6808dbdf06	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-28 09:23:01.267
8ba6c5fb-08af-4794-8c98-d86591547d9b	cd6abeff-3940-4332-abb9-bc6808dbdf06	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-28 09:23:01.267
a5eecb55-7a59-4944-820a-0bed8fabbd07	cd6abeff-3940-4332-abb9-bc6808dbdf06	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	2026-10-28 09:23:01.267
68c04a97-d795-461f-ac4b-d030e17534a7	cd6abeff-3940-4332-abb9-bc6808dbdf06	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-10-28 09:23:01.267
354393eb-59a6-400c-b2b6-797431f6f13b	cd6abeff-3940-4332-abb9-bc6808dbdf06	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-28 09:23:01.267
6f2c4c30-057c-4a70-9528-70104da24275	81b50b58-7547-449b-9ee6-bf33b616c15c	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 09:23:01.267
27f6b13a-55df-4a39-b8b2-568229f8d6f2	81b50b58-7547-449b-9ee6-bf33b616c15c	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 09:23:01.267
232a4d21-e2d8-4dfa-ab8b-f495eda610e5	81b50b58-7547-449b-9ee6-bf33b616c15c	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-28 09:23:01.267
1ce2fd41-31cb-4255-adfb-76496e5b02f1	81b50b58-7547-449b-9ee6-bf33b616c15c	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-28 09:23:01.267
bebb9f32-12cf-4096-a330-668d2dd450d8	81b50b58-7547-449b-9ee6-bf33b616c15c	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-28 09:23:01.267
\.


--
-- Data for Name: SnackSlot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SnackSlot" (id, "gameId", "position", "isWinner", "drawnById", "drawnAt") FROM stdin;
28ee6ecc-9081-480d-94ff-8182550b386c	ca822330-4b54-4e73-8065-18023edd69c8	1	t	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 14:23:01.267
add86dd7-2046-44fa-be92-20fe0a9e1ee7	ca822330-4b54-4e73-8065-18023edd69c8	2	f	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 14:23:01.267
96b7b751-d087-4e09-8e76-ba48c1bfb988	ca822330-4b54-4e73-8065-18023edd69c8	3	f	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-28 14:23:01.267
eb15fb74-9d82-4c22-9f3b-1b6f7ea01c9c	ca822330-4b54-4e73-8065-18023edd69c8	4	f	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-28 14:23:01.267
8c4b2a4d-8b31-4c6f-a839-d626fb543a37	ca822330-4b54-4e73-8065-18023edd69c8	5	f	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-28 14:23:01.267
ec6bee0c-b883-4137-a1f3-de2befdfd88a	ca822330-4b54-4e73-8065-18023edd69c8	6	f	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	2026-10-28 14:23:01.267
4fb6f294-2496-4557-a0bf-70d9ab623efc	cd6abeff-3940-4332-abb9-bc6808dbdf06	1	t	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-28 14:23:01.267
2c939cbb-362c-437d-b20e-78ca6334bb77	cd6abeff-3940-4332-abb9-bc6808dbdf06	2	t	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 14:23:01.267
c25eca40-a8d3-4e58-9e92-f1623aa0c3e9	cd6abeff-3940-4332-abb9-bc6808dbdf06	3	f	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-28 14:23:01.267
f1d92a12-3a19-496f-aac9-0ff6af8b98b3	cd6abeff-3940-4332-abb9-bc6808dbdf06	4	f	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-28 14:23:01.267
d513c615-ca0c-47a3-b655-76ce60c56247	cd6abeff-3940-4332-abb9-bc6808dbdf06	5	f	\N	\N
92ca5c6d-6de9-4307-a854-304b52772d89	cd6abeff-3940-4332-abb9-bc6808dbdf06	6	f	\N	\N
68dc4802-9550-4413-9c5a-a02b796b322b	cd6abeff-3940-4332-abb9-bc6808dbdf06	7	f	\N	\N
2a8b4c44-7541-4501-a99e-af6e01ad877e	cd6abeff-3940-4332-abb9-bc6808dbdf06	8	f	\N	\N
\.


--
-- Data for Name: Suggestion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Suggestion" (id, "groupId", "teamId", "authorId", anonymous, category, title, body, status, answer, "answeredById", "answeredAt", "createdAt", "updatedAt") FROM stdin;
bcea536d-b301-4203-88bc-e931a2a79db5	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	FACILITY	점심 시간을 조금 더 길게	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	REVIEWING	좋은 의견이에요! 담당 팀과 이야기해 볼게요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-11-01 17:56:13.907	2026-10-31 23:56:13.907	2026-11-01 23:56:13.907
cff016d4-6431-46fa-bb25-99827d4d1936	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	t	FACILITY	회의실 예약 시스템 개선	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	ACCEPTED	반영 완료했어요. 감사합니다!	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-11-01 11:56:13.907	2026-10-30 23:56:13.907	2026-11-01 23:56:13.907
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	t	ETC	재택 근무 요일 자율화	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	DONE	지금은 예산상 보류해요. 다음에 다시 봐요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-11-01 05:56:13.907	2026-10-29 23:56:13.907	2026-11-01 23:56:13.907
c0ed3b99-9690-4dd9-984a-3fd2b928be61	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	WELFARE	탕비실 간식 다양화	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	DECLINED	검토했어요. 다음 분기에 반영할게요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-31 23:56:13.907	2026-10-28 23:56:13.907	2026-11-01 23:56:13.907
3ab06475-a44e-4d78-9b42-844b50f5a33d	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	WORK	주차 공간 부족 문제	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	RECEIVED	\N	\N	\N	2026-10-27 23:56:13.907	2026-11-01 23:56:13.907
cf072df9-3068-4916-b5fc-b28136274a8f	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	SYSTEM	야근 식대 지원 확대	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	REVIEWING	반영 완료했어요. 감사합니다!	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-31 11:56:13.907	2026-10-26 23:56:13.907	2026-11-01 23:56:13.907
2bb61d65-577d-4856-a31a-aa772126e017	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	t	WORK	온라인 회의 배경 가이드	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	ACCEPTED	지금은 예산상 보류해요. 다음에 다시 봐요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-31 05:56:13.907	2026-10-25 23:56:13.907	2026-11-01 23:56:13.907
08683a1d-8a9b-48cf-938e-4beaec638217	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	WORK	정기 건강검진 항목 추가	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	DONE	검토했어요. 다음 분기에 반영할게요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-30 23:56:13.907	2026-10-24 23:56:13.907	2026-11-01 23:56:13.907
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	t	SYSTEM	사내 도서 구입 지원	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	DECLINED	좋은 의견이에요! 담당 팀과 이야기해 볼게요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-30 17:56:13.907	2026-10-23 23:56:13.907	2026-11-01 23:56:13.907
834d6255-e140-4565-8054-a5526197e4cb	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	t	SYSTEM	사무실 조명 밝기 개선	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	RECEIVED	\N	\N	\N	2026-10-22 23:56:13.907	2026-11-01 23:56:13.907
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	ETC	출퇴근 셔틀 노선 추가	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	REVIEWING	지금은 예산상 보류해요. 다음에 다시 봐요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-30 05:56:13.907	2026-10-21 23:56:13.907	2026-11-01 23:56:13.907
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	t	FACILITY	연차 사용 촉진 캠페인	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	ACCEPTED	검토했어요. 다음 분기에 반영할게요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-29 23:56:13.907	2026-10-20 23:56:13.907	2026-11-01 23:56:13.907
ee3634a3-c37b-4208-be32-02b881d94ab6	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	WORK	팀 회고 주기 정하기	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	DONE	좋은 의견이에요! 담당 팀과 이야기해 볼게요.	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-29 17:56:13.907	2026-10-19 23:56:13.907	2026-11-01 23:56:13.907
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	5c5848001eb7ca3edb5f1d9a	\N	4ed9481a-8c95-43ba-8832-95d3bb44473a	f	FACILITY	신입 온보딩 체크리스트	실제로 불편했던 점을 정리했어요. 다들 공감해 주시면 검토해 볼게요.	DECLINED	반영 완료했어요. 감사합니다!	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-29 11:56:13.907	2026-10-18 23:56:13.907	2026-11-01 23:56:13.907
\.


--
-- Data for Name: SuggestionVote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SuggestionVote" ("suggestionId", "userId", "createdAt") FROM stdin;
cff016d4-6431-46fa-bb25-99827d4d1936	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-11-01 20:10:08.36
cff016d4-6431-46fa-bb25-99827d4d1936	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-28 04:32:54.273
cff016d4-6431-46fa-bb25-99827d4d1936	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	2026-10-28 20:26:14.478
cff016d4-6431-46fa-bb25-99827d4d1936	2c059cd8-7338-4e3c-87c3-54792ec418ac	2026-10-31 04:06:12.266
cff016d4-6431-46fa-bb25-99827d4d1936	4227074a-be01-4a63-8f35-83455ffc653e	2026-10-30 07:14:14.546
cff016d4-6431-46fa-bb25-99827d4d1936	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	2026-10-29 00:16:43.039
cff016d4-6431-46fa-bb25-99827d4d1936	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	2026-10-31 13:48:42.12
cff016d4-6431-46fa-bb25-99827d4d1936	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-11-01 11:31:43.513
cff016d4-6431-46fa-bb25-99827d4d1936	991b2268-d8b8-4127-a4a1-0648da2a3d88	2026-10-29 05:19:03.495
cff016d4-6431-46fa-bb25-99827d4d1936	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-10-29 15:01:43.051
cff016d4-6431-46fa-bb25-99827d4d1936	de04573b-8d39-4c09-9510-054e044ab033	2026-10-29 04:47:13.129
cff016d4-6431-46fa-bb25-99827d4d1936	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	2026-10-29 12:35:19.279
cff016d4-6431-46fa-bb25-99827d4d1936	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-10-28 10:08:41.763
cff016d4-6431-46fa-bb25-99827d4d1936	7c930bc6-1791-42cd-93ec-9ce4499251d8	2026-11-01 21:48:43.199
cff016d4-6431-46fa-bb25-99827d4d1936	415caa6d-731a-4ad9-a412-a928e09264b1	2026-11-01 16:25:19.276
cff016d4-6431-46fa-bb25-99827d4d1936	032b0ff0-cf49-44de-8478-b79536bce329	2026-10-29 03:42:21.758
cff016d4-6431-46fa-bb25-99827d4d1936	33bfc592-2a58-4b7a-8775-03b3c0dac293	2026-10-30 21:57:21.326
cff016d4-6431-46fa-bb25-99827d4d1936	7136bc09-e698-4590-8e22-03332e6a39ad	2026-10-30 05:49:40.577
cff016d4-6431-46fa-bb25-99827d4d1936	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-11-01 20:04:40.53
cff016d4-6431-46fa-bb25-99827d4d1936	e6631004-24e5-4ff6-9dff-c880f38dc227	2026-10-30 02:36:16.248
cff016d4-6431-46fa-bb25-99827d4d1936	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-30 06:57:33.426
cff016d4-6431-46fa-bb25-99827d4d1936	d046a5d5-2a39-420a-995d-ca1ddd237723	2026-11-01 12:00:12.922
2bb61d65-577d-4856-a31a-aa772126e017	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-11-01 02:26:47.358
2bb61d65-577d-4856-a31a-aa772126e017	3ab71819-06a6-48c5-b4ac-1b42894eb74a	2026-10-29 19:24:23.521
2bb61d65-577d-4856-a31a-aa772126e017	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	2026-11-01 05:37:07.818
2bb61d65-577d-4856-a31a-aa772126e017	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-10-31 01:40:17.276
2bb61d65-577d-4856-a31a-aa772126e017	88b3b850-7910-46c4-af8b-ee5d2194d03a	2026-10-30 11:19:29.662
2bb61d65-577d-4856-a31a-aa772126e017	1a398608-3edb-41e6-86dc-e16415bab310	2026-10-29 22:44:06.143
2bb61d65-577d-4856-a31a-aa772126e017	4227074a-be01-4a63-8f35-83455ffc653e	2026-11-01 20:29:01.521
2bb61d65-577d-4856-a31a-aa772126e017	a2da8743-0244-4399-9c94-724c93b7f0b4	2026-10-29 11:24:17.082
2bb61d65-577d-4856-a31a-aa772126e017	b6bedee2-168d-4f81-b03e-b58676faa40d	2026-10-30 01:49:39.287
2bb61d65-577d-4856-a31a-aa772126e017	c3937195-11b4-410f-8069-d7007277b086	2026-10-30 02:05:31.802
2bb61d65-577d-4856-a31a-aa772126e017	10dd366a-993b-4297-9799-efd799518e9c	2026-10-30 11:16:40.478
2bb61d65-577d-4856-a31a-aa772126e017	4ed9481a-8c95-43ba-8832-95d3bb44473a	2026-10-29 07:21:39.501
2bb61d65-577d-4856-a31a-aa772126e017	de04573b-8d39-4c09-9510-054e044ab033	2026-10-29 01:38:50.805
2bb61d65-577d-4856-a31a-aa772126e017	e93bad82-e81d-45d2-8bed-edd34446ee99	2026-10-28 20:47:24.55
2bb61d65-577d-4856-a31a-aa772126e017	7c930bc6-1791-42cd-93ec-9ce4499251d8	2026-10-29 09:40:38.449
2bb61d65-577d-4856-a31a-aa772126e017	032b0ff0-cf49-44de-8478-b79536bce329	2026-11-01 16:55:48.292
2bb61d65-577d-4856-a31a-aa772126e017	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-29 03:24:02.698
2bb61d65-577d-4856-a31a-aa772126e017	e6631004-24e5-4ff6-9dff-c880f38dc227	2026-10-29 11:19:19.136
2bb61d65-577d-4856-a31a-aa772126e017	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-31 05:32:41.831
2bb61d65-577d-4856-a31a-aa772126e017	3bce57f6-f335-4961-9676-11b097eb2194	2026-10-28 08:52:47.947
2bb61d65-577d-4856-a31a-aa772126e017	d046a5d5-2a39-420a-995d-ca1ddd237723	2026-10-28 07:13:13.443
2bb61d65-577d-4856-a31a-aa772126e017	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-31 17:44:42.754
2bb61d65-577d-4856-a31a-aa772126e017	0b28c420-7b85-4fae-ac29-c62074c469c9	2026-10-31 21:46:22.203
2bb61d65-577d-4856-a31a-aa772126e017	f847adce-31e5-4f77-a666-1fa0efdf6374	2026-10-31 00:42:32.835
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	3515b570-e1cd-4f5c-a65d-67f76e560e99	2026-10-28 18:50:05.876
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	2026-10-29 08:14:23.791
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-11-01 13:05:54.251
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	2c059cd8-7338-4e3c-87c3-54792ec418ac	2026-10-29 05:38:33.056
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	4227074a-be01-4a63-8f35-83455ffc653e	2026-10-29 05:07:25.464
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	2026-11-01 02:00:13.822
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	2026-10-30 05:50:25.86
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-10-29 13:45:07.36
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	2026-10-29 21:29:02.473
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-10-31 02:55:15.976
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-10-30 13:02:57.221
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	de04573b-8d39-4c09-9510-054e044ab033	2026-10-31 18:01:10.151
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	2026-10-29 03:32:29.222
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-10-28 05:44:01.049
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-30 02:33:32.187
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	7e6721aa-8ade-49a8-ade5-6bf2586a606c	2026-11-01 01:03:24.996
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 12:08:39.579
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	0b28c420-7b85-4fae-ac29-c62074c469c9	2026-10-31 03:22:58.662
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	607bf496-70ab-4622-89d8-433736254355	2026-10-28 17:01:51.79
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	f847adce-31e5-4f77-a666-1fa0efdf6374	2026-11-01 20:34:52.569
92fa18c3-26e9-4c75-a0a1-5eb6a3cb7055	ff3b091d-f77f-4429-bf27-98eecc84fed3	2026-10-31 02:23:55.112
c0ed3b99-9690-4dd9-984a-3fd2b928be61	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-29 13:50:58.963
c0ed3b99-9690-4dd9-984a-3fd2b928be61	3515b570-e1cd-4f5c-a65d-67f76e560e99	2026-10-31 02:14:26.015
c0ed3b99-9690-4dd9-984a-3fd2b928be61	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-30 05:58:44.947
c0ed3b99-9690-4dd9-984a-3fd2b928be61	b6bedee2-168d-4f81-b03e-b58676faa40d	2026-10-28 02:45:35.516
c0ed3b99-9690-4dd9-984a-3fd2b928be61	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	2026-10-31 19:45:30.741
c0ed3b99-9690-4dd9-984a-3fd2b928be61	56c18c2f-d43a-4f06-92a0-ad785f48d942	2026-10-28 11:23:26.262
c0ed3b99-9690-4dd9-984a-3fd2b928be61	4ed9481a-8c95-43ba-8832-95d3bb44473a	2026-10-28 01:43:52.608
c0ed3b99-9690-4dd9-984a-3fd2b928be61	469fb89a-fe8d-4132-82fb-1117609d0d7b	2026-10-29 05:44:45.19
c0ed3b99-9690-4dd9-984a-3fd2b928be61	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-10-30 01:04:44.715
c0ed3b99-9690-4dd9-984a-3fd2b928be61	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-11-01 03:22:45.83
c0ed3b99-9690-4dd9-984a-3fd2b928be61	de04573b-8d39-4c09-9510-054e044ab033	2026-10-31 13:07:55.049
c0ed3b99-9690-4dd9-984a-3fd2b928be61	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-11-01 11:30:27.084
c0ed3b99-9690-4dd9-984a-3fd2b928be61	7136bc09-e698-4590-8e22-03332e6a39ad	2026-10-31 16:38:47.5
c0ed3b99-9690-4dd9-984a-3fd2b928be61	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-29 16:35:46.263
c0ed3b99-9690-4dd9-984a-3fd2b928be61	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	2026-10-30 20:39:04.627
c0ed3b99-9690-4dd9-984a-3fd2b928be61	607bf496-70ab-4622-89d8-433736254355	2026-11-01 15:47:03.729
c0ed3b99-9690-4dd9-984a-3fd2b928be61	f847adce-31e5-4f77-a666-1fa0efdf6374	2026-10-29 13:00:51.683
c0ed3b99-9690-4dd9-984a-3fd2b928be61	ff3b091d-f77f-4429-bf27-98eecc84fed3	2026-10-31 15:00:25.865
c0ed3b99-9690-4dd9-984a-3fd2b928be61	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-10-30 21:53:01.121
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-10-29 00:30:28.991
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	4227074a-be01-4a63-8f35-83455ffc653e	2026-11-01 13:58:59.846
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	c3937195-11b4-410f-8069-d7007277b086	2026-11-01 00:03:08.514
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	2026-10-28 04:41:36.848
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	26edcc02-bda5-46af-8759-80c4b24d9872	2026-10-29 11:07:07.256
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	469fb89a-fe8d-4132-82fb-1117609d0d7b	2026-11-01 22:29:12.703
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	991b2268-d8b8-4127-a4a1-0648da2a3d88	2026-10-28 11:51:32.913
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-11-01 00:16:13.434
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-31 16:04:45.703
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-30 20:24:13.617
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	3d780ace-7474-43cf-b4b0-10c9c3350615	2026-10-30 13:35:05.898
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	e93bad82-e81d-45d2-8bed-edd34446ee99	2026-10-28 12:48:17.451
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	415caa6d-731a-4ad9-a412-a928e09264b1	2026-10-28 23:51:14.97
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-31 20:35:54.478
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	d046a5d5-2a39-420a-995d-ca1ddd237723	2026-10-28 05:44:07.84
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-31 04:48:22.83
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	607bf496-70ab-4622-89d8-433736254355	2026-10-30 00:39:47.533
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	ff3b091d-f77f-4429-bf27-98eecc84fed3	2026-11-01 22:41:25.933
c6ec0258-a537-4dc7-9ff9-3566b8bc8efa	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-10-28 14:37:45.279
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-30 19:25:31.252
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	2026-11-01 01:48:15.953
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-10-30 17:43:42.424
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	88b3b850-7910-46c4-af8b-ee5d2194d03a	2026-10-30 23:05:34.673
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	1a398608-3edb-41e6-86dc-e16415bab310	2026-10-29 22:46:16.794
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	c3937195-11b4-410f-8069-d7007277b086	2026-10-30 10:55:57.307
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	10dd366a-993b-4297-9799-efd799518e9c	2026-10-30 18:06:38.147
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	2026-11-01 04:46:49.571
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	26edcc02-bda5-46af-8759-80c4b24d9872	2026-10-30 11:46:38.573
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	4ed9481a-8c95-43ba-8832-95d3bb44473a	2026-11-01 08:40:32.113
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	469fb89a-fe8d-4132-82fb-1117609d0d7b	2026-10-28 00:36:02.28
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	991b2268-d8b8-4127-a4a1-0648da2a3d88	2026-10-29 12:54:54.061
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-30 06:10:08.773
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-30 02:59:24.929
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	3d780ace-7474-43cf-b4b0-10c9c3350615	2026-11-01 10:29:32.783
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	7136bc09-e698-4590-8e22-03332e6a39ad	2026-11-01 02:49:25.54
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-28 19:52:06.292
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	e6631004-24e5-4ff6-9dff-c880f38dc227	2026-10-31 12:16:47.605
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	7e6721aa-8ade-49a8-ade5-6bf2586a606c	2026-10-31 20:14:24.855
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	d046a5d5-2a39-420a-995d-ca1ddd237723	2026-10-30 18:56:11.395
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-28 00:29:41.185
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	2026-10-31 04:17:03.282
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	f847adce-31e5-4f77-a666-1fa0efdf6374	2026-10-30 19:51:15.486
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	ff3b091d-f77f-4429-bf27-98eecc84fed3	2026-10-29 12:45:07.521
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-10-30 15:42:45.778
36a1f165-bfd8-49cd-b974-9a9a9bc7238a	7ecdb42f-2194-45b1-8f4b-f399996af2b8	2026-10-31 14:30:34.156
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-29 02:53:58.711
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-10-30 06:45:47.758
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	2026-11-01 21:58:07.994
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	2026-11-01 11:45:53.515
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	b6bedee2-168d-4f81-b03e-b58676faa40d	2026-11-01 18:11:55.779
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	c3937195-11b4-410f-8069-d7007277b086	2026-10-28 21:49:07.773
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	469fb89a-fe8d-4132-82fb-1117609d0d7b	2026-10-30 00:44:49.618
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-10-29 09:09:59.568
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-31 20:49:54.215
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	de04573b-8d39-4c09-9510-054e044ab033	2026-10-30 18:24:35.237
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	2026-10-30 01:24:40.974
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-10-28 23:08:08.058
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-29 22:43:04.76
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 14:20:31.672
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	032b0ff0-cf49-44de-8478-b79536bce329	2026-10-28 22:34:50.532
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	7136bc09-e698-4590-8e22-03332e6a39ad	2026-10-30 21:35:48.982
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-11-01 14:55:10.041
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 14:30:17.234
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	0b28c420-7b85-4fae-ac29-c62074c469c9	2026-10-30 02:24:56.031
12fb6a1a-0b96-4419-8e5a-3c155e5ecd04	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	2026-10-28 05:23:56.855
08683a1d-8a9b-48cf-938e-4beaec638217	4c991d09-c69a-4674-83ac-f21125d5e2e5	2026-10-30 18:55:53
08683a1d-8a9b-48cf-938e-4beaec638217	3ab71819-06a6-48c5-b4ac-1b42894eb74a	2026-11-01 13:41:58.597
08683a1d-8a9b-48cf-938e-4beaec638217	1a398608-3edb-41e6-86dc-e16415bab310	2026-10-29 05:39:38.07
08683a1d-8a9b-48cf-938e-4beaec638217	a2da8743-0244-4399-9c94-724c93b7f0b4	2026-10-31 00:44:54.986
08683a1d-8a9b-48cf-938e-4beaec638217	26edcc02-bda5-46af-8759-80c4b24d9872	2026-11-01 18:19:43.731
08683a1d-8a9b-48cf-938e-4beaec638217	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-11-01 23:14:05.502
08683a1d-8a9b-48cf-938e-4beaec638217	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-31 03:52:54.24
08683a1d-8a9b-48cf-938e-4beaec638217	3d780ace-7474-43cf-b4b0-10c9c3350615	2026-10-30 04:34:01.901
08683a1d-8a9b-48cf-938e-4beaec638217	032b0ff0-cf49-44de-8478-b79536bce329	2026-11-01 04:58:18.969
08683a1d-8a9b-48cf-938e-4beaec638217	7136bc09-e698-4590-8e22-03332e6a39ad	2026-10-29 14:18:34.294
08683a1d-8a9b-48cf-938e-4beaec638217	e6631004-24e5-4ff6-9dff-c880f38dc227	2026-10-28 22:59:23.136
08683a1d-8a9b-48cf-938e-4beaec638217	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	2026-10-30 06:45:45.538
08683a1d-8a9b-48cf-938e-4beaec638217	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-10-28 17:48:42.479
08683a1d-8a9b-48cf-938e-4beaec638217	7ecdb42f-2194-45b1-8f4b-f399996af2b8	2026-11-01 12:52:27.696
ee3634a3-c37b-4208-be32-02b881d94ab6	3ab71819-06a6-48c5-b4ac-1b42894eb74a	2026-11-01 23:53:23.648
ee3634a3-c37b-4208-be32-02b881d94ab6	a2da8743-0244-4399-9c94-724c93b7f0b4	2026-10-30 11:16:52.163
ee3634a3-c37b-4208-be32-02b881d94ab6	c3937195-11b4-410f-8069-d7007277b086	2026-10-29 04:01:52.696
ee3634a3-c37b-4208-be32-02b881d94ab6	10dd366a-993b-4297-9799-efd799518e9c	2026-10-30 21:56:53.474
ee3634a3-c37b-4208-be32-02b881d94ab6	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-10-29 12:14:50.314
ee3634a3-c37b-4208-be32-02b881d94ab6	415caa6d-731a-4ad9-a412-a928e09264b1	2026-10-30 00:10:01.327
ee3634a3-c37b-4208-be32-02b881d94ab6	7136bc09-e698-4590-8e22-03332e6a39ad	2026-11-01 08:58:05.851
ee3634a3-c37b-4208-be32-02b881d94ab6	e6631004-24e5-4ff6-9dff-c880f38dc227	2026-10-28 02:54:36.243
ee3634a3-c37b-4208-be32-02b881d94ab6	7e6721aa-8ade-49a8-ade5-6bf2586a606c	2026-11-01 13:15:50.673
ee3634a3-c37b-4208-be32-02b881d94ab6	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-10-28 18:05:27.071
ee3634a3-c37b-4208-be32-02b881d94ab6	0b28c420-7b85-4fae-ac29-c62074c469c9	2026-10-30 03:19:06.267
ee3634a3-c37b-4208-be32-02b881d94ab6	607bf496-70ab-4622-89d8-433736254355	2026-10-29 19:08:41.637
ee3634a3-c37b-4208-be32-02b881d94ab6	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-11-01 19:47:36.023
3ab06475-a44e-4d78-9b42-844b50f5a33d	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-31 12:16:33.399
3ab06475-a44e-4d78-9b42-844b50f5a33d	3515b570-e1cd-4f5c-a65d-67f76e560e99	2026-10-31 03:00:07.123
3ab06475-a44e-4d78-9b42-844b50f5a33d	88b3b850-7910-46c4-af8b-ee5d2194d03a	2026-10-30 11:24:34.653
3ab06475-a44e-4d78-9b42-844b50f5a33d	2c059cd8-7338-4e3c-87c3-54792ec418ac	2026-11-01 09:42:44.35
3ab06475-a44e-4d78-9b42-844b50f5a33d	0689dbc7-0ec7-42ef-8625-73fea7a406ce	2026-11-01 21:21:31.422
3ab06475-a44e-4d78-9b42-844b50f5a33d	c3937195-11b4-410f-8069-d7007277b086	2026-10-30 00:07:45.13
3ab06475-a44e-4d78-9b42-844b50f5a33d	10dd366a-993b-4297-9799-efd799518e9c	2026-10-28 09:48:23.58
3ab06475-a44e-4d78-9b42-844b50f5a33d	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	2026-10-31 04:28:19.822
3ab06475-a44e-4d78-9b42-844b50f5a33d	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	2026-10-28 20:22:16.692
3ab06475-a44e-4d78-9b42-844b50f5a33d	26edcc02-bda5-46af-8759-80c4b24d9872	2026-10-30 18:40:01.309
3ab06475-a44e-4d78-9b42-844b50f5a33d	de04573b-8d39-4c09-9510-054e044ab033	2026-10-28 05:11:46.933
3ab06475-a44e-4d78-9b42-844b50f5a33d	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-10-31 07:13:14.795
3ab06475-a44e-4d78-9b42-844b50f5a33d	e93bad82-e81d-45d2-8bed-edd34446ee99	2026-10-30 21:54:49.914
3ab06475-a44e-4d78-9b42-844b50f5a33d	415caa6d-731a-4ad9-a412-a928e09264b1	2026-10-31 11:28:12.573
3ab06475-a44e-4d78-9b42-844b50f5a33d	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-10-29 20:56:00.28
3ab06475-a44e-4d78-9b42-844b50f5a33d	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-28 13:45:03.136
3ab06475-a44e-4d78-9b42-844b50f5a33d	7ecdb42f-2194-45b1-8f4b-f399996af2b8	2026-11-01 11:33:53.74
834d6255-e140-4565-8054-a5526197e4cb	3515b570-e1cd-4f5c-a65d-67f76e560e99	2026-10-31 07:48:20.107
834d6255-e140-4565-8054-a5526197e4cb	3ab71819-06a6-48c5-b4ac-1b42894eb74a	2026-10-31 23:03:31.109
834d6255-e140-4565-8054-a5526197e4cb	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	2026-10-28 00:47:24.293
834d6255-e140-4565-8054-a5526197e4cb	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-11-01 06:24:31.489
834d6255-e140-4565-8054-a5526197e4cb	2c059cd8-7338-4e3c-87c3-54792ec418ac	2026-10-31 01:17:58.444
834d6255-e140-4565-8054-a5526197e4cb	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	2026-10-28 16:37:01.865
834d6255-e140-4565-8054-a5526197e4cb	b6bedee2-168d-4f81-b03e-b58676faa40d	2026-10-30 14:00:28.818
834d6255-e140-4565-8054-a5526197e4cb	c3937195-11b4-410f-8069-d7007277b086	2026-10-28 05:37:57.504
834d6255-e140-4565-8054-a5526197e4cb	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	2026-11-01 17:16:09.008
834d6255-e140-4565-8054-a5526197e4cb	56c18c2f-d43a-4f06-92a0-ad785f48d942	2026-10-31 18:28:29.547
834d6255-e140-4565-8054-a5526197e4cb	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-10-28 23:38:32.248
834d6255-e140-4565-8054-a5526197e4cb	469fb89a-fe8d-4132-82fb-1117609d0d7b	2026-10-30 21:49:58.472
834d6255-e140-4565-8054-a5526197e4cb	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-11-01 09:55:19.923
834d6255-e140-4565-8054-a5526197e4cb	de04573b-8d39-4c09-9510-054e044ab033	2026-10-28 19:57:08.366
834d6255-e140-4565-8054-a5526197e4cb	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	2026-10-30 01:26:41.957
834d6255-e140-4565-8054-a5526197e4cb	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-10-31 15:19:08.765
834d6255-e140-4565-8054-a5526197e4cb	3d780ace-7474-43cf-b4b0-10c9c3350615	2026-10-31 10:16:52.17
834d6255-e140-4565-8054-a5526197e4cb	7c930bc6-1791-42cd-93ec-9ce4499251d8	2026-10-29 07:13:58.524
834d6255-e140-4565-8054-a5526197e4cb	7136bc09-e698-4590-8e22-03332e6a39ad	2026-10-28 06:35:10.561
834d6255-e140-4565-8054-a5526197e4cb	0b28c420-7b85-4fae-ac29-c62074c469c9	2026-10-30 00:28:41.065
834d6255-e140-4565-8054-a5526197e4cb	607bf496-70ab-4622-89d8-433736254355	2026-10-28 07:00:27.523
bcea536d-b301-4203-88bc-e931a2a79db5	4c991d09-c69a-4674-83ac-f21125d5e2e5	2026-10-31 00:52:32.042
bcea536d-b301-4203-88bc-e931a2a79db5	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	2026-11-01 21:24:46.538
bcea536d-b301-4203-88bc-e931a2a79db5	88b3b850-7910-46c4-af8b-ee5d2194d03a	2026-11-01 01:02:10.054
bcea536d-b301-4203-88bc-e931a2a79db5	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	2026-11-01 07:09:23.071
bcea536d-b301-4203-88bc-e931a2a79db5	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	2026-10-31 07:17:54.546
bcea536d-b301-4203-88bc-e931a2a79db5	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	2026-10-28 09:07:16.812
bcea536d-b301-4203-88bc-e931a2a79db5	26edcc02-bda5-46af-8759-80c4b24d9872	2026-10-31 05:02:25.876
bcea536d-b301-4203-88bc-e931a2a79db5	4ed9481a-8c95-43ba-8832-95d3bb44473a	2026-11-01 22:40:23.311
bcea536d-b301-4203-88bc-e931a2a79db5	991b2268-d8b8-4127-a4a1-0648da2a3d88	2026-10-31 20:20:44.701
bcea536d-b301-4203-88bc-e931a2a79db5	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-11-01 09:51:23.907
bcea536d-b301-4203-88bc-e931a2a79db5	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-31 09:02:23.808
bcea536d-b301-4203-88bc-e931a2a79db5	3d780ace-7474-43cf-b4b0-10c9c3350615	2026-11-01 15:59:44.154
bcea536d-b301-4203-88bc-e931a2a79db5	7136bc09-e698-4590-8e22-03332e6a39ad	2026-11-01 11:34:41.411
bcea536d-b301-4203-88bc-e931a2a79db5	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-28 23:03:32.819
bcea536d-b301-4203-88bc-e931a2a79db5	e6631004-24e5-4ff6-9dff-c880f38dc227	2026-10-30 03:49:26.769
bcea536d-b301-4203-88bc-e931a2a79db5	7c671f41-3fd5-4aaf-832e-97e6fe96810c	2026-11-01 03:25:56.817
bcea536d-b301-4203-88bc-e931a2a79db5	3bce57f6-f335-4961-9676-11b097eb2194	2026-10-28 19:28:01.778
bcea536d-b301-4203-88bc-e931a2a79db5	7e6721aa-8ade-49a8-ade5-6bf2586a606c	2026-10-31 13:18:21.501
bcea536d-b301-4203-88bc-e931a2a79db5	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-29 20:57:57.461
bcea536d-b301-4203-88bc-e931a2a79db5	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-10-29 11:06:55.057
bcea536d-b301-4203-88bc-e931a2a79db5	7ecdb42f-2194-45b1-8f4b-f399996af2b8	2026-11-01 03:08:13.119
cf072df9-3068-4916-b5fc-b28136274a8f	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-11-01 15:47:49.872
cf072df9-3068-4916-b5fc-b28136274a8f	88b3b850-7910-46c4-af8b-ee5d2194d03a	2026-10-28 05:56:22.374
cf072df9-3068-4916-b5fc-b28136274a8f	b6bedee2-168d-4f81-b03e-b58676faa40d	2026-10-30 13:45:03.105
cf072df9-3068-4916-b5fc-b28136274a8f	4ed9481a-8c95-43ba-8832-95d3bb44473a	2026-10-28 19:19:02.871
cf072df9-3068-4916-b5fc-b28136274a8f	616d01b4-afce-43ed-b57d-caf88803fe9e	2026-10-28 13:26:26.328
cf072df9-3068-4916-b5fc-b28136274a8f	469fb89a-fe8d-4132-82fb-1117609d0d7b	2026-10-29 18:29:11.95
cf072df9-3068-4916-b5fc-b28136274a8f	991b2268-d8b8-4127-a4a1-0648da2a3d88	2026-10-28 03:59:06.696
cf072df9-3068-4916-b5fc-b28136274a8f	f4dc3955-250f-4515-a453-44c3c3f9838d	2026-11-01 03:30:23.011
cf072df9-3068-4916-b5fc-b28136274a8f	3eecafc3-7b6d-4409-a8cf-101d10139dcc	2026-10-31 01:14:15.554
cf072df9-3068-4916-b5fc-b28136274a8f	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	2026-10-28 09:31:45.939
cf072df9-3068-4916-b5fc-b28136274a8f	7c930bc6-1791-42cd-93ec-9ce4499251d8	2026-10-31 15:14:29.032
cf072df9-3068-4916-b5fc-b28136274a8f	032b0ff0-cf49-44de-8478-b79536bce329	2026-10-29 22:38:50.801
cf072df9-3068-4916-b5fc-b28136274a8f	fc0e3f6e-b17f-4350-ba79-19873935640c	2026-10-28 02:39:23.653
cf072df9-3068-4916-b5fc-b28136274a8f	c55107c7-b1e6-48dc-be93-f0e845acbdce	2026-11-01 05:48:22.477
cf072df9-3068-4916-b5fc-b28136274a8f	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-10-29 06:36:57.438
cf072df9-3068-4916-b5fc-b28136274a8f	7ecdb42f-2194-45b1-8f4b-f399996af2b8	2026-11-01 16:09:53.088
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	2026-10-30 00:34:09.342
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	3515b570-e1cd-4f5c-a65d-67f76e560e99	2026-10-29 09:17:10.502
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	aa23cb8d-261f-4a2e-9bd2-771759659a4c	2026-11-01 07:59:53.717
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	2026-10-29 19:59:11.169
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	4227074a-be01-4a63-8f35-83455ffc653e	2026-10-31 08:37:47.534
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	2026-10-28 06:54:07.793
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	a2da8743-0244-4399-9c94-724c93b7f0b4	2026-10-31 21:13:26.979
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	c3937195-11b4-410f-8069-d7007277b086	2026-11-01 05:14:06.523
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	2026-10-29 09:32:37.86
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	2026-10-28 10:25:53.777
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	26edcc02-bda5-46af-8759-80c4b24d9872	2026-10-28 12:30:57.895
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	4ed9481a-8c95-43ba-8832-95d3bb44473a	2026-10-30 09:29:59.382
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	c3108591-b396-4f8e-b3f7-73ba302fde9f	2026-10-28 10:03:25.226
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	e93bad82-e81d-45d2-8bed-edd34446ee99	2026-10-31 09:10:57.583
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	415caa6d-731a-4ad9-a412-a928e09264b1	2026-10-28 13:20:21.867
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	c6506cc9-39be-4912-ad62-b57a3242549c	2026-10-28 21:23:13.118
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	032b0ff0-cf49-44de-8478-b79536bce329	2026-10-31 23:59:06.413
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	a1bbc3d6-9b5b-48a2-838c-4496457de48c	2026-10-31 12:26:15.208
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	3bce57f6-f335-4961-9676-11b097eb2194	2026-11-01 06:51:44.623
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	7e6721aa-8ade-49a8-ade5-6bf2586a606c	2026-10-29 15:30:17.154
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	607bf496-70ab-4622-89d8-433736254355	2026-10-30 23:04:25.01
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	ff3b091d-f77f-4429-bf27-98eecc84fed3	2026-11-01 03:17:18.945
7d66eb9b-2fac-4a0a-b91d-89fbcc460ccd	1b47bac3-4ea3-4b82-9631-39730990e8fb	2026-10-29 05:08:12.49
\.


--
-- Data for Name: Survey; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Survey" (id, "groupId", "authorId", title, description, anonymous, "launchMode", status, "rejectReason", "launchAt", "endsAt", "startedAt", "closedAt", "createdAt") FROM stdin;
7df74954-e7f7-4f24-bbc4-172a8fa39505	5c5848001eb7ca3edb5f1d9a	4227074a-be01-4a63-8f35-83455ffc653e	사내 복지 만족도	가볍게 참여해 주세요 🙂	t	MANUAL	CLOSED	\N	\N	2026-10-28 09:23:00.295	2026-10-27 09:23:00.295	2026-10-28 09:23:00.295	2026-10-26 09:23:00.295
5a9b5e1f-34c0-47ee-b339-9ebfec9e9e40	5c5848001eb7ca3edb5f1d9a	e93bad82-e81d-45d2-8bed-edd34446ee99	휴게 공간 개선 아이디어	가볍게 참여해 주세요 🙂	t	MANUAL	PENDING	\N	\N	\N	\N	\N	2026-10-26 09:23:00.295
3d9f822d-cde5-411f-bbef-07f93b90ab84	5c5848001eb7ca3edb5f1d9a	d046a5d5-2a39-420a-995d-ca1ddd237723	다음 워크숍 장소	가볍게 참여해 주세요 🙂	t	RANDOM	ACTIVE	\N	2026-10-30 09:23:00.295	2026-11-04 02:14:24.558	2026-11-02 02:14:24.558	\N	2026-10-26 09:23:00.295
b05b1480-4d22-4e58-af6b-09bbbb8a5adb	5c5848001eb7ca3edb5f1d9a	1b47bac3-4ea3-4b82-9631-39730990e8fb	점심 메뉴 취향 조사	가볍게 참여해 주세요 🙂	t	MANUAL	CLOSED	\N	\N	2026-10-30 09:23:00.295	2026-10-27 09:23:00.295	2026-11-02 02:14:24.558	2026-10-26 09:23:00.295
\.


--
-- Data for Name: SurveyQuestion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SurveyQuestion" (id, "surveyId", "position", text, type, options) FROM stdin;
00523c38-3b49-4d94-936d-3f85040a086e	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	1	가장 마음에 드는 항목은?	SINGLE	["A안", "B안", "C안"]
6e439664-8024-43b3-985b-497554ba20c1	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	2	해당되는 것을 모두 고르세요	MULTI	["가", "나", "다", "라"]
ee99d9d4-fa4f-441e-8af1-d2e25edb5a00	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	3	전반적인 만족도는?	RATING	\N
8f0e16b6-5699-45a8-9596-806a52bbe571	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	4	자유롭게 의견을 남겨 주세요	TEXT	\N
0c0a9fed-5705-493f-8244-2be1df08079e	7df74954-e7f7-4f24-bbc4-172a8fa39505	1	가장 마음에 드는 항목은?	SINGLE	["A안", "B안", "C안"]
2271b4d9-6229-440f-bc02-0c1a51f21154	7df74954-e7f7-4f24-bbc4-172a8fa39505	2	해당되는 것을 모두 고르세요	MULTI	["가", "나", "다", "라"]
5b8db1dd-f8d6-419c-86f7-bf66baca33cb	7df74954-e7f7-4f24-bbc4-172a8fa39505	3	전반적인 만족도는?	RATING	\N
41375b63-29b3-4637-a6ec-4ece3121dbdf	7df74954-e7f7-4f24-bbc4-172a8fa39505	4	자유롭게 의견을 남겨 주세요	TEXT	\N
1efa5f4b-9828-44db-9bb7-17bcc14535e2	3d9f822d-cde5-411f-bbef-07f93b90ab84	1	가장 마음에 드는 항목은?	SINGLE	["A안", "B안", "C안"]
4a9e3ee0-a403-423d-ac7f-40f8de87fcd8	3d9f822d-cde5-411f-bbef-07f93b90ab84	2	해당되는 것을 모두 고르세요	MULTI	["가", "나", "다", "라"]
b0005499-12b8-4cc8-98c1-2bcbb231e923	3d9f822d-cde5-411f-bbef-07f93b90ab84	3	전반적인 만족도는?	RATING	\N
80c9d5fb-c676-48d7-a78a-98179a805c1d	3d9f822d-cde5-411f-bbef-07f93b90ab84	4	자유롭게 의견을 남겨 주세요	TEXT	\N
3dc6aa7b-df6d-4a73-8de5-61094c3725f9	5a9b5e1f-34c0-47ee-b339-9ebfec9e9e40	1	가장 마음에 드는 항목은?	SINGLE	["A안", "B안", "C안"]
e5d2634f-19da-4e82-9757-619c85e3ff04	5a9b5e1f-34c0-47ee-b339-9ebfec9e9e40	2	해당되는 것을 모두 고르세요	MULTI	["가", "나", "다", "라"]
24359273-4bab-40cf-ac05-5a6f60ef373d	5a9b5e1f-34c0-47ee-b339-9ebfec9e9e40	3	전반적인 만족도는?	RATING	\N
22cf5f58-b6dd-411e-9c42-447cfe6d8f4e	5a9b5e1f-34c0-47ee-b339-9ebfec9e9e40	4	자유롭게 의견을 남겨 주세요	TEXT	\N
\.


--
-- Data for Name: SurveyResponse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SurveyResponse" (id, "surveyId", "userId", answers, "createdAt") FROM stdin;
8bd508d3-33eb-4a09-a12c-5291f3df14d1	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-27 11:31:08.677
bcb099ac-ad3b-4af7-840f-d1ae32defd08	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	4c991d09-c69a-4674-83ac-f21125d5e2e5	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 4}	2026-10-27 15:59:58.05
226d8104-4b69-4d5b-8a35-453b422af4f0	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	3515b570-e1cd-4f5c-a65d-67f76e560e99	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "지금도 충분해요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-27 20:03:36.872
9f76329e-8d67-4c51-b1f4-0e1ad8c67d12	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	aa23cb8d-261f-4a2e-9bd2-771759659a4c	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-28 17:23:08.63
8ea49f95-0343-490f-9e0c-3568eeab3016	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 4}	2026-10-29 09:03:22.832
5f41116d-9114-4c24-9c64-ec5727a4ad72	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	1a398608-3edb-41e6-86dc-e16415bab310	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-28 16:48:22.292
590d17de-8416-4441-b580-d5c620f8fa92	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	4227074a-be01-4a63-8f35-83455ffc653e	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-27 13:47:48.239
0a5ddba7-47e3-4a13-8cf3-eb87a415fca1	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-27 20:44:05.563
219b139d-6078-4203-b24d-fc820e376513	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	0689dbc7-0ec7-42ef-8625-73fea7a406ce	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-29 05:33:16.331
7d1cdba7-8b29-40cd-9d79-82d51707e69c	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	a2da8743-0244-4399-9c94-724c93b7f0b4	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-29 06:25:02.164
835417cb-0c72-4982-baf4-2978387865a3	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	b6bedee2-168d-4f81-b03e-b58676faa40d	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 5}	2026-10-29 00:38:02.365
79bc0ea0-a772-4626-801e-0089237db79c	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	10dd366a-993b-4297-9799-efd799518e9c	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "지금도 충분해요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 4}	2026-10-28 16:34:11.812
c72ad025-7e6b-4d45-933e-6260438d7007	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-28 12:09:18.907
3cd5558e-26d0-4063-a876-103c42332c9c	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	56c18c2f-d43a-4f06-92a0-ad785f48d942	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 5}	2026-10-27 09:34:34.663
ebb618f7-9d4a-4334-bce7-7a0b1a54d55b	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	26edcc02-bda5-46af-8759-80c4b24d9872	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-28 07:38:42.478
84e64793-4027-4628-9256-afbdb028e118	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	616d01b4-afce-43ed-b57d-caf88803fe9e	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-28 06:55:54.452
18e6e61b-908a-4617-99d4-aa740571fdf9	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	469fb89a-fe8d-4132-82fb-1117609d0d7b	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-27 12:02:34.767
bed76201-83df-47b5-9a83-386e36d83ab5	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	f4dc3955-250f-4515-a453-44c3c3f9838d	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 4}	2026-10-27 13:41:38.259
7e605aa2-0abc-45e9-ac80-21acad0c5c33	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	de04573b-8d39-4c09-9510-054e044ab033	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-28 07:27:38.747
71232402-1ae3-4ec7-a39d-8591eda87734	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 5}	2026-10-28 23:11:09.067
c42770ea-fdf0-4f9d-867b-573ae137fd8d	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	c3108591-b396-4f8e-b3f7-73ba302fde9f	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-27 09:27:41.515
dd13ed09-a79b-4123-b4fa-57b36415976d	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	3d780ace-7474-43cf-b4b0-10c9c3350615	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-28 17:32:28.453
822ef8c0-ce84-4f90-8354-3e4ad9c873c9	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	e93bad82-e81d-45d2-8bed-edd34446ee99	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-28 04:54:18.795
ffee0c6c-624d-4f1b-a3f2-07d6678ae3ab	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	7c930bc6-1791-42cd-93ec-9ce4499251d8	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 5}	2026-10-27 23:31:24.364
cd6c2b69-d08e-49cb-9d62-b92fd3470468	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	c6506cc9-39be-4912-ad62-b57a3242549c	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-29 07:13:31.478
d6c06fff-1a79-4862-bff6-1069a4e26dd4	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	032b0ff0-cf49-44de-8478-b79536bce329	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "지금도 충분해요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-29 04:23:30.838
2fed825b-95e4-4853-aff7-2c9732b2b48d	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	33bfc592-2a58-4b7a-8775-03b3c0dac293	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "지금도 충분해요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-28 10:49:14.395
45155c23-388e-41d0-a715-f9f5eff62865	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	7136bc09-e698-4590-8e22-03332e6a39ad	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-27 20:56:25.835
52751223-3a8a-4dcb-bdb5-c53a4ee71487	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	a1bbc3d6-9b5b-48a2-838c-4496457de48c	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 5}	2026-10-28 17:14:25.081
63ac6b7a-7834-4318-af25-e9413de0856b	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	7c671f41-3fd5-4aaf-832e-97e6fe96810c	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-28 07:37:26.32
294aa3fa-f14c-4c94-a982-873e06ac1825	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	3bce57f6-f335-4961-9676-11b097eb2194	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-27 16:11:32.516
5e633daf-8991-451a-9151-c5142f11ddec	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	7e6721aa-8ade-49a8-ade5-6bf2586a606c	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-28 06:51:47.117
9b5b92b7-be56-439d-978f-16f774c348a4	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	d046a5d5-2a39-420a-995d-ca1ddd237723	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "좋아요!", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-28 22:06:11.794
1d289783-fe9c-4da6-9074-a4fd116dbf81	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	fc0e3f6e-b17f-4350-ba79-19873935640c	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-29 01:41:45.927
9f8d2bb8-8354-4e56-b840-5b161ffe78fb	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	0b28c420-7b85-4fae-ac29-c62074c469c9	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 3}	2026-10-29 05:18:33.934
4fa6f6b8-24e4-4f2a-8fce-fc71e4eeeaf8	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	{"00523c38-3b49-4d94-936d-3f85040a086e": "B안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-27 11:10:01.569
8861b8b8-bb89-45cb-a47c-df17cf1fce0e	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	607bf496-70ab-4622-89d8-433736254355	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "자주 해주세요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 2}	2026-10-28 22:01:58.725
f7d3e02b-2208-4fb3-b6a6-33e55d790561	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	f847adce-31e5-4f77-a666-1fa0efdf6374	{"00523c38-3b49-4d94-936d-3f85040a086e": "A안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "다"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-27 21:20:17.562
f02c2d38-7faf-444c-ae07-fb7ff9708a23	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	ff3b091d-f77f-4429-bf27-98eecc84fed3	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "라"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-29 08:33:40.345
88ef66d7-2463-4686-8c7e-7448acc99d5d	b05b1480-4d22-4e58-af6b-09bbbb8a5adb	7ecdb42f-2194-45b1-8f4b-f399996af2b8	{"00523c38-3b49-4d94-936d-3f85040a086e": "C안", "6e439664-8024-43b3-985b-497554ba20c1": ["가", "나"], "8f0e16b6-5699-45a8-9596-806a52bbe571": "더 다양했으면 좋겠어요", "ee99d9d4-fa4f-441e-8af1-d2e25edb5a00": 1}	2026-10-28 23:56:10.755
f32a7b4d-bbad-4a38-a876-22cc299a9bc4	7df74954-e7f7-4f24-bbc4-172a8fa39505	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-27 20:00:30.848
1bcefd62-5843-4c95-8a69-da134be0d708	7df74954-e7f7-4f24-bbc4-172a8fa39505	4c991d09-c69a-4674-83ac-f21125d5e2e5	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-28 04:05:01.44
0c3eb046-e717-4e4f-9832-74d13250333e	7df74954-e7f7-4f24-bbc4-172a8fa39505	3515b570-e1cd-4f5c-a65d-67f76e560e99	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-27 18:52:16.221
695263ed-49fe-4f66-995d-103af87b6c5e	7df74954-e7f7-4f24-bbc4-172a8fa39505	aa23cb8d-261f-4a2e-9bd2-771759659a4c	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-27 18:08:45.248
c27ea270-5a32-4958-808a-c850bb642543	7df74954-e7f7-4f24-bbc4-172a8fa39505	3ab71819-06a6-48c5-b4ac-1b42894eb74a	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-27 15:24:13.51
4213de01-ddb9-421b-af53-b189b533e503	7df74954-e7f7-4f24-bbc4-172a8fa39505	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 2}	2026-10-27 13:14:24.447
c050a481-9edf-4792-99b8-4a46264c4c8c	7df74954-e7f7-4f24-bbc4-172a8fa39505	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-29 03:20:18.507
7e4706d3-7145-4ff0-9952-1d40a918533c	7df74954-e7f7-4f24-bbc4-172a8fa39505	88b3b850-7910-46c4-af8b-ee5d2194d03a	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-29 08:18:00.481
8ff7c744-6a3b-4db2-aeb6-3a7960afa418	7df74954-e7f7-4f24-bbc4-172a8fa39505	1a398608-3edb-41e6-86dc-e16415bab310	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-28 00:55:36.099
6e9a526a-dbc8-451b-8eee-8f7b68680136	7df74954-e7f7-4f24-bbc4-172a8fa39505	2c059cd8-7338-4e3c-87c3-54792ec418ac	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-28 05:37:08.054
bf89a401-4c33-4a70-800c-5564f1f7fc64	7df74954-e7f7-4f24-bbc4-172a8fa39505	4227074a-be01-4a63-8f35-83455ffc653e	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-27 23:09:34.844
b03b5ba6-ef8c-4d70-a8b5-eb42a54ee880	7df74954-e7f7-4f24-bbc4-172a8fa39505	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-27 22:47:00.71
2804c64b-a142-49c6-8539-1172e1c6c4aa	7df74954-e7f7-4f24-bbc4-172a8fa39505	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-28 02:38:35.621
4cf6992c-c703-4fc8-b5cb-c1a4f523d0ef	7df74954-e7f7-4f24-bbc4-172a8fa39505	0689dbc7-0ec7-42ef-8625-73fea7a406ce	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-28 02:33:45.608
8f63022a-7bc4-4e04-aa67-8c47871230c1	7df74954-e7f7-4f24-bbc4-172a8fa39505	a2da8743-0244-4399-9c94-724c93b7f0b4	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-28 22:04:40.42
52605606-45d5-4f5c-8e2e-9684ad2fe59a	7df74954-e7f7-4f24-bbc4-172a8fa39505	b6bedee2-168d-4f81-b03e-b58676faa40d	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-29 02:20:47.581
e5d5d12b-b41d-415c-91df-7029c7e213de	7df74954-e7f7-4f24-bbc4-172a8fa39505	10dd366a-993b-4297-9799-efd799518e9c	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 2}	2026-10-28 01:09:43.194
2af7839e-c7b3-4f80-aa17-330eeaf0e65f	7df74954-e7f7-4f24-bbc4-172a8fa39505	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-28 07:20:13.412
bc85ffda-25a8-4179-a492-c6b162f3e6e6	7df74954-e7f7-4f24-bbc4-172a8fa39505	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-27 21:13:46.761
e1fd3503-29a6-4c06-9a0a-3c4b51501598	7df74954-e7f7-4f24-bbc4-172a8fa39505	26edcc02-bda5-46af-8759-80c4b24d9872	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-28 10:14:51.361
9874accd-a061-4965-a6c7-f1113f667409	7df74954-e7f7-4f24-bbc4-172a8fa39505	4ed9481a-8c95-43ba-8832-95d3bb44473a	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-28 00:00:41.178
ceb52beb-9c20-4bfe-9469-2b92a4e21238	7df74954-e7f7-4f24-bbc4-172a8fa39505	f4dc3955-250f-4515-a453-44c3c3f9838d	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-28 02:47:36.867
7c05fc8b-73a1-466a-82e2-f35792b9d1d5	7df74954-e7f7-4f24-bbc4-172a8fa39505	3eecafc3-7b6d-4409-a8cf-101d10139dcc	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-29 06:06:11.011
d3704e26-79a0-44b0-a558-24da1bd5ab82	7df74954-e7f7-4f24-bbc4-172a8fa39505	de04573b-8d39-4c09-9510-054e044ab033	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-28 14:23:12.911
934839e6-2f08-41a3-bb7f-e8b9630e02e1	7df74954-e7f7-4f24-bbc4-172a8fa39505	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-29 02:37:39.037
58a72bae-0ab9-4727-82b4-80280bc88b7a	7df74954-e7f7-4f24-bbc4-172a8fa39505	c3108591-b396-4f8e-b3f7-73ba302fde9f	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-29 03:48:11.246
df8803d1-5e66-4b10-bbb2-80e67a0241ce	7df74954-e7f7-4f24-bbc4-172a8fa39505	3d780ace-7474-43cf-b4b0-10c9c3350615	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-28 03:51:41.563
dfd6e3a9-23d6-499e-8433-87b91fc44b7b	7df74954-e7f7-4f24-bbc4-172a8fa39505	e93bad82-e81d-45d2-8bed-edd34446ee99	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 2}	2026-10-29 00:15:31.745
401ac935-9771-4534-b2c9-1d5606f5eb85	7df74954-e7f7-4f24-bbc4-172a8fa39505	415caa6d-731a-4ad9-a412-a928e09264b1	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 2}	2026-10-28 13:20:26.457
5647b925-333e-4aff-8ec4-81a841c541f4	7df74954-e7f7-4f24-bbc4-172a8fa39505	c6506cc9-39be-4912-ad62-b57a3242549c	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-29 03:01:16.259
c13f3022-7142-4d70-ab3f-f619edcb3b53	7df74954-e7f7-4f24-bbc4-172a8fa39505	032b0ff0-cf49-44de-8478-b79536bce329	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-28 09:39:30.632
3ec65ce2-99e8-4c7c-b65f-ea4558906d7a	7df74954-e7f7-4f24-bbc4-172a8fa39505	33bfc592-2a58-4b7a-8775-03b3c0dac293	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-28 08:51:59.756
279c517d-7083-4632-9820-2b1bf13d54b7	7df74954-e7f7-4f24-bbc4-172a8fa39505	7136bc09-e698-4590-8e22-03332e6a39ad	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-27 17:09:59.323
68809ddb-2ae5-4258-975d-e5e54d00be60	7df74954-e7f7-4f24-bbc4-172a8fa39505	a1bbc3d6-9b5b-48a2-838c-4496457de48c	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-28 08:41:53.91
b7a1f6e7-1714-44cf-8159-e1f44d5e6f46	7df74954-e7f7-4f24-bbc4-172a8fa39505	e6631004-24e5-4ff6-9dff-c880f38dc227	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 2}	2026-10-28 08:46:35.249
60aa7dd8-4300-4594-83f2-c5325b47d503	7df74954-e7f7-4f24-bbc4-172a8fa39505	7c671f41-3fd5-4aaf-832e-97e6fe96810c	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-27 18:54:16.008
add39309-5df7-48d3-9db0-638f8d5c5328	7df74954-e7f7-4f24-bbc4-172a8fa39505	3bce57f6-f335-4961-9676-11b097eb2194	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "다"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "더 다양했으면 좋겠어요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-28 07:02:44.053
911f8295-9095-4010-a288-8790bd8de8b3	7df74954-e7f7-4f24-bbc4-172a8fa39505	7e6721aa-8ade-49a8-ade5-6bf2586a606c	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 1}	2026-10-28 20:41:04.491
f3120130-dd1f-44c7-92e5-91e1182180c0	7df74954-e7f7-4f24-bbc4-172a8fa39505	d046a5d5-2a39-420a-995d-ca1ddd237723	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "다", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-27 13:35:26.454
29da8481-939d-4f98-96c8-d3a154dd88c6	7df74954-e7f7-4f24-bbc4-172a8fa39505	c55107c7-b1e6-48dc-be93-f0e845acbdce	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-28 00:03:02.542
cfe5cd28-5426-4213-a439-e756fae57f1c	7df74954-e7f7-4f24-bbc4-172a8fa39505	0b28c420-7b85-4fae-ac29-c62074c469c9	{"0c0a9fed-5705-493f-8244-2be1df08079e": "C안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "좋아요!", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-28 21:59:14.64
da5a16c3-4c6b-4d24-b080-4913b05f1d9b	7df74954-e7f7-4f24-bbc4-172a8fa39505	607bf496-70ab-4622-89d8-433736254355	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "지금도 충분해요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 3}	2026-10-27 22:42:47.227
1da32efe-2b50-4ec3-bc30-dcfb5dd26072	7df74954-e7f7-4f24-bbc4-172a8fa39505	ff3b091d-f77f-4429-bf27-98eecc84fed3	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "라"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-28 19:58:15.058
6d52ec3c-88e7-42c9-af54-f4755c018417	7df74954-e7f7-4f24-bbc4-172a8fa39505	1b47bac3-4ea3-4b82-9631-39730990e8fb	{"0c0a9fed-5705-493f-8244-2be1df08079e": "B안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 5}	2026-10-28 05:44:02.228
1776a8d3-4457-4c9d-a48d-5c9413596bfb	7df74954-e7f7-4f24-bbc4-172a8fa39505	7ecdb42f-2194-45b1-8f4b-f399996af2b8	{"0c0a9fed-5705-493f-8244-2be1df08079e": "A안", "2271b4d9-6229-440f-bc02-0c1a51f21154": ["가", "나"], "41375b63-29b3-4637-a6ec-4ece3121dbdf": "자주 해주세요", "5b8db1dd-f8d6-419c-86f7-bf66baca33cb": 4}	2026-10-27 15:36:58.126
\.


--
-- Data for Name: SystemNotice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemNotice" (id, title, body, level, pinned, banner, published, "startsAt", "endsAt", "authorId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Team; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Team" (id, "groupId", name, description, "joinCode", "joinCodeRotatedAt", "joinCodeEnabled", "createdById", "createdAt", "updatedAt", "deletedAt", visibility, "requireApproval", "primaryAdminId") FROM stdin;
0449c2085cbb9704a6021685	5c5848001eb7ca3edb5f1d9a	데모팀 01	\N	47F3CDE0	2026-10-29 08:27:35.625	t	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:27:35.625	2026-10-29 08:27:35.625	\N	PUBLIC	t	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d
4eebcc0527185430cb6131f3	5c5848001eb7ca3edb5f1d9a	데모팀 05	\N	66E40038	2026-10-29 08:27:35.625	t	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:27:35.625	2026-10-29 08:27:35.625	\N	PUBLIC	t	4227074a-be01-4a63-8f35-83455ffc653e
74abdcbb6d36b4cec40314f4	5c5848001eb7ca3edb5f1d9a	데모팀 02	\N	9207C357	2026-10-29 08:27:35.625	t	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:27:35.625	2026-10-29 08:27:35.625	\N	PUBLIC	t	56c18c2f-d43a-4f06-92a0-ad785f48d942
7a6a729939156ed1886151f2	5c5848001eb7ca3edb5f1d9a	데모팀 04	\N	3D467F8C	2026-10-29 08:27:35.625	t	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:27:35.625	2026-10-29 08:27:35.625	\N	PUBLIC	t	5d14bba9-a644-40c0-a48b-ab9fdd876b9b
ebd2ae9cbcfc4f01470b38f3	5c5848001eb7ca3edb5f1d9a	데모팀 03	\N	AA12EB6B	2026-10-29 08:27:35.625	t	cmvrda1rw0000opgd9c0i30ss	2026-10-29 08:27:35.625	2026-10-29 08:27:35.625	\N	PUBLIC	t	a1bbc3d6-9b5b-48a2-838c-4496457de48c
\.


--
-- Data for Name: TeamMember; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeamMember" (id, "teamId", "userId", "groupId", role, "joinedAt") FROM stdin;
ccfcfc5f-4937-4ae4-b850-c942c4e1b02e	0449c2085cbb9704a6021685	2c059cd8-7338-4e3c-87c3-54792ec418ac	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
be248a99-7bed-45f7-b25f-500bf35bd135	0449c2085cbb9704a6021685	1a398608-3edb-41e6-86dc-e16415bab310	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
8718b80b-dbc0-43d8-ab28-d83282343ed3	0449c2085cbb9704a6021685	88b3b850-7910-46c4-af8b-ee5d2194d03a	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
e2a746a5-f688-4234-8f2b-0bb9ced536f8	0449c2085cbb9704a6021685	81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
ff7005e2-9c91-4268-9710-9552bdf1716a	0449c2085cbb9704a6021685	7e58b8cd-b525-4403-998c-8a6a4ce6cd10	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
50ff1e95-1d60-4854-bebd-be7c76134719	0449c2085cbb9704a6021685	3ab71819-06a6-48c5-b4ac-1b42894eb74a	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
89402aaf-eb0e-4e6b-a2af-5027c0853021	0449c2085cbb9704a6021685	aa23cb8d-261f-4a2e-9bd2-771759659a4c	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
e52cec29-2868-49b4-96cf-8f5d43a7d8ba	0449c2085cbb9704a6021685	3515b570-e1cd-4f5c-a65d-67f76e560e99	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
5e831b99-89c9-4dd8-a730-1a7737c15bc8	0449c2085cbb9704a6021685	4c991d09-c69a-4674-83ac-f21125d5e2e5	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
0b9f9693-764e-4469-b90a-edab0db5e7db	0449c2085cbb9704a6021685	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	5c5848001eb7ca3edb5f1d9a	ADMIN	2026-10-29 08:27:52.88
97257e56-b725-45e7-8c42-d9b46fb40476	4eebcc0527185430cb6131f3	e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
2456b97d-767f-4d9d-a88e-a032a4752742	4eebcc0527185430cb6131f3	7d092fb1-d8af-4af6-877d-a53c69d3f3c8	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
edf5ffcd-f13b-4610-850f-89ca6a45942f	4eebcc0527185430cb6131f3	10dd366a-993b-4297-9799-efd799518e9c	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
29f5c628-e57c-41cb-b061-655f5f4bdd03	4eebcc0527185430cb6131f3	c3937195-11b4-410f-8069-d7007277b086	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
639e16a5-7dc0-44de-9c6e-d7f799affeb8	4eebcc0527185430cb6131f3	b6bedee2-168d-4f81-b03e-b58676faa40d	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
676f4150-f754-4aa2-a52e-68b116a2ef6b	4eebcc0527185430cb6131f3	a2da8743-0244-4399-9c94-724c93b7f0b4	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
2516d87e-2c96-4e5f-8960-a51b9e4c052e	4eebcc0527185430cb6131f3	0689dbc7-0ec7-42ef-8625-73fea7a406ce	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
cb906b78-6067-4718-972e-089636c57c6f	4eebcc0527185430cb6131f3	c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
c3136386-1500-43a9-953d-6210795aad22	4eebcc0527185430cb6131f3	5617b5c6-4bac-467a-9e8a-0075dfc47ec5	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
18d66632-86e2-4d9d-a3bf-b3fc5bb3d0e7	4eebcc0527185430cb6131f3	4227074a-be01-4a63-8f35-83455ffc653e	5c5848001eb7ca3edb5f1d9a	ADMIN	2026-10-29 08:27:52.88
ae571949-4f18-4328-9453-2011ea8fbdbe	74abdcbb6d36b4cec40314f4	ccdbf176-4285-4734-91b4-ea4ee2bf16a5	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
2d424a34-5a84-46d3-a32c-13e106c7569f	74abdcbb6d36b4cec40314f4	de04573b-8d39-4c09-9510-054e044ab033	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
4df352c7-e1b6-4be3-90de-c6f091509d86	74abdcbb6d36b4cec40314f4	3eecafc3-7b6d-4409-a8cf-101d10139dcc	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
375c1dae-0926-419d-befe-bba607c75bb9	74abdcbb6d36b4cec40314f4	f4dc3955-250f-4515-a453-44c3c3f9838d	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
c4c862c1-82aa-43d9-9ce1-dd88e12bedab	74abdcbb6d36b4cec40314f4	991b2268-d8b8-4127-a4a1-0648da2a3d88	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
936f7a32-cb02-4da5-b1dd-0173a81fa947	74abdcbb6d36b4cec40314f4	469fb89a-fe8d-4132-82fb-1117609d0d7b	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
9cbe1b90-26b4-4e3f-b603-37b5e3af3afa	74abdcbb6d36b4cec40314f4	616d01b4-afce-43ed-b57d-caf88803fe9e	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
277694a1-da08-4da0-8815-ea87ba3079d2	74abdcbb6d36b4cec40314f4	4ed9481a-8c95-43ba-8832-95d3bb44473a	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
fdfe5b97-9438-49fa-bdb6-7588e55ba438	74abdcbb6d36b4cec40314f4	26edcc02-bda5-46af-8759-80c4b24d9872	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
bf1c2161-dfc2-4eda-a2be-6c713841b4a7	74abdcbb6d36b4cec40314f4	56c18c2f-d43a-4f06-92a0-ad785f48d942	5c5848001eb7ca3edb5f1d9a	ADMIN	2026-10-29 08:27:52.88
51eaf7f3-fb04-4bf1-93b4-1f6763900aee	7a6a729939156ed1886151f2	7136bc09-e698-4590-8e22-03332e6a39ad	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
479da44a-9040-4aac-9e33-d1cc2a2fd2a7	7a6a729939156ed1886151f2	33bfc592-2a58-4b7a-8775-03b3c0dac293	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
b65494e5-334a-4493-ad6c-3537e3a50cdd	7a6a729939156ed1886151f2	032b0ff0-cf49-44de-8478-b79536bce329	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
300d51ff-6d77-4b64-838c-23d790df080c	7a6a729939156ed1886151f2	c6506cc9-39be-4912-ad62-b57a3242549c	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
6cebe2e3-2bfa-4ef3-bf21-8792d55c364c	7a6a729939156ed1886151f2	415caa6d-731a-4ad9-a412-a928e09264b1	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
49ac9609-7813-4764-b36c-c9ad59f7b691	7a6a729939156ed1886151f2	7c930bc6-1791-42cd-93ec-9ce4499251d8	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
6abad835-4920-44b3-9e7d-3db730c17235	7a6a729939156ed1886151f2	e93bad82-e81d-45d2-8bed-edd34446ee99	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
582778ed-5137-4062-885a-7758c69591ab	7a6a729939156ed1886151f2	3d780ace-7474-43cf-b4b0-10c9c3350615	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
aa2a1eb9-742f-4fc8-a2c9-8fca50e22dd6	7a6a729939156ed1886151f2	c3108591-b396-4f8e-b3f7-73ba302fde9f	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
f9a0455c-fe5b-4ac2-a674-72c9240be799	7a6a729939156ed1886151f2	5d14bba9-a644-40c0-a48b-ab9fdd876b9b	5c5848001eb7ca3edb5f1d9a	ADMIN	2026-10-29 08:27:52.88
e348018e-914d-4438-bdef-bd5895a80126	ebd2ae9cbcfc4f01470b38f3	31bc1950-5112-4d5a-a4df-6c6de4fd12b3	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
5d9631ee-75ba-44f5-b737-e5f816e76ed3	ebd2ae9cbcfc4f01470b38f3	0b28c420-7b85-4fae-ac29-c62074c469c9	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
7a5bc460-7817-47ea-a34d-894bb425c369	ebd2ae9cbcfc4f01470b38f3	c55107c7-b1e6-48dc-be93-f0e845acbdce	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
b52cdafc-41bf-4b1f-b4e0-6ddfd7d6526d	ebd2ae9cbcfc4f01470b38f3	fc0e3f6e-b17f-4350-ba79-19873935640c	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
482fa029-017b-4b29-8758-9a6fcbddced0	ebd2ae9cbcfc4f01470b38f3	d046a5d5-2a39-420a-995d-ca1ddd237723	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
6af957df-d566-4e8c-afc4-d10898b2646f	ebd2ae9cbcfc4f01470b38f3	7e6721aa-8ade-49a8-ade5-6bf2586a606c	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
48dad468-5cb9-46b9-8a57-334b768dfb33	ebd2ae9cbcfc4f01470b38f3	3bce57f6-f335-4961-9676-11b097eb2194	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
8f23a65b-fedf-4c71-84d9-6141440b2159	ebd2ae9cbcfc4f01470b38f3	7c671f41-3fd5-4aaf-832e-97e6fe96810c	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
d6fac9be-72a6-4813-a781-f2a9a7a89607	ebd2ae9cbcfc4f01470b38f3	e6631004-24e5-4ff6-9dff-c880f38dc227	5c5848001eb7ca3edb5f1d9a	USER	2026-10-29 08:27:52.88
e29c818a-4658-4e40-b13d-2e27d0249da9	ebd2ae9cbcfc4f01470b38f3	a1bbc3d6-9b5b-48a2-838c-4496457de48c	5c5848001eb7ca3edb5f1d9a	ADMIN	2026-10-29 08:27:52.88
\.


--
-- Data for Name: Terms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Terms" (id, type, version, title, content, required, status, "effectiveAt", "publishedAt", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TermsAgreement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TermsAgreement" (id, "termsId", "userId", "agreedAt") FROM stdin;
\.


--
-- Data for Name: TurnEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TurnEntry" (id, "gameId", "userId", kind, text, "mediaUrl", reply, "targetUserId", correct, "createdAt") FROM stdin;
cmvykiehy000aopkr5x360rug	cmvykiegx0003opkry38qz8bj	4c991d09-c69a-4674-83ac-f21125d5e2e5	QUIZ	우리 사무실 와이파이 이름은?	\N	위플레이	\N	\N	2026-11-02 01:16:03.431
cmvykieia000copkrudltn46p	cmvykiegx0003opkry38qz8bj	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	GUESS	위플레이	\N	cmvykiehy000aopkr5x360rug	\N	t	2026-11-02 01:16:03.443
cmvykieic000fopkrmffmjeki	cmvykiegx0003opkry38qz8bj	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	QUIZ	2+2는?	\N	4	\N	\N	2026-11-02 01:16:03.445
cmvykieje000qopkr418q1pkj	cmvykieip000jopkr6cish0rx	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	CLUE	CCTV에 검은 가방을 든 사람이 탕비실에서 나가는 모습이 찍혔다.	\N	\N	\N	\N	2026-11-02 01:16:03.483
cmvykiejf000sopkrdgl59dyz	cmvykieip000jopkr6cish0rx	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	TEXT	첫 단서 메모	\N	\N	\N	\N	2026-11-02 01:16:03.484
cmvykiejo000uopkrx2jc8v95	cmvykieip000jopkr6cish0rx	4c991d09-c69a-4674-83ac-f21125d5e2e5	GUESS	지현(개발)	\N	\N	\N	f	2026-11-02 01:16:03.493
cmvykieko0013opkrbyr4ow9o	cmvykiejy000wopkrjoiu4l1t	4c991d09-c69a-4674-83ac-f21125d5e2e5	DRAWING	\N	/uploads/00000000000000000000000000000000.png	\N	\N	\N	2026-11-02 01:16:03.529
cmvykieky0015opkrtfn331i5	cmvykiejy000wopkrjoiu4l1t	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	DRAWING	\N	/uploads/11111111111111111111111111111111.png	\N	\N	\N	2026-11-02 01:16:03.539
\.


--
-- Data for Name: TurnGame; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TurnGame" (id, "groupId", "teamId", type, title, status, config, "createdById", "currentUserId", "turnIndex", "turnDeadline", result, "createdAt", "startedAt", "endedAt") FROM stdin;
cmvykiegx0003opkry38qz8bj	5c5848001eb7ca3edb5f1d9a	\N	CHAIN_QUIZ	smoke 체인 퀴즈	DONE	{}	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	1	\N	{}	2026-11-02 01:16:03.394	2026-11-02 01:16:03.419	2026-11-02 01:16:03.446
cmvykieip000jopkr6cish0rx	5c5848001eb7ca3edb5f1d9a	\N	DETECTIVE	smoke 추리	DONE	{"case": {"clues": ["CCTV에 검은 가방을 든 사람이 탕비실에서 나가는 모습이 찍혔다.", "과자 봉지는 휴지통이 아니라 회의실 쓰레기통에서 발견됐다.", "범인은 키가 크고 안경을 쓰지 않았다.", "어제 저녁 회의실 예약은 디자인팀 이름으로 되어 있었다.", "수진은 어제 저녁 6시에 이미 퇴근했다는 출입 기록이 있다."], "setup": "매주 금요일 탕비실의 과자 한 박스가 사라졌다. 어제 저녁 마지막으로 탕비실에 있던 사람은 네 명이었다.", "title": "사라진 간식 사건", "culprit": "민호(디자인)", "suspects": ["지현(개발)", "민호(디자인)", "수진(영업)", "재원(인사)"]}}	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	1	\N	{"reason": "ACCUSE", "solved": false}	2026-11-02 01:16:03.458	2026-11-02 01:16:03.473	2026-11-02 01:16:03.493
cmvykiejy000wopkrjoiu4l1t	5c5848001eb7ca3edb5f1d9a	\N	DRAW_RELAY	smoke 그림	DONE	{}	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	\N	1	\N	{}	2026-11-02 01:16:03.503	2026-11-02 01:16:03.516	2026-11-02 01:16:03.54
\.


--
-- Data for Name: TurnParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TurnParticipant" (id, "gameId", "userId", "position", "joinedAt") FROM stdin;
cmvykiehd0007opkrva76bdxb	cmvykiegx0003opkry38qz8bj	4c991d09-c69a-4674-83ac-f21125d5e2e5	0	2026-11-02 01:16:03.41
cmvykiegx0004opkr12mgpflu	cmvykiegx0003opkry38qz8bj	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	1	2026-11-02 01:16:03.394
cmvykieip000kopkrexxi4l58	cmvykieip000jopkr6cish0rx	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	0	2026-11-02 01:16:03.458
cmvykieiy000nopkr200eurr9	cmvykieip000jopkr6cish0rx	4c991d09-c69a-4674-83ac-f21125d5e2e5	1	2026-11-02 01:16:03.467
cmvykiek50010opkrvsc7r5pe	cmvykiejy000wopkrjoiu4l1t	4c991d09-c69a-4674-83ac-f21125d5e2e5	0	2026-11-02 01:16:03.509
cmvykiejy000xopkr8oz9zfh6	cmvykiejy000wopkrjoiu4l1t	ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	1	2026-11-02 01:16:03.503
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, username, "passwordHash", "googleSub", name, "avatarUrl", "platformRole", status, "lastLoginAt", "createdAt", "updatedAt", "birthDate", phone) FROM stdin;
aa23cb8d-261f-4a2e-9bd2-771759659a4c	user004@example.com	user004	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	정도윤	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2002-05-31	010-2098-1935
3ab71819-06a6-48c5-b4ac-1b42894eb74a	user005@example.com	user005	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	최하은	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1993-04-14	010-3136-6459
7e58b8cd-b525-4403-998c-8a6a4ce6cd10	user006@example.com	user006	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	밤비	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1980-04-18	010-7514-7338
81f4a8c3-7a05-4292-ba82-68bd7ec8c9fd	user007@example.com	user007	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	양서준	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2002-10-12	010-4626-8482
88b3b850-7910-46c4-af8b-ee5d2194d03a	user008@example.com	user008	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	전민호	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1987-08-07	010-8439-6638
1a398608-3edb-41e6-86dc-e16415bab310	user009@example.com	user009	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	파란하늘	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1996-05-12	010-8065-6463
2c059cd8-7338-4e3c-87c3-54792ec418ac	user010@example.com	user010	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	바다건너	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2003-07-18	010-1783-8123
4227074a-be01-4a63-8f35-83455ffc653e	user011@example.com	user011	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	최하은	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1992-12-24	010-7957-9277
5617b5c6-4bac-467a-9e8a-0075dfc47ec5	user012@example.com	user012	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	빨간머리	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-08-02	010-2768-8108
c24cbb3e-f6a3-4f57-a11a-75dcaad6c650	user013@example.com	user013	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	전민호	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1983-02-12	010-3554-8451
0689dbc7-0ec7-42ef-8625-73fea7a406ce	user014@example.com	user014	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	커피한잔	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-11-30	010-7532-8579
a2da8743-0244-4399-9c94-724c93b7f0b4	user015@example.com	user015	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	달빛러너	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1998-12-13	010-2668-3741
b6bedee2-168d-4f81-b03e-b58676faa40d	user016@example.com	user016	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	배하린	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-12-31	010-8727-7519
c3937195-11b4-410f-8069-d7007277b086	user017@example.com	user017	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	정도윤	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2004-07-14	010-5912-9951
10dd366a-993b-4297-9799-efd799518e9c	user018@example.com	user018	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	송예린	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1996-08-12	010-6834-5433
7d092fb1-d8af-4af6-877d-a53c69d3f3c8	user019@example.com	user019	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	차은우	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1990-12-17	010-9417-7406
e3513bc4-9e03-4ab3-9f07-3ba7a01a1135	user020@example.com	user020	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	석민아	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1998-08-18	010-2260-7269
56c18c2f-d43a-4f06-92a0-ad785f48d942	user021@example.com	user021	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	여지원	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1985-04-28	010-8840-1353
26edcc02-bda5-46af-8759-80c4b24d9872	user022@example.com	user022	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	장채원	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-04-16	010-1636-2526
4ed9481a-8c95-43ba-8832-95d3bb44473a	user023@example.com	user023	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	오준서	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1983-05-19	010-1326-9216
616d01b4-afce-43ed-b57d-caf88803fe9e	user024@example.com	user024	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	전민호	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1986-11-01	010-4463-1201
469fb89a-fe8d-4132-82fb-1117609d0d7b	user025@example.com	user025	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	모닝커피	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1975-12-07	010-8682-1635
991b2268-d8b8-4127-a4a1-0648da2a3d88	user026@example.com	user026	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	구태현	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1981-05-06	010-3733-0774
f4dc3955-250f-4515-a453-44c3c3f9838d	user027@example.com	user027	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	커피한잔	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2001-11-13	010-9986-0177
3eecafc3-7b6d-4409-a8cf-101d10139dcc	user028@example.com	user028	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	강지우	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-04-28	010-6344-4031
de04573b-8d39-4c09-9510-054e044ab033	user029@example.com	user029	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	오준서	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-11-23	010-9620-0986
ccdbf176-4285-4734-91b4-ea4ee2bf16a5	user030@example.com	user030	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	빨간머리	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1985-10-09	010-5060-2717
5d14bba9-a644-40c0-a48b-ab9fdd876b9b	user031@example.com	user031	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	달빛러너	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1991-06-29	010-3082-0905
c3108591-b396-4f8e-b3f7-73ba302fde9f	user032@example.com	user032	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	두근두근	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-09-26	010-4221-3515
3d780ace-7474-43cf-b4b0-10c9c3350615	user033@example.com	user033	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	빨간머리	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1989-07-23	010-5423-2777
e93bad82-e81d-45d2-8bed-edd34446ee99	user034@example.com	user034	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	고은별	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1990-06-16	010-7561-8909
7c930bc6-1791-42cd-93ec-9ce4499251d8	user035@example.com	user035	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	전민호	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1993-03-29	010-4693-3909
4c991d09-c69a-4674-83ac-f21125d5e2e5	user002@example.com	user002	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	석민아	\N	USER	ACTIVE	2026-11-02 01:16:03.308	2026-10-29 08:27:52.88	2026-11-02 01:16:03.308	1978-01-12	010-9180-1947
cmvrda1rw0000opgd9c0i30ss	\N	master	$2b$10$j0z7x8/XCh0hhGfKMP/3o.4AGnj.yTnd9EWXPx1tCwHP5x/dFsTwq	\N	Master	\N	MASTER	ACTIVE	2026-10-29 09:39:04.141	2026-10-28 00:19:13.148	2026-10-29 09:39:04.142	\N	\N
3515b570-e1cd-4f5c-a65d-67f76e560e99	user003@example.com	user003	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	파란하늘	\N	USER	ACTIVE	2026-11-02 01:16:03.38	2026-10-29 08:27:52.88	2026-11-02 01:16:03.38	2001-01-12	010-7478-8533
415caa6d-731a-4ad9-a412-a928e09264b1	user036@example.com	user036	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	양서준	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1997-04-11	010-6991-3125
c6506cc9-39be-4912-ad62-b57a3242549c	user037@example.com	user037	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	무지개토끼	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1993-01-26	010-1771-2516
032b0ff0-cf49-44de-8478-b79536bce329	user038@example.com	user038	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	양서준	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2003-04-24	010-7069-3762
33bfc592-2a58-4b7a-8775-03b3c0dac293	user039@example.com	user039	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	노건우	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2001-04-28	010-8530-2952
7136bc09-e698-4590-8e22-03332e6a39ad	user040@example.com	user040	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	코딩하는고양이	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2000-08-21	010-7523-4002
a1bbc3d6-9b5b-48a2-838c-4496457de48c	user041@example.com	user041	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	박지호	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2000-04-01	010-2871-1160
e6631004-24e5-4ff6-9dff-c880f38dc227	user042@example.com	user042	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	윤예준	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1978-07-27	010-2753-4866
7c671f41-3fd5-4aaf-832e-97e6fe96810c	user043@example.com	user043	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	밤비	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1999-10-26	010-5860-9472
3bce57f6-f335-4961-9676-11b097eb2194	user044@example.com	user044	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	임시우	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1986-09-08	010-3274-7175
7e6721aa-8ade-49a8-ade5-6bf2586a606c	user045@example.com	user045	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	라떼한잔	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1995-02-20	010-0282-8991
d046a5d5-2a39-420a-995d-ca1ddd237723	user046@example.com	user046	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	여지원	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1979-01-03	010-2328-7812
fc0e3f6e-b17f-4350-ba79-19873935640c	user047@example.com	user047	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	고요한숲	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1982-10-26	010-6142-8329
c55107c7-b1e6-48dc-be93-f0e845acbdce	user048@example.com	user048	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	빨간머리	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1993-04-29	010-9925-5918
0b28c420-7b85-4fae-ac29-c62074c469c9	user049@example.com	user049	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	류태윤	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1998-09-20	010-4003-9922
31bc1950-5112-4d5a-a4df-6c6de4fd12b3	user050@example.com	user050	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	바다건너	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2001-01-16	010-4567-0413
7ecdb42f-2194-45b1-8f4b-f399996af2b8	user051@example.com	user051	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	노건우	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2003-03-31	010-8654-5383
607bf496-70ab-4622-89d8-433736254355	user052@example.com	user052	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	석민아	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1981-08-09	010-6365-3279
f847adce-31e5-4f77-a666-1fa0efdf6374	user053@example.com	user053	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	조수빈	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2002-05-14	010-2785-0324
ff3b091d-f77f-4429-bf27-98eecc84fed3	user054@example.com	user054	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	고은별	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	2003-11-06	010-8794-4479
1b47bac3-4ea3-4b82-9631-39730990e8fb	user055@example.com	user055	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	최하은	\N	USER	ACTIVE	\N	2026-10-29 08:27:52.88	2026-10-29 08:27:52.88	1998-03-08	010-2207-6610
ca8bbc62-caaf-4ee6-a26d-184b831d1a9d	user001@example.com	user001	$2b$10$0.toouhV6CUB8CWaAfwu9.W3ztgJ2XwJVzbzHzf/jG9lzWCvrb8gy	\N	차은우	\N	USER	ACTIVE	2026-11-02 01:16:03.236	2026-10-29 08:27:52.88	2026-11-02 01:16:03.236	1996-10-19	010-3693-8190
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d76bb732-c8ab-432e-8847-8a8135e9db39	07a3e4a06062e962b482a0214cb44047266af96be698033b2e0a7a044cfae5f3	2026-10-29 07:54:19.999889+00	20261109100000_points_config	\N	\N	2026-10-29 07:54:19.980306+00	1
3d6a8129-2648-4208-9f09-fd3fa4bab0a2	97dc8eaabc56bc16b7127afabbb3a428e10160196db3481664eb9cc3dc904cc2	2026-10-28 00:08:56.821608+00	20261027045530_init	\N	\N	2026-10-28 00:08:56.810171+00	1
7bd401d6-1605-418b-984e-4f5d824af968	4245718805f8c6899465c82b979d36ff27e1fb4db7698ec4643ad8fd66c96dd3	2026-10-29 05:20:45.645134+00	20261101100000_employee_of_the_month_multi_winner	\N	\N	2026-10-29 05:20:45.635396+00	1
eecfde20-b938-47e4-9c8f-2783346f0c64	696719ab201d3a9becbf7f396d92ec06c8841e6ed83d533c6059591fe85dfd41	2026-10-28 00:08:56.823939+00	20261027070000_group_visibility	\N	\N	2026-10-28 00:08:56.822129+00	1
be940b68-3f1e-4407-b86d-7cf6a6d8c01c	4cb12493b38958117267933dc7d27c56bd1b02693893fc90720349458f49f1d8	2026-10-28 00:08:56.82642+00	20261027080000_name_unique	\N	\N	2026-10-28 00:08:56.824529+00	1
3b062ee1-aac2-4be0-8b22-fb336577676f	e69b15f7ad39b28047c11d94d8477d55d62cc59e03b81e47c9479182a6d92c5b	2026-10-28 01:20:58.863169+00	20261028090000_group_role_user	\N	\N	2026-10-28 01:20:58.846835+00	1
74abba5b-b99c-4040-a37c-e712e9ff7eae	f0b03ca4feca77276bcd8895f4be9e4442d82a1600a2b965f950215cb9fe0fca	2026-10-29 05:30:56.895243+00	20261102100000_employee_of_the_month_comment	\N	\N	2026-10-29 05:30:56.888408+00	1
6e0ab096-620d-4dec-ba2a-97083c2602d0	1907b777a3c16cc8ab845700750f18a602297f5e6b40a3d6d67fd6b4b8c393f8	2026-10-28 02:20:59.578437+00	20261028120000_user_status_deactivated	\N	\N	2026-10-28 02:20:59.57436+00	1
8a0d113b-74d1-40e9-930b-145208bf433b	13a77409e6a1fb8c34aae8df9ed0944a74c5b3c561737c53ed49281fd6304e21	2026-10-28 02:34:20.663054+00	20261028130000_group_admin_multi	\N	\N	2026-10-28 02:34:20.657169+00	1
d550078b-1b6e-46d8-9aed-14dd208d639f	00fd5cd073ab4dcf481005769e81279474cd1ba1fe371e76bc34ed29103f3b90	2026-10-28 02:45:53.351659+00	20261028140000_rename_company_group_team	\N	\N	2026-10-28 02:45:53.343781+00	1
60292464-f4e1-441d-b402-2731e5037485	d329388b760c6b6f9160dc641e65193729fa8815a25dd437bebcfb4c89f54061	2026-10-29 05:56:20.078688+00	20261103100000_compliment_card	\N	\N	2026-10-29 05:56:20.071285+00	1
f8c7eef3-44b2-4709-bd02-a7b3938c3ecb	ec0569de2e91d47fcef04adaf9e0739b9209709ed2e769c8f8d2bfb3985005f6	2026-10-28 04:46:02.779883+00	20261028150000_user_profile_fields	\N	\N	2026-10-28 04:46:02.773349+00	1
a43e1bfe-0e51-41b7-a498-eeb7da1746ae	02e42bc21f20a17bb62ff7d65a75cae452479cb91de81314f256176841762e50	2026-10-28 05:02:02.632608+00	20261028160000_team_primary_admin	\N	\N	2026-10-28 05:02:02.628526+00	1
fbe56b2a-d74c-48e3-9844-4ea8ae63a72e	c6ba6d4f1a63265d2ca3b8a908803720b342d00d5948ce1729d0df3f804ab859	2026-10-29 08:05:28.924344+00	20261110100000_remove_regular_mvp	\N	\N	2026-10-29 08:05:28.920099+00	1
68ddc20b-f6f1-46ed-ac89-efc4789dac36	ec66a3b838a92c584af386896aae2d2f8f4bd073b6279d1d4ac2c3b7c3337b7d	2026-10-28 07:40:32.296776+00	20261028170000_user_status_merge	\N	\N	2026-10-28 07:40:32.260867+00	1
3498dc9c-5c00-46a5-a4c8-1c9323aa140d	1c9f0ad7843e2b309bc79e735ce4a0f77188ee00e76d1b4dc57e1c20bb627dc8	2026-10-29 06:05:37.648028+00	20261104100000_compliment_anonymous	\N	\N	2026-10-29 06:05:37.642397+00	1
c96f04c6-6efe-48ce-9f39-71fb1a5d6081	d9c9b60a2670fcbcc671ac7365e84f51e24ec4e1a463cfe9e8759444141a565e	2026-10-29 02:39:31.725788+00	20261029100000_group_feature	\N	\N	2026-10-29 02:39:31.696394+00	1
d02a0e9b-5a66-4f74-bdde-f29095c26f5f	f828481a1a43a1884b179d1bde9ec00266a8fd853a77526b3cf7916bcc386f74	2026-10-29 04:24:28.238346+00	20261030100000_employee_of_month	\N	\N	2026-10-29 04:24:28.23172+00	1
3db6ce8d-d66c-4636-8633-96211eb74fb5	b44a404b6f37c1f2d38037342f49e430072990e252bf58544f1601775186f826	2026-10-29 04:32:38.593417+00	20261031100000_employee_of_the_month	\N	\N	2026-10-29 04:32:38.583586+00	1
c557d5f0-ed5c-4fa0-b0ba-aa077f1a2ebc	4393ab65884d082fb4988af2c0f48b01f6e7346c01340d5ad04d9e0cc42c9a49	2026-10-29 06:24:16.648018+00	20261105100000_compliment_daily_limit	\N	\N	2026-10-29 06:24:16.639914+00	1
e8837840-7f69-443c-9428-fc5e0b78f882	41e3b1156a3144af2d9085e1bfbb41687c7013187b7495349c3079fa22be5289	2026-10-29 09:27:16.393131+00	20261202100000_mini_games	\N	\N	2026-10-29 09:27:16.382654+00	1
027af613-a2d7-4f2e-9315-831226b20dc8	4118c1ad680fdaf1e1f089fe9d4571f40f46aab42e99ebfcc046ab8afca226e3	2026-10-29 06:49:20.634683+00	20261106100000_compliment_hidden	\N	\N	2026-10-29 06:49:20.631405+00	1
ffc63991-915b-4301-85c1-e3a9e7afdf44	229d66f036c4db42327c357f7778703bbd8ab387c913e71cf30f5b9db31f03c9	2026-10-29 08:08:35.722833+00	20261111100000_eotm_single_winner	\N	\N	2026-10-29 08:08:35.714058+00	1
c0cad800-81b9-4aa9-9e34-798f19e6865f	bd0654edca95554375744b6ab486320f3160d6fef91a04557ba49f27bc20a240	2026-10-29 06:51:52.358854+00	20261107100000_compliment_reaction	\N	\N	2026-10-29 06:51:52.348304+00	1
fd89478b-cb93-4507-8348-aa84e70cd124	5c6a2810f1633e97fca2530c0f832931aed0dfb4bf36a873101e04b666000fd8	2026-10-29 07:50:41.464424+00	20261108100000_points_badge	\N	\N	2026-10-29 07:50:41.460914+00	1
29a8a7b6-9f4b-4ad6-ad14-ad784e72e5d8	2dd1c7df41b4d98378a8e3e018b6fc7316389afbbe85f2322fa0eef72409676f	2026-10-29 09:53:47.665416+00	20261206100200_feature_guide	\N	\N	2026-10-29 09:53:47.661455+00	1
0af495be-2d9b-44bb-9099-b6cfe688c9f5	6c08a879c08f917c7a6a7521b3e6f1f7de75055f64f6d05c372acbf4f1fdf852	2026-10-29 08:13:16.794261+00	20261112100000_eotm_winner_count_restore	\N	\N	2026-10-29 08:13:16.788366+00	1
02109b84-e0d9-47d9-a37a-fd171d68ce8c	105bed11cd679bed93a89cb4991693c9f9bac5a2674b9d42f854d04eb32f7431	2026-10-29 09:27:23.584328+00	20261202100100_mini_games_seed	\N	\N	2026-10-29 09:27:23.581497+00	1
0d039ac3-3784-4672-8470-6c32a7522f7c	b0358444303000854c929885f4a9cd0fa04fa9d8da680cc4ce0c58f3d556714e	2026-10-29 08:49:35.810529+00	20261115100000_manitto	\N	\N	2026-10-29 08:49:35.797983+00	1
ef8292cd-f5b9-49ce-a6aa-e440b2f06f82	0d6acdd4e2651b0358740e591f37695744af9ceb29a823a980be90b1cb96a207	2026-10-29 09:05:57.020503+00	20261201100000_activities	\N	\N	2026-10-29 09:05:56.989767+00	1
09ba10e4-c658-43d0-a86c-ace86a4b136d	a4094f93c3e18aea08c04486bc3d8918112db774dfd81a832aade17e44e5683b	2026-10-29 09:52:15.81703+00	20261205100000_duty	\N	\N	2026-10-29 09:52:15.807821+00	1
d934b54f-22bd-46d7-9d6a-f46466805442	afa47f9bbf9dd9013c36d9f40798aa95e68a0f15fab59f39ff7362a4e45547ed	2026-10-29 09:37:20.724228+00	20261203100000_feature_default	\N	\N	2026-10-29 09:37:20.720058+00	1
43cc6a6f-03a3-4ebd-809c-8a3cac6f9f78	624dab463f3773b3848476ab2b2e7618fdea48d168f2137481e97cdcf2d1d902	2026-10-29 09:43:56.864895+00	20261204100000_games	\N	\N	2026-10-29 09:43:56.851464+00	1
278af664-3e1a-4157-9144-60501f04c577	a7db5b28bdc50a0d4d67eae0b42ebcf0f8ba95faaed74dbdb5d4915647f084f1	2026-10-29 09:53:25.956056+00	20261206100100_default_features	\N	\N	2026-10-29 09:53:25.953648+00	1
f333effb-a150-4225-bacc-6c71b73df805	b50fbad5452d67164348a557739480d261271791a9073b0c524ff6ecfd52255f	2026-10-29 09:53:25.952926+00	20261206100000_board_support	\N	\N	2026-10-29 09:53:25.930603+00	1
eab38cc5-0240-45af-85f3-2fd3900485d3	70551a157013779e60fd15e72ace2e584f90a5f9574eacb7972450196133b196	2026-11-01 23:30:30.261434+00	20261207100000_daily_social	\N	\N	2026-11-01 23:30:30.247721+00	1
2fb75c17-a0e6-42ef-b127-0c061f20363b	25d98a8585d30bbf8de9ce89abf5424676d3c5b11372d68ac047e9c9f4bb0712	2026-11-02 00:15:01.708636+00	20261208100000_storage_quota	\N	\N	2026-11-02 00:15:01.702689+00	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BadgeDefault BadgeDefault_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BadgeDefault"
    ADD CONSTRAINT "BadgeDefault_pkey" PRIMARY KEY (key);


--
-- Name: BingoBoard BingoBoard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BingoBoard"
    ADD CONSTRAINT "BingoBoard_pkey" PRIMARY KEY (id);


--
-- Name: BingoCell BingoCell_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BingoCell"
    ADD CONSTRAINT "BingoCell_pkey" PRIMARY KEY (id);


--
-- Name: BoardComment BoardComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoardComment"
    ADD CONSTRAINT "BoardComment_pkey" PRIMARY KEY (id);


--
-- Name: BoardPost BoardPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoardPost"
    ADD CONSTRAINT "BoardPost_pkey" PRIMARY KEY (id);


--
-- Name: ComplimentCard ComplimentCard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentCard"
    ADD CONSTRAINT "ComplimentCard_pkey" PRIMARY KEY (id);


--
-- Name: ComplimentReaction ComplimentReaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentReaction"
    ADD CONSTRAINT "ComplimentReaction_pkey" PRIMARY KEY (id);


--
-- Name: ComplimentSetting ComplimentSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentSetting"
    ADD CONSTRAINT "ComplimentSetting_pkey" PRIMARY KEY ("groupId");


--
-- Name: DailyPick DailyPick_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyPick"
    ADD CONSTRAINT "DailyPick_pkey" PRIMARY KEY (id);


--
-- Name: DinnerPlace DinnerPlace_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPlace"
    ADD CONSTRAINT "DinnerPlace_pkey" PRIMARY KEY (id);


--
-- Name: DinnerPollDate DinnerPollDate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPollDate"
    ADD CONSTRAINT "DinnerPollDate_pkey" PRIMARY KEY (id);


--
-- Name: DinnerPollPlace DinnerPollPlace_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPollPlace"
    ADD CONSTRAINT "DinnerPollPlace_pkey" PRIMARY KEY (id);


--
-- Name: DinnerPoll DinnerPoll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPoll"
    ADD CONSTRAINT "DinnerPoll_pkey" PRIMARY KEY (id);


--
-- Name: DinnerVote DinnerVote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerVote"
    ADD CONSTRAINT "DinnerVote_pkey" PRIMARY KEY (id);


--
-- Name: DutyLog DutyLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DutyLog"
    ADD CONSTRAINT "DutyLog_pkey" PRIMARY KEY (id);


--
-- Name: Duty Duty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Duty"
    ADD CONSTRAINT "Duty_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeOfTheMonthComment EmployeeOfTheMonthComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthComment"
    ADD CONSTRAINT "EmployeeOfTheMonthComment_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeOfTheMonthNomination EmployeeOfTheMonthNomination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthNomination"
    ADD CONSTRAINT "EmployeeOfTheMonthNomination_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeOfTheMonthSetting EmployeeOfTheMonthSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthSetting"
    ADD CONSTRAINT "EmployeeOfTheMonthSetting_pkey" PRIMARY KEY ("groupId");


--
-- Name: EmployeeOfTheMonth EmployeeOfTheMonth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonth"
    ADD CONSTRAINT "EmployeeOfTheMonth_pkey" PRIMARY KEY (id);


--
-- Name: FeatureConfig FeatureConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureConfig"
    ADD CONSTRAINT "FeatureConfig_pkey" PRIMARY KEY (feature);


--
-- Name: FeatureSetting FeatureSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureSetting"
    ADD CONSTRAINT "FeatureSetting_pkey" PRIMARY KEY ("groupId", feature);


--
-- Name: GamePhoto GamePhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GamePhoto"
    ADD CONSTRAINT "GamePhoto_pkey" PRIMARY KEY (id);


--
-- Name: GameScore GameScore_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GameScore"
    ADD CONSTRAINT "GameScore_pkey" PRIMARY KEY (id);


--
-- Name: GroupBadgeRule GroupBadgeRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupBadgeRule"
    ADD CONSTRAINT "GroupBadgeRule_pkey" PRIMARY KEY ("groupId", key);


--
-- Name: GroupFeature GroupFeature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupFeature"
    ADD CONSTRAINT "GroupFeature_pkey" PRIMARY KEY (id);


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
-- Name: GroupPointRule GroupPointRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupPointRule"
    ADD CONSTRAINT "GroupPointRule_pkey" PRIMARY KEY ("groupId", metric);


--
-- Name: Group Group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Group"
    ADD CONSTRAINT "Group_pkey" PRIMARY KEY (id);


--
-- Name: InquiryReply InquiryReply_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InquiryReply"
    ADD CONSTRAINT "InquiryReply_pkey" PRIMARY KEY (id);


--
-- Name: Inquiry Inquiry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_pkey" PRIMARY KEY (id);


--
-- Name: ManittoAssignment ManittoAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoAssignment"
    ADD CONSTRAINT "ManittoAssignment_pkey" PRIMARY KEY (id);


--
-- Name: ManittoMessage ManittoMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoMessage"
    ADD CONSTRAINT "ManittoMessage_pkey" PRIMARY KEY (id);


--
-- Name: ManittoRound ManittoRound_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoRound"
    ADD CONSTRAINT "ManittoRound_pkey" PRIMARY KEY (id);


--
-- Name: MembershipRequestTeam MembershipRequestTeam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MembershipRequestTeam"
    ADD CONSTRAINT "MembershipRequestTeam_pkey" PRIMARY KEY ("requestId", "teamId");


--
-- Name: NoticeRead NoticeRead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NoticeRead"
    ADD CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("noticeId", "userId");


--
-- Name: Notice Notice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notice"
    ADD CONSTRAINT "Notice_pkey" PRIMARY KEY (id);


--
-- Name: PhotoMission PhotoMission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhotoMission"
    ADD CONSTRAINT "PhotoMission_pkey" PRIMARY KEY (id);


--
-- Name: PhotoSubmission PhotoSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhotoSubmission"
    ADD CONSTRAINT "PhotoSubmission_pkey" PRIMARY KEY (id);


--
-- Name: PointAdjustment PointAdjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointAdjustment"
    ADD CONSTRAINT "PointAdjustment_pkey" PRIMARY KEY (id);


--
-- Name: PointLedger PointLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointLedger"
    ADD CONSTRAINT "PointLedger_pkey" PRIMARY KEY (id);


--
-- Name: PointRuleDefault PointRuleDefault_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointRuleDefault"
    ADD CONSTRAINT "PointRuleDefault_pkey" PRIMARY KEY (metric);


--
-- Name: ProfileFact ProfileFact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileFact"
    ADD CONSTRAINT "ProfileFact_pkey" PRIMARY KEY (id);


--
-- Name: RollingPaperNote RollingPaperNote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RollingPaperNote"
    ADD CONSTRAINT "RollingPaperNote_pkey" PRIMARY KEY (id);


--
-- Name: RollingPaper RollingPaper_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RollingPaper"
    ADD CONSTRAINT "RollingPaper_pkey" PRIMARY KEY (id);


--
-- Name: SnackGame SnackGame_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackGame"
    ADD CONSTRAINT "SnackGame_pkey" PRIMARY KEY (id);


--
-- Name: SnackParticipant SnackParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackParticipant"
    ADD CONSTRAINT "SnackParticipant_pkey" PRIMARY KEY (id);


--
-- Name: SnackSlot SnackSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackSlot"
    ADD CONSTRAINT "SnackSlot_pkey" PRIMARY KEY (id);


--
-- Name: SuggestionVote SuggestionVote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SuggestionVote"
    ADD CONSTRAINT "SuggestionVote_pkey" PRIMARY KEY ("suggestionId", "userId");


--
-- Name: Suggestion Suggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Suggestion"
    ADD CONSTRAINT "Suggestion_pkey" PRIMARY KEY (id);


--
-- Name: SurveyQuestion SurveyQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveyQuestion"
    ADD CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY (id);


--
-- Name: SurveyResponse SurveyResponse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveyResponse"
    ADD CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY (id);


--
-- Name: Survey Survey_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Survey"
    ADD CONSTRAINT "Survey_pkey" PRIMARY KEY (id);


--
-- Name: SystemNotice SystemNotice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemNotice"
    ADD CONSTRAINT "SystemNotice_pkey" PRIMARY KEY (id);


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
-- Name: TermsAgreement TermsAgreement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TermsAgreement"
    ADD CONSTRAINT "TermsAgreement_pkey" PRIMARY KEY (id);


--
-- Name: Terms Terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Terms"
    ADD CONSTRAINT "Terms_pkey" PRIMARY KEY (id);


--
-- Name: TurnEntry TurnEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TurnEntry"
    ADD CONSTRAINT "TurnEntry_pkey" PRIMARY KEY (id);


--
-- Name: TurnGame TurnGame_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TurnGame"
    ADD CONSTRAINT "TurnGame_pkey" PRIMARY KEY (id);


--
-- Name: TurnParticipant TurnParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TurnParticipant"
    ADD CONSTRAINT "TurnParticipant_pkey" PRIMARY KEY (id);


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
-- Name: BingoBoard_teamId_week_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BingoBoard_teamId_week_key" ON public."BingoBoard" USING btree ("teamId", week);


--
-- Name: BingoCell_boardId_index_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BingoCell_boardId_index_key" ON public."BingoCell" USING btree ("boardId", index);


--
-- Name: BoardComment_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BoardComment_authorId_idx" ON public."BoardComment" USING btree ("authorId");


--
-- Name: BoardComment_postId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BoardComment_postId_createdAt_idx" ON public."BoardComment" USING btree ("postId", "createdAt");


--
-- Name: BoardPost_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BoardPost_authorId_idx" ON public."BoardPost" USING btree ("authorId");


--
-- Name: BoardPost_groupId_teamId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BoardPost_groupId_teamId_createdAt_idx" ON public."BoardPost" USING btree ("groupId", "teamId", "createdAt");


--
-- Name: ComplimentCard_groupId_month_receiverId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ComplimentCard_groupId_month_receiverId_idx" ON public."ComplimentCard" USING btree ("groupId", month, "receiverId");


--
-- Name: ComplimentCard_groupId_senderId_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ComplimentCard_groupId_senderId_month_idx" ON public."ComplimentCard" USING btree ("groupId", "senderId", month);


--
-- Name: ComplimentReaction_cardId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ComplimentReaction_cardId_userId_key" ON public."ComplimentReaction" USING btree ("cardId", "userId");


--
-- Name: ComplimentReaction_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ComplimentReaction_userId_idx" ON public."ComplimentReaction" USING btree ("userId");


--
-- Name: DailyPick_groupId_date_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyPick_groupId_date_kind_idx" ON public."DailyPick" USING btree ("groupId", date, kind);


--
-- Name: DailyPick_groupId_userId_date_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DailyPick_groupId_userId_date_kind_key" ON public."DailyPick" USING btree ("groupId", "userId", date, kind);


--
-- Name: DinnerPlace_groupId_teamId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DinnerPlace_groupId_teamId_idx" ON public."DinnerPlace" USING btree ("groupId", "teamId");


--
-- Name: DinnerPollDate_pollId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DinnerPollDate_pollId_date_key" ON public."DinnerPollDate" USING btree ("pollId", date);


--
-- Name: DinnerPollPlace_pollId_placeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DinnerPollPlace_pollId_placeId_key" ON public."DinnerPollPlace" USING btree ("pollId", "placeId");


--
-- Name: DinnerPoll_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DinnerPoll_groupId_status_createdAt_idx" ON public."DinnerPoll" USING btree ("groupId", status, "createdAt");


--
-- Name: DinnerVote_pollId_kind_optionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DinnerVote_pollId_kind_optionId_idx" ON public."DinnerVote" USING btree ("pollId", kind, "optionId");


--
-- Name: DinnerVote_pollId_userId_kind_optionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DinnerVote_pollId_userId_kind_optionId_key" ON public."DinnerVote" USING btree ("pollId", "userId", kind, "optionId");


--
-- Name: DinnerVote_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DinnerVote_userId_idx" ON public."DinnerVote" USING btree ("userId");


--
-- Name: DutyLog_dutyId_periodKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DutyLog_dutyId_periodKey_key" ON public."DutyLog" USING btree ("dutyId", "periodKey");


--
-- Name: Duty_groupId_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Duty_groupId_active_idx" ON public."Duty" USING btree ("groupId", active);


--
-- Name: EmployeeOfTheMonthComment_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeOfTheMonthComment_authorId_idx" ON public."EmployeeOfTheMonthComment" USING btree ("authorId");


--
-- Name: EmployeeOfTheMonthComment_groupId_month_targetUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeOfTheMonthComment_groupId_month_targetUserId_idx" ON public."EmployeeOfTheMonthComment" USING btree ("groupId", month, "targetUserId");


--
-- Name: EmployeeOfTheMonthNomination_groupId_month_nominatorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeOfTheMonthNomination_groupId_month_nominatorId_key" ON public."EmployeeOfTheMonthNomination" USING btree ("groupId", month, "nominatorId");


--
-- Name: EmployeeOfTheMonthNomination_nomineeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeOfTheMonthNomination_nomineeId_idx" ON public."EmployeeOfTheMonthNomination" USING btree ("nomineeId");


--
-- Name: EmployeeOfTheMonth_groupId_month_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmployeeOfTheMonth_groupId_month_userId_key" ON public."EmployeeOfTheMonth" USING btree ("groupId", month, "userId");


--
-- Name: EmployeeOfTheMonth_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeOfTheMonth_userId_idx" ON public."EmployeeOfTheMonth" USING btree ("userId");


--
-- Name: GamePhoto_groupId_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GamePhoto_groupId_kind_idx" ON public."GamePhoto" USING btree ("groupId", kind);


--
-- Name: GameScore_groupId_game_playedOn_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GameScore_groupId_game_playedOn_idx" ON public."GameScore" USING btree ("groupId", game, "playedOn");


--
-- Name: GameScore_userId_playedOn_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GameScore_userId_playedOn_idx" ON public."GameScore" USING btree ("userId", "playedOn");


--
-- Name: GroupFeature_groupId_feature_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GroupFeature_groupId_feature_key" ON public."GroupFeature" USING btree ("groupId", feature);


--
-- Name: GroupFeature_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupFeature_status_idx" ON public."GroupFeature" USING btree (status);


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
-- Name: Inquiry_status_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Inquiry_status_updatedAt_idx" ON public."Inquiry" USING btree (status, "updatedAt");


--
-- Name: ManittoAssignment_receiverId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManittoAssignment_receiverId_idx" ON public."ManittoAssignment" USING btree ("receiverId");


--
-- Name: ManittoAssignment_roundId_giverId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ManittoAssignment_roundId_giverId_key" ON public."ManittoAssignment" USING btree ("roundId", "giverId");


--
-- Name: ManittoAssignment_roundId_receiverId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ManittoAssignment_roundId_receiverId_key" ON public."ManittoAssignment" USING btree ("roundId", "receiverId");


--
-- Name: ManittoMessage_assignmentId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManittoMessage_assignmentId_createdAt_idx" ON public."ManittoMessage" USING btree ("assignmentId", "createdAt");


--
-- Name: ManittoRound_groupId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManittoRound_groupId_status_idx" ON public."ManittoRound" USING btree ("groupId", status);


--
-- Name: Notice_groupId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notice_groupId_createdAt_idx" ON public."Notice" USING btree ("groupId", "createdAt");


--
-- Name: PhotoMission_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PhotoMission_groupId_status_createdAt_idx" ON public."PhotoMission" USING btree ("groupId", status, "createdAt");


--
-- Name: PhotoMission_hostId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PhotoMission_hostId_idx" ON public."PhotoMission" USING btree ("hostId");


--
-- Name: PhotoSubmission_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PhotoSubmission_authorId_idx" ON public."PhotoSubmission" USING btree ("authorId");


--
-- Name: PhotoSubmission_missionId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PhotoSubmission_missionId_createdAt_idx" ON public."PhotoSubmission" USING btree ("missionId", "createdAt");


--
-- Name: PointAdjustment_groupId_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PointAdjustment_groupId_userId_idx" ON public."PointAdjustment" USING btree ("groupId", "userId");


--
-- Name: PointLedger_groupId_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PointLedger_groupId_userId_createdAt_idx" ON public."PointLedger" USING btree ("groupId", "userId", "createdAt");


--
-- Name: PointLedger_groupId_userId_kind_refId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PointLedger_groupId_userId_kind_refId_key" ON public."PointLedger" USING btree ("groupId", "userId", kind, "refId");


--
-- Name: ProfileFact_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileFact_groupId_idx" ON public."ProfileFact" USING btree ("groupId");


--
-- Name: RollingPaperNote_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RollingPaperNote_authorId_idx" ON public."RollingPaperNote" USING btree ("authorId");


--
-- Name: RollingPaperNote_paperId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RollingPaperNote_paperId_createdAt_idx" ON public."RollingPaperNote" USING btree ("paperId", "createdAt");


--
-- Name: RollingPaper_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RollingPaper_groupId_status_createdAt_idx" ON public."RollingPaper" USING btree ("groupId", status, "createdAt");


--
-- Name: RollingPaper_targetUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RollingPaper_targetUserId_idx" ON public."RollingPaper" USING btree ("targetUserId");


--
-- Name: SnackGame_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SnackGame_groupId_status_createdAt_idx" ON public."SnackGame" USING btree ("groupId", status, "createdAt");


--
-- Name: SnackParticipant_gameId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SnackParticipant_gameId_userId_key" ON public."SnackParticipant" USING btree ("gameId", "userId");


--
-- Name: SnackParticipant_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SnackParticipant_userId_idx" ON public."SnackParticipant" USING btree ("userId");


--
-- Name: SnackSlot_gameId_position_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SnackSlot_gameId_position_key" ON public."SnackSlot" USING btree ("gameId", "position");


--
-- Name: Suggestion_groupId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Suggestion_groupId_status_idx" ON public."Suggestion" USING btree ("groupId", status);


--
-- Name: SurveyQuestion_surveyId_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SurveyQuestion_surveyId_position_idx" ON public."SurveyQuestion" USING btree ("surveyId", "position");


--
-- Name: SurveyResponse_surveyId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SurveyResponse_surveyId_userId_key" ON public."SurveyResponse" USING btree ("surveyId", "userId");


--
-- Name: SurveyResponse_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SurveyResponse_userId_idx" ON public."SurveyResponse" USING btree ("userId");


--
-- Name: Survey_groupId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Survey_groupId_status_createdAt_idx" ON public."Survey" USING btree ("groupId", status, "createdAt");


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
-- Name: TermsAgreement_termsId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TermsAgreement_termsId_userId_key" ON public."TermsAgreement" USING btree ("termsId", "userId");


--
-- Name: Terms_type_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Terms_type_version_key" ON public."Terms" USING btree (type, version);


--
-- Name: TurnEntry_gameId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TurnEntry_gameId_createdAt_idx" ON public."TurnEntry" USING btree ("gameId", "createdAt");


--
-- Name: TurnGame_groupId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TurnGame_groupId_status_idx" ON public."TurnGame" USING btree ("groupId", status);


--
-- Name: TurnParticipant_gameId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TurnParticipant_gameId_userId_key" ON public."TurnParticipant" USING btree ("gameId", "userId");


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
-- Name: BingoBoard BingoBoard_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BingoBoard"
    ADD CONSTRAINT "BingoBoard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BingoCell BingoCell_boardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BingoCell"
    ADD CONSTRAINT "BingoCell_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES public."BingoBoard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BoardComment BoardComment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoardComment"
    ADD CONSTRAINT "BoardComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BoardComment BoardComment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoardComment"
    ADD CONSTRAINT "BoardComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."BoardPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BoardPost BoardPost_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoardPost"
    ADD CONSTRAINT "BoardPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BoardPost BoardPost_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BoardPost"
    ADD CONSTRAINT "BoardPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComplimentCard ComplimentCard_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentCard"
    ADD CONSTRAINT "ComplimentCard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComplimentCard ComplimentCard_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentCard"
    ADD CONSTRAINT "ComplimentCard_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComplimentCard ComplimentCard_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentCard"
    ADD CONSTRAINT "ComplimentCard_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComplimentReaction ComplimentReaction_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentReaction"
    ADD CONSTRAINT "ComplimentReaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."ComplimentCard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ComplimentReaction ComplimentReaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentReaction"
    ADD CONSTRAINT "ComplimentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComplimentSetting ComplimentSetting_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplimentSetting"
    ADD CONSTRAINT "ComplimentSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DailyPick DailyPick_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyPick"
    ADD CONSTRAINT "DailyPick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DinnerPlace DinnerPlace_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPlace"
    ADD CONSTRAINT "DinnerPlace_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DinnerPollDate DinnerPollDate_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPollDate"
    ADD CONSTRAINT "DinnerPollDate_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."DinnerPoll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DinnerPollPlace DinnerPollPlace_placeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPollPlace"
    ADD CONSTRAINT "DinnerPollPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES public."DinnerPlace"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DinnerPollPlace DinnerPollPlace_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPollPlace"
    ADD CONSTRAINT "DinnerPollPlace_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."DinnerPoll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DinnerPoll DinnerPoll_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerPoll"
    ADD CONSTRAINT "DinnerPoll_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DinnerVote DinnerVote_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerVote"
    ADD CONSTRAINT "DinnerVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."DinnerPoll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DinnerVote DinnerVote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DinnerVote"
    ADD CONSTRAINT "DinnerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DutyLog DutyLog_dutyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DutyLog"
    ADD CONSTRAINT "DutyLog_dutyId_fkey" FOREIGN KEY ("dutyId") REFERENCES public."Duty"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Duty Duty_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Duty"
    ADD CONSTRAINT "Duty_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthComment EmployeeOfTheMonthComment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthComment"
    ADD CONSTRAINT "EmployeeOfTheMonthComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthComment EmployeeOfTheMonthComment_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthComment"
    ADD CONSTRAINT "EmployeeOfTheMonthComment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthComment EmployeeOfTheMonthComment_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthComment"
    ADD CONSTRAINT "EmployeeOfTheMonthComment_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthNomination EmployeeOfTheMonthNomination_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthNomination"
    ADD CONSTRAINT "EmployeeOfTheMonthNomination_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthNomination EmployeeOfTheMonthNomination_nominatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthNomination"
    ADD CONSTRAINT "EmployeeOfTheMonthNomination_nominatorId_fkey" FOREIGN KEY ("nominatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthNomination EmployeeOfTheMonthNomination_nomineeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthNomination"
    ADD CONSTRAINT "EmployeeOfTheMonthNomination_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonthSetting EmployeeOfTheMonthSetting_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonthSetting"
    ADD CONSTRAINT "EmployeeOfTheMonthSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonth EmployeeOfTheMonth_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonth"
    ADD CONSTRAINT "EmployeeOfTheMonth_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeOfTheMonth EmployeeOfTheMonth_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeOfTheMonth"
    ADD CONSTRAINT "EmployeeOfTheMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeatureSetting FeatureSetting_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureSetting"
    ADD CONSTRAINT "FeatureSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GamePhoto GamePhoto_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GamePhoto"
    ADD CONSTRAINT "GamePhoto_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GameScore GameScore_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GameScore"
    ADD CONSTRAINT "GameScore_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GameScore GameScore_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GameScore"
    ADD CONSTRAINT "GameScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GroupBadgeRule GroupBadgeRule_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupBadgeRule"
    ADD CONSTRAINT "GroupBadgeRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GroupFeature GroupFeature_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupFeature"
    ADD CONSTRAINT "GroupFeature_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: GroupPointRule GroupPointRule_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupPointRule"
    ADD CONSTRAINT "GroupPointRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InquiryReply InquiryReply_inquiryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InquiryReply"
    ADD CONSTRAINT "InquiryReply_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES public."Inquiry"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Inquiry Inquiry_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManittoAssignment ManittoAssignment_giverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoAssignment"
    ADD CONSTRAINT "ManittoAssignment_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManittoAssignment ManittoAssignment_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoAssignment"
    ADD CONSTRAINT "ManittoAssignment_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManittoAssignment ManittoAssignment_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoAssignment"
    ADD CONSTRAINT "ManittoAssignment_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."ManittoRound"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ManittoMessage ManittoMessage_assignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoMessage"
    ADD CONSTRAINT "ManittoMessage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."ManittoAssignment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ManittoMessage ManittoMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoMessage"
    ADD CONSTRAINT "ManittoMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManittoRound ManittoRound_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManittoRound"
    ADD CONSTRAINT "ManittoRound_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: NoticeRead NoticeRead_noticeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NoticeRead"
    ADD CONSTRAINT "NoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES public."Notice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notice Notice_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notice"
    ADD CONSTRAINT "Notice_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PhotoMission PhotoMission_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhotoMission"
    ADD CONSTRAINT "PhotoMission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PhotoMission PhotoMission_hostId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhotoMission"
    ADD CONSTRAINT "PhotoMission_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PhotoSubmission PhotoSubmission_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhotoSubmission"
    ADD CONSTRAINT "PhotoSubmission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PhotoSubmission PhotoSubmission_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhotoSubmission"
    ADD CONSTRAINT "PhotoSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."PhotoMission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PointAdjustment PointAdjustment_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointAdjustment"
    ADD CONSTRAINT "PointAdjustment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PointAdjustment PointAdjustment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointAdjustment"
    ADD CONSTRAINT "PointAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PointLedger PointLedger_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointLedger"
    ADD CONSTRAINT "PointLedger_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PointLedger PointLedger_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointLedger"
    ADD CONSTRAINT "PointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileFact ProfileFact_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileFact"
    ADD CONSTRAINT "ProfileFact_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RollingPaperNote RollingPaperNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RollingPaperNote"
    ADD CONSTRAINT "RollingPaperNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RollingPaperNote RollingPaperNote_paperId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RollingPaperNote"
    ADD CONSTRAINT "RollingPaperNote_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES public."RollingPaper"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RollingPaper RollingPaper_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RollingPaper"
    ADD CONSTRAINT "RollingPaper_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RollingPaper RollingPaper_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RollingPaper"
    ADD CONSTRAINT "RollingPaper_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SnackGame SnackGame_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackGame"
    ADD CONSTRAINT "SnackGame_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SnackParticipant SnackParticipant_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackParticipant"
    ADD CONSTRAINT "SnackParticipant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."SnackGame"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SnackParticipant SnackParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackParticipant"
    ADD CONSTRAINT "SnackParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SnackSlot SnackSlot_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnackSlot"
    ADD CONSTRAINT "SnackSlot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."SnackGame"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SuggestionVote SuggestionVote_suggestionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SuggestionVote"
    ADD CONSTRAINT "SuggestionVote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES public."Suggestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Suggestion Suggestion_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Suggestion"
    ADD CONSTRAINT "Suggestion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurveyQuestion SurveyQuestion_surveyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveyQuestion"
    ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES public."Survey"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SurveyResponse SurveyResponse_surveyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveyResponse"
    ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES public."Survey"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SurveyResponse SurveyResponse_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurveyResponse"
    ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Survey Survey_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Survey"
    ADD CONSTRAINT "Survey_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Survey Survey_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Survey"
    ADD CONSTRAINT "Survey_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: TermsAgreement TermsAgreement_termsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TermsAgreement"
    ADD CONSTRAINT "TermsAgreement_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES public."Terms"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TurnEntry TurnEntry_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TurnEntry"
    ADD CONSTRAINT "TurnEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."TurnGame"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TurnGame TurnGame_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TurnGame"
    ADD CONSTRAINT "TurnGame_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TurnParticipant TurnParticipant_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TurnParticipant"
    ADD CONSTRAINT "TurnParticipant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."TurnGame"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict eyRnhfNT8qTzQGsGwXI4bHKcPaMmWsgetLp0HPK2NLzedxgtlmWLqw55ukXldTd

