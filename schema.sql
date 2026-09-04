-- Bossclips v2 - Supabase schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default 'Boss Member',
  avatar_url text,
  role text not null default 'user' check (role in ('user','creator','admin')),
  coin_balance bigint not null default 0 check (coin_balance >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null,
  creator text not null default '@bossclips',
  caption text not null default '',
  category text not null check (category in ('Boss Mode','Motivation','Funny','Chill')),
  video_url text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, clip_id)
);

create table if not exists public.saves (
  user_id uuid references public.profiles(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, clip_id)
);

create table if not exists public.views (
  user_id uuid references public.profiles(id) on delete cascade,
  clip_id uuid references public.clips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, clip_id)
);

create table if not exists public.coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  clip_id uuid references public.clips(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  clip_id uuid not null references public.clips(id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 300),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), 'boss_' || substr(new.id::text, 1, 8)),
    coalesce(nullif(new.raw_user_meta_data->>'username',''), 'Boss Member')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

-- Atomic one-time watch reward. The phone cannot choose the reward amount.
create or replace function public.award_watch(p_clip_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inserted_count int;
  new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.clips where id = p_clip_id and status = 'approved') then
    raise exception 'clip unavailable';
  end if;

  insert into public.views(user_id, clip_id) values (uid, p_clip_id)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    update public.profiles set coin_balance = coin_balance + 5 where id = uid returning coin_balance into new_balance;
    insert into public.coin_transactions(user_id, amount, reason, clip_id) values (uid, 5, 'first_watch', p_clip_id);
  else
    select coin_balance into new_balance from public.profiles where id = uid;
  end if;
  return coalesce(new_balance, 0);
end;
$$;

revoke all on function public.award_watch(uuid) from public;
grant execute on function public.award_watch(uuid) to authenticated;

-- App Store-friendly self-service account deletion. Cascades through profiles/user data.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;



alter table public.profiles enable row level security;
alter table public.clips enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.views enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.reports enable row level security;

create policy "profiles readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users can edit only public profile fields, never role or coin_balance.
revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

create policy "approved clips readable" on public.clips for select using (status = 'approved' or owner_id = auth.uid());
create policy "creators submit clips" on public.clips for insert to authenticated with check (owner_id = auth.uid() and status = 'pending');
create policy "owners delete pending clips" on public.clips for delete to authenticated using (owner_id = auth.uid() and status = 'pending');
create policy "admins manage clips" on public.clips for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "own likes read" on public.likes for select to authenticated using (user_id = auth.uid());
create policy "own likes insert" on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "own likes delete" on public.likes for delete to authenticated using (user_id = auth.uid());
create policy "own saves read" on public.saves for select to authenticated using (user_id = auth.uid());
create policy "own saves insert" on public.saves for insert to authenticated with check (user_id = auth.uid());
create policy "own saves delete" on public.saves for delete to authenticated using (user_id = auth.uid());
create policy "own views read" on public.views for select to authenticated using (user_id = auth.uid());
create policy "own coin ledger read" on public.coin_transactions for select to authenticated using (user_id = auth.uid());
create policy "own reports read" on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy "submit report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admins read reports" on public.reports for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Public video bucket. For launch, moderate every upload before approving its clips row.
insert into storage.buckets (id, name, public) values ('clip-videos', 'clip-videos', true)
on conflict (id) do update set public = true;

create policy "public read clip videos" on storage.objects for select using (bucket_id = 'clip-videos');
create policy "authenticated uploads own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'clip-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete own uploads" on storage.objects for delete to authenticated
using (bucket_id = 'clip-videos' and owner_id = auth.uid()::text);

-- Seed demo clips. Replace these URLs with content you own/license before release.
insert into public.clips (title, creator, caption, category, video_url, status)
select * from (values
  ('Big Buck Bunny', '@bossclips', 'Build the habit. Stack the wins. 👑', 'Boss Mode', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'approved'),
  ('Elephants Dream', '@dailyboss', 'Keep moving — momentum beats motivation.', 'Motivation', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'approved')
) as v(title,creator,caption,category,video_url,status)
where not exists (select 1 from public.clips);
