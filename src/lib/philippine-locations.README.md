Philippine address lookup data comes from PSA's Philippine Standard Geographic
Code, snapshot 30 June 2026, distributed by @ianlabicani/geoph-lite 2.0.0.

Source: https://psa.gov.ph/classification/psgc/index
Data license: Creative Commons Attribution 4.0 International
https://creativecommons.org/licenses/by/4.0/
Package source: https://github.com/ianlabicani/geoph-lite (MIT)

philippine-locations.json is a generated province/area and city index. Regenerate
it with `node scripts/generate-philippine-locations.mjs` after updating the
package. Barangays load from the package's bundled region files on demand; no
third-party address API receives the applicant's address.

Metro Manila and region-level independent cities/municipalities appear as area
groups in the first selector. These groups are navigation aids; region group
names are omitted from the printed postal address except Metro Manila.
