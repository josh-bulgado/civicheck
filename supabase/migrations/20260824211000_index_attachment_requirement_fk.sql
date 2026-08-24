-- PostgreSQL does not create an index automatically for the referencing side
-- of a foreign key. This keeps checklist replacement/deletion from scanning
-- every historical attachment while applying ON DELETE SET NULL.
create index requirements_attachments_requirement_id_idx
  on public.requirements_attachments (requirement_id);
