-- Delayed birth registration: ask about the Child and the Mother only.
--
-- The two "Normal, Marital Child" variants listed Father as a third party,
-- which the on-time birth services and every other delayed-birth variant do
-- not. The CCRO wants one consistent set of parties, so drop Father here.
--
-- Safe to drop: no requirement is scoped to the Father role, no form template
-- field references it, and the parents' documents (Marriage Certificate of
-- Parents, Parent's valid ID) are request-scoped uploads, so they are
-- unaffected. Drafts that still hold three subjects are resized by
-- reconcileSubjects when the details step loads.

update public.services_registry
set party_roles = array['Child', 'Mother']
where service_code in ('DCOLB-0079-NORMAL-MARITAL', 'DCOLB-80UP-NORMAL-MARITAL')
  and party_roles is distinct from array['Child', 'Mother'];
