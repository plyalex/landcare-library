-- =====================================================================
-- Landcare Library: Supabase schema
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run on a fresh project. Loan rules (1 month, 2 renewals) live
-- in the functions below so they are enforced on the server.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Settings (not exposed through the API)
-- ---------------------------------------------------------------------
create table if not exists private.settings (
  key   text primary key,
  value text not null
);

-- Change this after running the script:
--   update private.settings set value = 'your-new-code' where key = 'join_code';
insert into private.settings (key, value)
values ('join_code', 'change-me')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  phone        text,
  pickup_notes text,
  is_member    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.books (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  title          text not null check (length(title) between 1 and 300),
  subtitle       text,
  authors        text[] not null default '{}',
  isbn           text,
  publisher      text,
  published_year int,
  page_count     int,
  description    text,
  categories     text[] not null default '{}',
  cover_url      text,
  info_url       text,
  notes          text,
  available      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists books_owner_idx on public.books (owner_id);

do $$ begin
  create type public.loan_status as enum
    ('requested', 'approved', 'active', 'returned', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.loans (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.books(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  borrower_id  uuid not null references public.profiles(id) on delete cascade,
  status       public.loan_status not null default 'requested',
  pickup_date  date,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  started_on   date,
  due_date     date,
  renewals     int not null default 0 check (renewals between 0 and 2),
  returned_at  timestamptz,
  check (owner_id <> borrower_id)
);
create index if not exists loans_book_idx on public.loans (book_id);
create index if not exists loans_borrower_idx on public.loans (borrower_id);
create index if not exists loans_owner_idx on public.loans (owner_id);
-- A book can only be reserved or out with one person at a time
create unique index if not exists loans_one_open_per_book
  on public.loans (book_id) where status in ('approved', 'active');
-- A member can only have one open request per book
create unique index if not exists loans_one_open_per_borrower
  on public.loans (book_id, borrower_id) where status in ('requested', 'approved', 'active');

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  loan_id      uuid references public.loans(id) on delete set null,
  body         text not null check (length(body) between 1 and 4000),
  is_system    boolean not null default false,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index if not exists messages_recipient_idx on public.messages (recipient_id, read_at);
create index if not exists messages_sender_idx on public.messages (sender_id);

-- Used by the daily reminder job so the same reminder is never sent twice
create table if not exists public.reminder_log (
  loan_id uuid not null references public.loans(id) on delete cascade,
  kind    text not null,
  sent_on date not null,
  primary key (loan_id, kind, sent_on)
);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_member from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.melbourne_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Australia/Melbourne')::date;
$$;

-- New sign-ups get a profile. They become members only if they used the join code.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
begin
  select value into v_code from private.settings where key = 'join_code';
  insert into public.profiles (id, full_name, is_member)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_code is not null
      and lower(trim(coalesce(new.raw_user_meta_data->>'join_code', ''))) = lower(trim(v_code))
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.check_join_code(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.settings
    where key = 'join_code' and lower(trim(value)) = lower(trim(coalesce(p_code, '')))
  );
$$;

-- Lets a signed-in non-member join later by entering the code
create or replace function public.join_with_code(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.check_join_code(p_code) then
    return false;
  end if;
  update public.profiles set is_member = true where id = auth.uid();
  return true;
end $$;

-- ---------------------------------------------------------------------
-- Views (run with the permissions of the person asking)
-- ---------------------------------------------------------------------
create or replace view public.catalog with (security_invoker = true) as
select
  b.*,
  o.full_name  as owner_name,
  cur.id       as loan_id,
  cur.status   as loan_status,
  cur.borrower_id,
  bp.full_name as borrower_name,
  cur.started_on,
  cur.due_date,
  cur.renewals,
  (select count(*) from public.loans r
    where r.book_id = b.id and r.status = 'requested')::int as pending_requests
from public.books b
join public.profiles o on o.id = b.owner_id
left join lateral (
  select l.* from public.loans l
  where l.book_id = b.id and l.status in ('approved', 'active')
  order by l.requested_at desc
  limit 1
) cur on true
left join public.profiles bp on bp.id = cur.borrower_id;

create or replace view public.loan_details with (security_invoker = true) as
select
  l.*,
  b.title       as book_title,
  b.authors     as book_authors,
  b.cover_url   as book_cover_url,
  o.full_name   as owner_name,
  o.phone       as owner_phone,
  o.pickup_notes as owner_pickup_notes,
  br.full_name  as borrower_name,
  br.phone      as borrower_phone
from public.loans l
join public.books b     on b.id = l.book_id
join public.profiles o  on o.id = l.owner_id
join public.profiles br on br.id = l.borrower_id;

-- ---------------------------------------------------------------------
-- Loan rules
-- ---------------------------------------------------------------------
create or replace function public.request_loan(p_book_id uuid, p_pickup_date date, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_book public.books;
  v_loan_id uuid;
begin
  if not public.is_member() then raise exception 'Only members can borrow books.'; end if;
  select * into v_book from public.books where id = p_book_id;
  if not found then raise exception 'That book is no longer in the library.'; end if;
  if v_book.owner_id = auth.uid() then raise exception 'This is your own book.'; end if;
  if not v_book.available then raise exception 'The owner isn''t lending this book at the moment.'; end if;
  if p_pickup_date < public.melbourne_today() then raise exception 'Choose a pickup date from today onwards.'; end if;
  if exists (
    select 1 from public.loans
    where book_id = p_book_id and borrower_id = auth.uid()
      and status in ('requested', 'approved', 'active')
  ) then
    raise exception 'You already have a request open for this book.';
  end if;

  insert into public.loans (book_id, owner_id, borrower_id, pickup_date)
  values (p_book_id, v_book.owner_id, auth.uid(), p_pickup_date)
  returning id into v_loan_id;

  insert into public.messages (sender_id, recipient_id, loan_id, body)
  values (auth.uid(), v_book.owner_id, v_loan_id, trim(p_message));

  return v_loan_id;
end $$;

create or replace function public.respond_to_request(p_loan_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans;
  v_title text;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found or v_loan.owner_id <> auth.uid() then raise exception 'Request not found.'; end if;
  if v_loan.status <> 'requested' then raise exception 'This request has already been answered.'; end if;
  if p_approve and exists (
    select 1 from public.loans where book_id = v_loan.book_id and status in ('approved', 'active')
  ) then
    raise exception 'This book is already out or reserved. Mark it as returned before approving another request.';
  end if;
  select title into v_title from public.books where id = v_loan.book_id;

  update public.loans
  set status = case when p_approve then 'approved'::public.loan_status else 'declined'::public.loan_status end,
      responded_at = now()
  where id = p_loan_id;

  insert into public.messages (sender_id, recipient_id, loan_id, body, is_system)
  values (auth.uid(), v_loan.borrower_id, p_loan_id,
    case when p_approve
      then format('Request to borrow "%s" approved.', v_title)
      else format('Request to borrow "%s" declined.', v_title) end,
    true);
end $$;

create or replace function public.mark_picked_up(p_loan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans;
  v_title text;
  v_today date := public.melbourne_today();
  v_due date := (public.melbourne_today() + interval '1 month')::date;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found or auth.uid() not in (v_loan.owner_id, v_loan.borrower_id) then
    raise exception 'Loan not found.';
  end if;
  if v_loan.status <> 'approved' then raise exception 'This book isn''t waiting to be picked up.'; end if;
  select title into v_title from public.books where id = v_loan.book_id;

  update public.loans set status = 'active', started_on = v_today, due_date = v_due where id = p_loan_id;

  insert into public.messages (sender_id, recipient_id, loan_id, body, is_system)
  values (auth.uid(),
    case when auth.uid() = v_loan.owner_id then v_loan.borrower_id else v_loan.owner_id end,
    p_loan_id,
    format('"%s" picked up. Due back %s.', v_title, to_char(v_due, 'FMDay FMDD FMMonth')),
    true);
end $$;

create or replace function public.renew_loan(p_loan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans;
  v_title text;
  v_due date;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found or v_loan.borrower_id <> auth.uid() then raise exception 'Loan not found.'; end if;
  if v_loan.status <> 'active' then raise exception 'You can only renew a book you currently have.'; end if;
  if v_loan.renewals >= 2 then
    raise exception 'You''ve renewed this book twice already. Please arrange to return it.';
  end if;
  if exists (select 1 from public.loans r where r.book_id = v_loan.book_id and r.status = 'requested') then
    raise exception 'Someone else has asked to borrow this book, so it can''t be renewed. Please arrange to return it.';
  end if;
  select title into v_title from public.books where id = v_loan.book_id;
  v_due := (v_loan.due_date + interval '1 month')::date;

  update public.loans set due_date = v_due, renewals = renewals + 1 where id = p_loan_id;

  insert into public.messages (sender_id, recipient_id, loan_id, body, is_system)
  values (auth.uid(), v_loan.owner_id, p_loan_id,
    format('"%s" renewed (%s of 2). Now due back %s.', v_title, v_loan.renewals + 1,
      to_char(v_due, 'FMDay FMDD FMMonth')),
    true);
end $$;

create or replace function public.mark_returned(p_loan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans;
  v_title text;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found or v_loan.owner_id <> auth.uid() then raise exception 'Loan not found.'; end if;
  if v_loan.status <> 'active' then raise exception 'This book isn''t out on loan.'; end if;
  select title into v_title from public.books where id = v_loan.book_id;

  update public.loans set status = 'returned', returned_at = now() where id = p_loan_id;

  insert into public.messages (sender_id, recipient_id, loan_id, body, is_system)
  values (auth.uid(), v_loan.borrower_id, p_loan_id,
    format('"%s" returned. Thanks!', v_title), true);
end $$;

create or replace function public.cancel_loan(p_loan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans;
  v_title text;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found or auth.uid() not in (v_loan.owner_id, v_loan.borrower_id) then
    raise exception 'Loan not found.';
  end if;
  if not (
    (v_loan.status = 'requested' and auth.uid() = v_loan.borrower_id)
    or v_loan.status = 'approved'
  ) then
    raise exception 'This can''t be cancelled now.';
  end if;
  select title into v_title from public.books where id = v_loan.book_id;

  update public.loans set status = 'cancelled', responded_at = coalesce(responded_at, now()) where id = p_loan_id;

  insert into public.messages (sender_id, recipient_id, loan_id, body, is_system)
  values (auth.uid(),
    case when auth.uid() = v_loan.owner_id then v_loan.borrower_id else v_loan.owner_id end,
    p_loan_id, format('Request for "%s" cancelled.', v_title), true);
end $$;

create or replace function public.mark_thread_read(p_other_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_other_id and read_at is null;
$$;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.books        enable row level security;
alter table public.loans        enable row level security;
alter table public.messages     enable row level security;
alter table public.reminder_log enable row level security;

drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles
  for select to authenticated using (public.is_member() or id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members read books" on public.books;
create policy "members read books" on public.books
  for select to authenticated using (public.is_member());

drop policy if exists "members add own books" on public.books;
create policy "members add own books" on public.books
  for insert to authenticated with check (public.is_member() and owner_id = auth.uid());

drop policy if exists "owners update books" on public.books;
create policy "owners update books" on public.books
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owners delete books" on public.books;
create policy "owners delete books" on public.books
  for delete to authenticated using (owner_id = auth.uid());

-- Everyone in the group can see who has what. Changes go through the functions above.
drop policy if exists "members read loans" on public.loans;
create policy "members read loans" on public.loans
  for select to authenticated using (public.is_member());

-- Messages are private to the two people in the conversation
drop policy if exists "read own messages" on public.messages;
create policy "read own messages" on public.messages
  for select to authenticated using (auth.uid() in (sender_id, recipient_id));

drop policy if exists "send messages" on public.messages;
create policy "send messages" on public.messages
  for insert to authenticated
  with check (public.is_member() and sender_id = auth.uid() and sender_id <> recipient_id
              and is_system = false and read_at is null);

-- ---------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.books, public.loans, public.messages, public.reminder_log
  from anon, authenticated;
revoke all on public.catalog, public.loan_details from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, pickup_notes) on public.profiles to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select on public.loans to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.catalog, public.loan_details to authenticated;
grant all on public.profiles, public.books, public.loans, public.messages, public.reminder_log,
  public.catalog, public.loan_details to service_role;

revoke execute on function
  public.request_loan(uuid, date, text),
  public.respond_to_request(uuid, boolean),
  public.mark_picked_up(uuid),
  public.renew_loan(uuid),
  public.mark_returned(uuid),
  public.cancel_loan(uuid),
  public.mark_thread_read(uuid),
  public.join_with_code(text)
from public, anon;

grant execute on function
  public.request_loan(uuid, date, text),
  public.respond_to_request(uuid, boolean),
  public.mark_picked_up(uuid),
  public.renew_loan(uuid),
  public.mark_returned(uuid),
  public.cancel_loan(uuid),
  public.mark_thread_read(uuid),
  public.join_with_code(text)
to authenticated;

grant execute on function public.check_join_code(text) to anon, authenticated;
