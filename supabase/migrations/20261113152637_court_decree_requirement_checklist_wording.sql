-- Follow the checklist on Charter PDF page 20; do not present its list as alternatives.
update public.service_requirements_metadata
set requirement_name='Certified Xerox copy of the Certificate of Finality, Entry of Judgment, Decree of Adoption and Nullity/Annulment of Marriage, 4 original copies'
where requirement_group='court_decree'
  and requirement_name ilike '%Certificate of Finality%Entry of Judgment%';
