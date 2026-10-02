--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg110+1)
-- Dumped by pg_dump version 17.5 (Debian 17.5-1.pgdg110+1)

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
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: rapid_mind
--

CREATE SCHEMA tiger;


ALTER SCHEMA tiger OWNER TO rapid_mind;

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: rapid_mind
--

CREATE SCHEMA tiger_data;


ALTER SCHEMA tiger_data OWNER TO rapid_mind;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: rapid_mind
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO rapid_mind;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: rapid_mind
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder WITH SCHEMA tiger;


--
-- Name: EXTENSION postgis_tiger_geocoder; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assessments; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.assessments (
    id uuid NOT NULL,
    patient_id uuid NOT NULL,
    user_id bigint NOT NULL,
    status character varying(255) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    mode character varying(255) DEFAULT 'VERBAL'::character varying NOT NULL,
    started_at timestamp(0) without time zone,
    completed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.assessments OWNER TO rapid_mind;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id bigint,
    action character varying(255) NOT NULL,
    entity_type character varying(255) NOT NULL,
    entity_id character varying(255) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.audit_logs OWNER TO rapid_mind;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO rapid_mind;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache OWNER TO rapid_mind;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO rapid_mind;

--
-- Name: clinical_validations; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.clinical_validations (
    id bigint NOT NULL,
    assessment_id uuid NOT NULL,
    validated_by bigint NOT NULL,
    clinical_result character varying(255),
    diagnosis_notes text,
    intervention_plan text,
    referral_required boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.clinical_validations OWNER TO rapid_mind;

--
-- Name: clinical_validations_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.clinical_validations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_validations_id_seq OWNER TO rapid_mind;

--
-- Name: clinical_validations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.clinical_validations_id_seq OWNED BY public.clinical_validations.id;


--
-- Name: emergency_events; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.emergency_events (
    id uuid NOT NULL,
    patient_id uuid,
    assessment_id uuid,
    user_id bigint NOT NULL,
    red_flag_type character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    shelter_id bigint,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.emergency_events OWNER TO rapid_mind;

--
-- Name: emergency_verifications; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.emergency_verifications (
    id bigint NOT NULL,
    emergency_event_id uuid NOT NULL,
    verified_by bigint NOT NULL,
    method character varying(255),
    clinical_result character varying(255),
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.emergency_verifications OWNER TO rapid_mind;

--
-- Name: emergency_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.emergency_verifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergency_verifications_id_seq OWNER TO rapid_mind;

--
-- Name: emergency_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.emergency_verifications_id_seq OWNED BY public.emergency_verifications.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO rapid_mind;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.failed_jobs_id_seq OWNER TO rapid_mind;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: function_responses; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.function_responses (
    id bigint NOT NULL,
    assessment_id uuid NOT NULL,
    domain character varying(255) NOT NULL,
    level smallint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.function_responses OWNER TO rapid_mind;

--
-- Name: function_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.function_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.function_responses_id_seq OWNER TO rapid_mind;

--
-- Name: function_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.function_responses_id_seq OWNED BY public.function_responses.id;


--
-- Name: healthcare_facilities; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.healthcare_facilities (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255),
    address character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.healthcare_facilities OWNER TO rapid_mind;

--
-- Name: healthcare_facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.healthcare_facilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.healthcare_facilities_id_seq OWNER TO rapid_mind;

--
-- Name: healthcare_facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.healthcare_facilities_id_seq OWNED BY public.healthcare_facilities.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO rapid_mind;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO rapid_mind;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO rapid_mind;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO rapid_mind;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO rapid_mind;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO rapid_mind;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.patients (
    id uuid NOT NULL,
    nik character varying(255),
    name character varying(255) NOT NULL,
    age integer,
    gender character varying(255),
    shelter_id bigint,
    created_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.patients OWNER TO rapid_mind;

--
-- Name: referral_status_history; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.referral_status_history (
    id bigint NOT NULL,
    referral_id uuid NOT NULL,
    status character varying(255) NOT NULL,
    changed_by bigint NOT NULL,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.referral_status_history OWNER TO rapid_mind;

--
-- Name: referral_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.referral_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_status_history_id_seq OWNER TO rapid_mind;

--
-- Name: referral_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.referral_status_history_id_seq OWNED BY public.referral_status_history.id;


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.referrals (
    id uuid NOT NULL,
    emergency_event_id uuid,
    patient_id uuid NOT NULL,
    referred_by bigint NOT NULL,
    facility_id bigint NOT NULL,
    status character varying(255) DEFAULT 'ACTIVE'::character varying NOT NULL,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.referrals OWNER TO rapid_mind;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.refresh_tokens (
    id bigint NOT NULL,
    jti character varying(255) NOT NULL,
    user_id bigint NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    revoked_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.refresh_tokens OWNER TO rapid_mind;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO rapid_mind;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.regions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    geometry public.geometry(MultiPolygon,4326)
);


ALTER TABLE public.regions OWNER TO rapid_mind;

--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.regions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regions_id_seq OWNER TO rapid_mind;

--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: risk_responses; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.risk_responses (
    id bigint NOT NULL,
    assessment_id uuid NOT NULL,
    indicator character varying(255) NOT NULL,
    answer boolean NOT NULL,
    weight smallint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.risk_responses OWNER TO rapid_mind;

--
-- Name: risk_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.risk_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.risk_responses_id_seq OWNER TO rapid_mind;

--
-- Name: risk_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.risk_responses_id_seq OWNED BY public.risk_responses.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO rapid_mind;

--
-- Name: shelters; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.shelters (
    id bigint NOT NULL,
    region_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    location public.geometry(Point,4326)
);


ALTER TABLE public.shelters OWNER TO rapid_mind;

--
-- Name: shelters_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.shelters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shelters_id_seq OWNER TO rapid_mind;

--
-- Name: shelters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.shelters_id_seq OWNED BY public.shelters.id;


--
-- Name: srq_responses; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.srq_responses (
    id bigint NOT NULL,
    assessment_id uuid NOT NULL,
    question_number smallint NOT NULL,
    answer boolean NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.srq_responses OWNER TO rapid_mind;

--
-- Name: srq_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.srq_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.srq_responses_id_seq OWNER TO rapid_mind;

--
-- Name: srq_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.srq_responses_id_seq OWNED BY public.srq_responses.id;


--
-- Name: triage_results; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.triage_results (
    id bigint NOT NULL,
    assessment_id uuid NOT NULL,
    srq_score smallint DEFAULT '0'::smallint NOT NULL,
    risk_score smallint DEFAULT '0'::smallint NOT NULL,
    function_score smallint DEFAULT '0'::smallint NOT NULL,
    total_score smallint DEFAULT '0'::smallint NOT NULL,
    system_recommendation character varying(255) NOT NULL,
    is_red_flag_override boolean DEFAULT false NOT NULL,
    red_flag_source character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.triage_results OWNER TO rapid_mind;

--
-- Name: triage_results_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.triage_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.triage_results_id_seq OWNER TO rapid_mind;

--
-- Name: triage_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.triage_results_id_seq OWNED BY public.triage_results.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: rapid_mind
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    role character varying(255) DEFAULT 'RELAWAN'::character varying NOT NULL,
    token_version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    facility_id bigint,
    shelter_id bigint
);


ALTER TABLE public.users OWNER TO rapid_mind;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: rapid_mind
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO rapid_mind;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rapid_mind
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: clinical_validations id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.clinical_validations ALTER COLUMN id SET DEFAULT nextval('public.clinical_validations_id_seq'::regclass);


--
-- Name: emergency_verifications id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_verifications ALTER COLUMN id SET DEFAULT nextval('public.emergency_verifications_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: function_responses id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.function_responses ALTER COLUMN id SET DEFAULT nextval('public.function_responses_id_seq'::regclass);


--
-- Name: healthcare_facilities id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.healthcare_facilities ALTER COLUMN id SET DEFAULT nextval('public.healthcare_facilities_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: referral_status_history id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referral_status_history ALTER COLUMN id SET DEFAULT nextval('public.referral_status_history_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: risk_responses id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.risk_responses ALTER COLUMN id SET DEFAULT nextval('public.risk_responses_id_seq'::regclass);


--
-- Name: shelters id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.shelters ALTER COLUMN id SET DEFAULT nextval('public.shelters_id_seq'::regclass);


--
-- Name: srq_responses id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.srq_responses ALTER COLUMN id SET DEFAULT nextval('public.srq_responses_id_seq'::regclass);


--
-- Name: triage_results id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.triage_results ALTER COLUMN id SET DEFAULT nextval('public.triage_results_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.assessments (id, patient_id, user_id, status, mode, started_at, completed_at, created_at, updated_at) FROM stdin;
01a0efb1-9aa0-7027-8c03-d29857930124	01a0efb1-9a97-73d1-8733-15a9ce52a322	19	COMPLETED	NON_VERBAL	2026-09-30 00:23:09	2026-09-30 00:26:56	2026-09-30 00:23:09	2026-09-30 00:26:56
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.audit_logs (id, actor_id, action, entity_type, entity_id, old_values, new_values, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.cache (key, value, expiration) FROM stdin;
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: clinical_validations; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.clinical_validations (id, assessment_id, validated_by, clinical_result, diagnosis_notes, intervention_plan, referral_required, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: emergency_events; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.emergency_events (id, patient_id, assessment_id, user_id, red_flag_type, status, latitude, longitude, shelter_id, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: emergency_verifications; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.emergency_verifications (id, emergency_event_id, verified_by, method, clinical_result, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: function_responses; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.function_responses (id, assessment_id, domain, level, created_at, updated_at) FROM stdin;
24	01a0efb1-9aa0-7027-8c03-d29857930124	F1	0	2026-09-30 00:25:50	2026-09-30 00:25:50
25	01a0efb1-9aa0-7027-8c03-d29857930124	F2	0	2026-09-30 00:25:50	2026-09-30 00:25:50
26	01a0efb1-9aa0-7027-8c03-d29857930124	F3	1	2026-09-30 00:25:50	2026-09-30 00:25:50
\.


--
-- Data for Name: healthcare_facilities; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.healthcare_facilities (id, name, type, address, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_09_29_150000_create_regions_table	1
5	2026_09_29_150001_create_shelters_table	1
6	2026_09_29_150002_create_healthcare_facilities_table	1
7	2026_09_29_150003_extend_users_table	1
8	2026_09_29_150004_create_patients_table	1
9	2026_09_29_150005_create_assessments_table	1
10	2026_09_29_150006_create_srq_responses_table	1
11	2026_09_29_150007_create_risk_responses_table	1
12	2026_09_29_150008_create_function_responses_table	1
13	2026_09_29_150009_create_triage_results_table	1
14	2026_09_29_150010_create_emergency_events_table	1
15	2026_09_29_150011_create_emergency_verifications_table	1
16	2026_09_29_150012_create_clinical_validations_table	1
17	2026_09_29_150013_create_referrals_table	1
18	2026_09_29_150014_create_referral_status_history_table	1
19	2026_09_29_150015_create_audit_logs_table	1
20	2026_09_29_150016_create_refresh_tokens_table	1
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.patients (id, nik, name, age, gender, shelter_id, created_by, created_at, updated_at) FROM stdin;
01a0efb1-9a97-73d1-8733-15a9ce52a322	\N	sadasdasdas	80	Perempuan	\N	19	2026-09-30 00:23:09	2026-09-30 00:23:09
\.


--
-- Data for Name: referral_status_history; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.referral_status_history (id, referral_id, status, changed_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.referrals (id, emergency_event_id, patient_id, referred_by, facility_id, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.refresh_tokens (id, jti, user_id, expires_at, revoked_at, created_at, updated_at) FROM stdin;
1	e21c8833-8c77-4559-96df-271483065038	19	2026-10-07 00:02:01	\N	2026-09-30 00:02:01	2026-09-30 00:02:01
2	c8d71b6a-5da0-469c-93ef-2d67dab2cae0	20	2026-10-07 00:02:01	\N	2026-09-30 00:02:01	2026-09-30 00:02:01
3	93b72657-78ed-441b-9719-6579b26f5fa3	21	2026-10-07 00:02:01	\N	2026-09-30 00:02:01	2026-09-30 00:02:01
4	773aec68-c9b0-42be-bdb8-1b9f3da0e554	19	2026-10-07 00:02:01	\N	2026-09-30 00:02:01	2026-09-30 00:02:01
5	1d38c9db-bac7-4dc1-ab12-d1c75a37a98d	19	2026-10-07 00:22:23	\N	2026-09-30 00:22:23	2026-09-30 00:22:23
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.regions (id, name, created_at, updated_at, geometry) FROM stdin;
\.


--
-- Data for Name: risk_responses; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.risk_responses (id, assessment_id, indicator, answer, weight, created_at, updated_at) FROM stdin;
38	01a0efb1-9aa0-7027-8c03-d29857930124	R1	f	2	2026-09-30 00:25:45	2026-09-30 00:25:45
39	01a0efb1-9aa0-7027-8c03-d29857930124	R2	f	2	2026-09-30 00:25:45	2026-09-30 00:25:45
40	01a0efb1-9aa0-7027-8c03-d29857930124	R3	t	1	2026-09-30 00:25:45	2026-09-30 00:25:45
41	01a0efb1-9aa0-7027-8c03-d29857930124	R4	t	2	2026-09-30 00:25:45	2026-09-30 00:25:45
42	01a0efb1-9aa0-7027-8c03-d29857930124	R5	t	1	2026-09-30 00:25:45	2026-09-30 00:25:45
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
4Zc86h1DRUTPnNKHwTTUbEdaG9wO5U06AwbmUJSK	19	172.20.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	eyJfdG9rZW4iOiJnWWVVNnJicXB4VXVCT0ZFNUEyMjZyOFR1WW9xdnBvUkxvbkJHRlUzIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2xvY2FsaG9zdDo4MDgwXC9yZWxhd2FuXC9ob21lIiwicm91dGUiOiJyZWxhd2FuLmhvbWUifSwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119LCJsb2dpbl93ZWJfNTliYTM2YWRkYzJiMmY5NDAxNTgwZjAxNGM3ZjU4ZWE0ZTMwOTg5ZCI6MTksInBhc3N3b3JkX2hhc2hfd2ViIjoiZmRhMDgyMjkxYjA0ZmMwY2Q0ZjgyYzQ3MjU4OTQwOWFiMWU4YTU2ZThiODBhODFhY2QwNTFlYmI3NWVmZjdjMSJ9	1790728023
\.


--
-- Data for Name: shelters; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.shelters (id, region_id, name, address, is_active, created_at, updated_at, location) FROM stdin;
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: srq_responses; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.srq_responses (id, assessment_id, question_number, answer, created_at, updated_at) FROM stdin;
161	01a0efb1-9aa0-7027-8c03-d29857930124	1	f	2026-09-30 00:23:41	2026-09-30 00:23:41
162	01a0efb1-9aa0-7027-8c03-d29857930124	2	t	2026-09-30 00:23:41	2026-09-30 00:23:41
163	01a0efb1-9aa0-7027-8c03-d29857930124	3	f	2026-09-30 00:23:41	2026-09-30 00:23:41
164	01a0efb1-9aa0-7027-8c03-d29857930124	4	f	2026-09-30 00:23:41	2026-09-30 00:23:41
165	01a0efb1-9aa0-7027-8c03-d29857930124	5	t	2026-09-30 00:23:41	2026-09-30 00:23:41
166	01a0efb1-9aa0-7027-8c03-d29857930124	6	f	2026-09-30 00:23:41	2026-09-30 00:23:41
167	01a0efb1-9aa0-7027-8c03-d29857930124	7	f	2026-09-30 00:23:41	2026-09-30 00:23:41
168	01a0efb1-9aa0-7027-8c03-d29857930124	8	t	2026-09-30 00:23:41	2026-09-30 00:23:41
169	01a0efb1-9aa0-7027-8c03-d29857930124	9	t	2026-09-30 00:23:41	2026-09-30 00:23:41
170	01a0efb1-9aa0-7027-8c03-d29857930124	10	t	2026-09-30 00:23:41	2026-09-30 00:23:41
171	01a0efb1-9aa0-7027-8c03-d29857930124	11	t	2026-09-30 00:23:41	2026-09-30 00:23:41
172	01a0efb1-9aa0-7027-8c03-d29857930124	12	t	2026-09-30 00:23:41	2026-09-30 00:23:41
173	01a0efb1-9aa0-7027-8c03-d29857930124	13	t	2026-09-30 00:23:41	2026-09-30 00:23:41
174	01a0efb1-9aa0-7027-8c03-d29857930124	14	t	2026-09-30 00:23:41	2026-09-30 00:23:41
175	01a0efb1-9aa0-7027-8c03-d29857930124	15	t	2026-09-30 00:23:41	2026-09-30 00:23:41
176	01a0efb1-9aa0-7027-8c03-d29857930124	16	t	2026-09-30 00:23:41	2026-09-30 00:23:41
177	01a0efb1-9aa0-7027-8c03-d29857930124	17	f	2026-09-30 00:23:41	2026-09-30 00:23:41
178	01a0efb1-9aa0-7027-8c03-d29857930124	18	t	2026-09-30 00:23:41	2026-09-30 00:23:41
179	01a0efb1-9aa0-7027-8c03-d29857930124	19	t	2026-09-30 00:23:41	2026-09-30 00:23:41
180	01a0efb1-9aa0-7027-8c03-d29857930124	20	t	2026-09-30 00:23:41	2026-09-30 00:23:41
\.


--
-- Data for Name: triage_results; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.triage_results (id, assessment_id, srq_score, risk_score, function_score, total_score, system_recommendation, is_red_flag_override, red_flag_source, created_at, updated_at) FROM stdin;
2	01a0efb1-9aa0-7027-8c03-d29857930124	14	4	1	19	T1	f	\N	2026-09-30 00:26:56	2026-09-30 00:26:56
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: rapid_mind
--

COPY public.users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at, role, token_version, is_active, facility_id, shelter_id) FROM stdin;
19	Relawan Lapangan Budi	relawan@rapidmind.id	\N	$2y$04$rKjMZ.jTV9dew1UQ3RrkTOUCK6Mx6DEhC5pX2kR7AoRr8IGZD4M5.	\N	2026-09-30 00:02:01	2026-09-30 00:02:01	RELAWAN	1	t	\N	\N
20	dr. Rina Suryani	nakes@rapidmind.id	\N	$2y$04$xZfPe9CWT7wkvdn0uvTdHOb9OBoCy5p6G6WzDNDg9fP6Hov7Quax6	\N	2026-09-30 00:02:01	2026-09-30 00:02:01	HEALTHCARE	1	t	\N	\N
21	Admin BPBD	admin@rapidmind.id	\N	$2y$04$hJInpb.cgegdteVA8B/pKuEmRqNRAv/8oz8Oued.a.1wyTDzTaY1q	\N	2026-09-30 00:02:01	2026-09-30 00:02:01	ADMIN	1	t	\N	\N
\.


--
-- Data for Name: geocode_settings; Type: TABLE DATA; Schema: tiger; Owner: rapid_mind
--

COPY tiger.geocode_settings (name, setting, unit, category, short_desc) FROM stdin;
\.


--
-- Data for Name: pagc_gaz; Type: TABLE DATA; Schema: tiger; Owner: rapid_mind
--

COPY tiger.pagc_gaz (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_lex; Type: TABLE DATA; Schema: tiger; Owner: rapid_mind
--

COPY tiger.pagc_lex (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_rules; Type: TABLE DATA; Schema: tiger; Owner: rapid_mind
--

COPY tiger.pagc_rules (id, rule, is_custom) FROM stdin;
\.


--
-- Data for Name: topology; Type: TABLE DATA; Schema: topology; Owner: rapid_mind
--

COPY topology.topology (id, name, srid, "precision", hasz) FROM stdin;
\.


--
-- Data for Name: layer; Type: TABLE DATA; Schema: topology; Owner: rapid_mind
--

COPY topology.layer (topology_id, layer_id, schema_name, table_name, feature_column, feature_type, level, child_id) FROM stdin;
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: clinical_validations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.clinical_validations_id_seq', 1, false);


--
-- Name: emergency_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.emergency_verifications_id_seq', 1, false);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: function_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.function_responses_id_seq', 26, true);


--
-- Name: healthcare_facilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.healthcare_facilities_id_seq', 1, false);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.migrations_id_seq', 20, true);


--
-- Name: referral_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.referral_status_history_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 5, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.regions_id_seq', 1, false);


--
-- Name: risk_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.risk_responses_id_seq', 42, true);


--
-- Name: shelters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.shelters_id_seq', 1, false);


--
-- Name: srq_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.srq_responses_id_seq', 180, true);


--
-- Name: triage_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.triage_results_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rapid_mind
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


--
-- Name: topology_id_seq; Type: SEQUENCE SET; Schema: topology; Owner: rapid_mind
--

SELECT pg_catalog.setval('topology.topology_id_seq', 1, false);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: clinical_validations clinical_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.clinical_validations
    ADD CONSTRAINT clinical_validations_pkey PRIMARY KEY (id);


--
-- Name: emergency_events emergency_events_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_events
    ADD CONSTRAINT emergency_events_pkey PRIMARY KEY (id);


--
-- Name: emergency_verifications emergency_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_verifications
    ADD CONSTRAINT emergency_verifications_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: function_responses function_responses_assessment_id_domain_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.function_responses
    ADD CONSTRAINT function_responses_assessment_id_domain_unique UNIQUE (assessment_id, domain);


--
-- Name: function_responses function_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.function_responses
    ADD CONSTRAINT function_responses_pkey PRIMARY KEY (id);


--
-- Name: healthcare_facilities healthcare_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.healthcare_facilities
    ADD CONSTRAINT healthcare_facilities_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: referral_status_history referral_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referral_status_history
    ADD CONSTRAINT referral_status_history_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_jti_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_jti_unique UNIQUE (jti);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: risk_responses risk_responses_assessment_id_indicator_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.risk_responses
    ADD CONSTRAINT risk_responses_assessment_id_indicator_unique UNIQUE (assessment_id, indicator);


--
-- Name: risk_responses risk_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.risk_responses
    ADD CONSTRAINT risk_responses_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shelters shelters_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_pkey PRIMARY KEY (id);


--
-- Name: srq_responses srq_responses_assessment_id_question_number_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.srq_responses
    ADD CONSTRAINT srq_responses_assessment_id_question_number_unique UNIQUE (assessment_id, question_number);


--
-- Name: srq_responses srq_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.srq_responses
    ADD CONSTRAINT srq_responses_pkey PRIMARY KEY (id);


--
-- Name: triage_results triage_results_assessment_id_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.triage_results
    ADD CONSTRAINT triage_results_assessment_id_unique UNIQUE (assessment_id);


--
-- Name: triage_results triage_results_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.triage_results
    ADD CONSTRAINT triage_results_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: patients_nik_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX patients_nik_index ON public.patients USING btree (nik);


--
-- Name: refresh_tokens_user_id_revoked_at_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX refresh_tokens_user_id_revoked_at_index ON public.refresh_tokens USING btree (user_id, revoked_at);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: rapid_mind
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: assessments assessments_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_foreign FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: clinical_validations clinical_validations_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.clinical_validations
    ADD CONSTRAINT clinical_validations_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: clinical_validations clinical_validations_validated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.clinical_validations
    ADD CONSTRAINT clinical_validations_validated_by_foreign FOREIGN KEY (validated_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: emergency_events emergency_events_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_events
    ADD CONSTRAINT emergency_events_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: emergency_events emergency_events_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_events
    ADD CONSTRAINT emergency_events_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: emergency_events emergency_events_shelter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_events
    ADD CONSTRAINT emergency_events_shelter_id_foreign FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE SET NULL;


--
-- Name: emergency_events emergency_events_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_events
    ADD CONSTRAINT emergency_events_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: emergency_verifications emergency_verifications_emergency_event_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_verifications
    ADD CONSTRAINT emergency_verifications_emergency_event_id_foreign FOREIGN KEY (emergency_event_id) REFERENCES public.emergency_events(id) ON DELETE CASCADE;


--
-- Name: emergency_verifications emergency_verifications_verified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.emergency_verifications
    ADD CONSTRAINT emergency_verifications_verified_by_foreign FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: function_responses function_responses_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.function_responses
    ADD CONSTRAINT function_responses_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: patients patients_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patients patients_shelter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_shelter_id_foreign FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE SET NULL;


--
-- Name: referral_status_history referral_status_history_changed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referral_status_history
    ADD CONSTRAINT referral_status_history_changed_by_foreign FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referral_status_history referral_status_history_referral_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referral_status_history
    ADD CONSTRAINT referral_status_history_referral_id_foreign FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_emergency_event_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_emergency_event_id_foreign FOREIGN KEY (emergency_event_id) REFERENCES public.emergency_events(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_facility_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_facility_id_foreign FOREIGN KEY (facility_id) REFERENCES public.healthcare_facilities(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_by_foreign FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: risk_responses risk_responses_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.risk_responses
    ADD CONSTRAINT risk_responses_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: shelters shelters_region_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.shelters
    ADD CONSTRAINT shelters_region_id_foreign FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: srq_responses srq_responses_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.srq_responses
    ADD CONSTRAINT srq_responses_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: triage_results triage_results_assessment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.triage_results
    ADD CONSTRAINT triage_results_assessment_id_foreign FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: users users_facility_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_facility_id_foreign FOREIGN KEY (facility_id) REFERENCES public.healthcare_facilities(id) ON DELETE SET NULL;


--
-- Name: users users_shelter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: rapid_mind
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_shelter_id_foreign FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

