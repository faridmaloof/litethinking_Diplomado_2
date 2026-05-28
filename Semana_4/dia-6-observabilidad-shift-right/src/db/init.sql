create table if not exists users (
  id serial primary key,
  username varchar(80) not null unique,
  full_name varchar(120) not null,
  email varchar(120) not null
);

create table if not exists accounts (
  account_number varchar(32) primary key,
  user_id integer not null references users(id),
  balance numeric(12, 2) not null default 0,
  currency varchar(8) not null default 'USD'
);

create table if not exists transfers (
  id uuid primary key,
  trace_id varchar(64) not null unique,
  user_id integer not null references users(id),
  source_account varchar(32) not null,
  target_account varchar(32) not null,
  amount numeric(12, 2) not null,
  status varchar(20) not null,
  created_at timestamptz not null default now()
);

-- Intentionally different from the worker insert used in the DB incident.
create table if not exists payment_audit (
  id uuid primary key,
  trace_id varchar(64) not null,
  source_account varchar(32) not null,
  beneficiary_account varchar(32) not null,
  amount numeric(12, 2) not null,
  status varchar(20) not null,
  created_at timestamptz not null default now()
);

insert into users (username, full_name, email)
values
  ('Juan_123', 'Juan Perez', 'juan@example.com'),
  ('Ana_456', 'Ana Gomez', 'ana@example.com')
on conflict (username) do nothing;

insert into accounts (account_number, user_id, balance, currency)
values
  ('ACC-001', (select id from users where username = 'Juan_123'), 1500.00, 'USD'),
  ('ACC-002', (select id from users where username = 'Ana_456'), 900.00, 'USD')
on conflict (account_number) do nothing;
