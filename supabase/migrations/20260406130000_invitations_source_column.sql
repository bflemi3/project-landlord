-- Add source column to track how invitations were created (waitlist, direct, etc.)
alter table invitations add column source text;
