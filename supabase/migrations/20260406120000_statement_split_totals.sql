-- Add tenant and landlord total columns to statements
alter table statements add column tenant_total_minor integer not null default 0;
alter table statements add column landlord_total_minor integer not null default 0;
