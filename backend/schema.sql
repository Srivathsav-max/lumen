-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.roles (
  name character varying NOT NULL UNIQUE,
  description text,
  id integer NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schema_migrations (
  version bigint NOT NULL,
  dirty boolean NOT NULL,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE public.system_settings (
  key character varying NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.tokens (
  user_id integer,
  refresh_token character varying NOT NULL UNIQUE,
  device_info text,
  expires_at timestamp with time zone NOT NULL,
  id integer NOT NULL DEFAULT nextval('tokens_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tokens_pkey PRIMARY KEY (id),
  CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_roles (
  user_id integer NOT NULL,
  role_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.user_tokens (
  id integer NOT NULL DEFAULT nextval('user_tokens_id_seq'::regclass),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id integer NOT NULL,
  permanent_token character varying NOT NULL,
  last_used_at timestamp without time zone,
  device_info text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT user_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  username character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  first_name character varying,
  last_name character varying,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  password_hash character varying NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.verification_tokens (
  id integer NOT NULL DEFAULT nextval('verification_tokens_id_seq'::regclass),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id integer NOT NULL,
  token character varying NOT NULL,
  type character varying NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  used_at timestamp without time zone,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.waitlist (
  email character varying NOT NULL UNIQUE,
  name character varying,
  notes text,
  id integer NOT NULL DEFAULT nextval('waitlist_id_seq'::regclass),
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);