-- Pin the trigger function's object lookup path to prevent role-controlled
-- schemas from affecting its execution.
alter function public.protect_published_form_version()
set search_path = pg_catalog, public;
