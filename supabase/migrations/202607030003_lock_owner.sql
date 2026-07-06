-- Keep the initial owner fixed and non-removable at database level.
insert into public.profiles (email, username, name, role)
values ('m.colurci@gmail.com', 'Mike', 'Mike', 'owner')
on conflict (email) do update
set username = 'Mike', name = 'Mike', role = 'owner', updated_at = now();

create or replace function public.protect_fixed_owner_profile()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.email = 'm.colurci@gmail.com' then
    raise exception 'Fixed owner profile cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.email = 'm.colurci@gmail.com' then
    if new.email <> old.email or new.role <> 'owner' then
      raise exception 'Fixed owner profile cannot be changed';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_protect_fixed_owner_profile on public.profiles;
create trigger trg_protect_fixed_owner_profile
before update or delete on public.profiles
for each row execute function public.protect_fixed_owner_profile();

grant execute on function public.protect_fixed_owner_profile() to service_role;
