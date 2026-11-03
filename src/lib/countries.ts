// The package's Node entry dynamically requires every locale, which Nitro
// cannot trace into the server bundle. Import the locale-neutral core instead.
import countries from "i18n-iso-countries/index";
import english from "i18n-iso-countries/langs/en.json";

countries.registerLocale(english);

// Use English country names and show them in alphabetical order.
const countryNames = countries.getNames("en", { select: "official" });
export const countryOptions = Object.entries(countryNames)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));
