-- Charter PDF page 12 gives a P1,100 total but no solemnization amount.
-- Keep the total and describe the documented amounts in the service steps.
update public.services_registry
set fee_components = '[]'::jsonb,
    steps_description = array_replace(
      steps_description,
      'Attend the counselling session, pay the family planning fee (P100), application fee (P300), license fee (P200), and the solemnization fee (P500), then receive a claim stub as the Notice of Publication is posted/mailed for 10 days.',
      'Attend the counselling session and pay the required fees. The Citizen''s Charter lists P100 for family planning, P300 for the application, P200 for the license, and a solemnization fee without an individual amount; its stated total is P1,100. Receive a claim stub as the Notice of Publication is posted/mailed for 10 days.'
    )
where service_code = 'MARRIAGE_LICENSE';
