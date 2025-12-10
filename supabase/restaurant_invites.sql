create table if not exists public.restaurant_invites (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  email text not null,
  role text not null default 'staff',
  code text unique not null,
  expires_at timestamp with time zone default now() + interval '7 days',
  used boolean default false,
  created_at timestamp with time zone default now()
);

create policy "Owners can create invites"
on public.restaurant_invites
for insert
with check (
  auth.uid() in (
    select user_id
    from public.restaurant_users
    where restaurant_users.restaurant_id = restaurant_invites.restaurant_id
      and restaurant_users.role = 'owner'
  )
);

create policy "Invited user can use invite"
on public.restaurant_invites
for update
using (
  email = auth.jwt() ->> 'email'
);

create policy "Invited user can view invite"
on public.restaurant_invites
for select
using (
  email = auth.jwt() ->> 'email'
);

create policy "User can be added to restaurant_users via invite"
on public.restaurant_users
for insert
with check (
  auth.uid() = user_id
);
