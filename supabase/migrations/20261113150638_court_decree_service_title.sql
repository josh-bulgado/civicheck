-- Keep the supplied Charter title without restoring legal separation as a choice.
update public.services_registry
set display_name='Registration of Court Decrees/Order: Adoption, Nullity of Marriage, Legal Separation Court Issuances'
where display_group='court_decree';
