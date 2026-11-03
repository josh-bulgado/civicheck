-- Document the optional `unit` and `note` keys on fee components.
--
-- Each component is now { label, amount, included, unit?, note? }:
--   unit  'page' | 'copy' | 'document'. What an "also payable" amount is charged
--         per; absent means a flat charge.
--   note  A short condition shown beside an "also payable" charge, e.g.
--         'only if certified by the LCR'.
--
-- Comment only. `fee_components` is jsonb and `fee_components_are_valid` reads
-- just label, amount and included, so the extra keys need no constraint change
-- and existing rows stay valid as they are.

comment on column public.services_registry.fee_components is
  'Itemized charges as [{label, amount, included, unit?, note?}]. Components with included = true must sum to fee; included = false are extra charges payable on top, never part of fees_due. unit (page | copy | document) and note are optional and only meaningful on included = false components.';
