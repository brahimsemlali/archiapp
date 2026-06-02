-- P0 SaaS hardening: portal link deletion and logos storage writes.

-- Project portal link rotation/revocation deletes share_links. Existing policies
-- allowed select/insert/update but not delete, so RLS could block revocation.
drop policy if exists "share_links_delete" on share_links;
create policy "share_links_delete" on share_links for delete using (
  workspace_id in (
    select workspace_id
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  )
);

-- Logo uploads use storage upsert against the public logos bucket. Supabase
-- Storage upsert needs INSERT + SELECT + UPDATE. Keep writes scoped to the
-- workspace folder and owner/admin roles.
drop policy if exists "logos_select" on storage.objects;
drop policy if exists "logos_insert" on storage.objects;
drop policy if exists "logos_update" on storage.objects;
drop policy if exists "logos_delete" on storage.objects;

create policy "logos_select" on storage.objects for select using (
  bucket_id = 'logos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] in (
    select workspace_id::text
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  )
);

create policy "logos_insert" on storage.objects for insert with check (
  bucket_id = 'logos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] in (
    select workspace_id::text
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  )
);

create policy "logos_update" on storage.objects for update using (
  bucket_id = 'logos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] in (
    select workspace_id::text
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  )
) with check (
  bucket_id = 'logos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] in (
    select workspace_id::text
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  )
);

create policy "logos_delete" on storage.objects for delete using (
  bucket_id = 'logos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] in (
    select workspace_id::text
    from workspace_members
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  )
);
