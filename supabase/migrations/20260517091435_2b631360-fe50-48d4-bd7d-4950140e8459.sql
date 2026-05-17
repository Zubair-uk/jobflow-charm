-- Public bucket for company logos
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Anyone can view logos (public bucket)
create policy "Company logos are publicly viewable"
on storage.objects for select
using (bucket_id = 'company-logos');

-- Authenticated users can upload/update/delete logos in their own folder
create policy "Users can upload their own company logo"
on storage.objects for insert
with check (
  bucket_id = 'company-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own company logo"
on storage.objects for update
using (
  bucket_id = 'company-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own company logo"
on storage.objects for delete
using (
  bucket_id = 'company-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
