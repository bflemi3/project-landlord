-- Landlords can delete their own properties. Cascade FKs already wipe
-- units, rent, contracts, charge_definitions, memberships, invitations,
-- statements, and source_documents. profiles and auth.users are untouched.
create policy "landlords can delete their properties"
on public.properties
for delete
to authenticated
using (public.is_property_landlord(id));
