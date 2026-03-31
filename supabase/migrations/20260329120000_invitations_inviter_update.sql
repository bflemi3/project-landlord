-- Allow the user who sent the invitation to update it (resend, cancel)
create policy "Inviters can update their invitations"
  on invitations for update
  using (invited_by = auth.uid());
