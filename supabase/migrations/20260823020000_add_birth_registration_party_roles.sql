-- Birth registration asks about the child and, where relevant, the parents —
-- the marital/non-marital distinction is already baked into which service_code
-- was resolved (see CaseSelector.tsx), so Father is included only on the
-- marital variants rather than via any in-form conditional.
update services_registry set party_roles = array['Child', 'Mother', 'Father']
  where service_code in ('OTCOLB-MARITAL', 'DCOLB-0079-NORMAL-MARITAL', 'DCOLB-80UP-NORMAL-MARITAL');

update services_registry set party_roles = array['Child', 'Mother']
  where service_code in (
    'OTCOLB-NONMARITAL', 'DCOLB-0079-NORMAL-NONMARITAL', 'DCOLB-80UP-NORMAL-NONMARITAL',
    'DCOLB-0079-BRAP', 'DCOLB-80UP-BRAP'
  );
