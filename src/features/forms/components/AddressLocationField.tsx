import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { addressAreas, addressCities, type LocationOption, type PhilippineAddressLevel } from "~/lib/requester-address";
import { cn } from "~/lib/utils";
import { countryOptions } from "~/lib/countries";
import { WIZARD_CONTROL_CLASS } from "./wizard-field";

// Keep loaded barangays so we do not load the same city twice.
const barangayCache = new Map<string, LocationOption[]>();

type AddressLocationFieldProps = {
  level: PhilippineAddressLevel | "country";
  area: string;
  city: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  id: string;
  invalid: boolean;
  inputRef: React.Ref<HTMLButtonElement>;
};

export function AddressLocationField({
  level, area, city, value, onChange, onBlur, id, invalid, inputRef,
}: AddressLocationFieldProps) {
  const [open, setOpen] = useState(false);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(level === "barangay");
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const cities = addressCities(area);
  const cityCode = cities.find((entry) => entry.name === city)?.code;

  useEffect(() => {
    if (level !== "barangay" || !cityCode) return;
    let cancelled = false;

    async function loadBarangays(selectedCityCode: string) {
      const cached = barangayCache.get(selectedCityCode);
      if (cached) {
        setBarangays(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFailed(false);
      try {
        const { philippines } = await import("@ianlabicani/geoph-lite");
        const entries = await philippines.barangays(selectedCityCode);
        const options = entries.map((entry) => ({
          code: entry.psgc_code,
          name: entry.name,
        }));
        barangayCache.set(selectedCityCode, options);
        if (!cancelled) setBarangays(options);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBarangays(cityCode);
    return () => {
      // Ignore the result if the user has already changed the city.
      cancelled = true;
    };
  }, [level, cityCode, retryCount]);

  let options: LocationOption[] = barangays;
  if (level === "country") options = countryOptions;
  if (level === "province") options = addressAreas;
  if (level === "city") options = cities;
  const sortedOptions = [...options].sort((a, b) => a.name.localeCompare(b.name));

  const needsProvince = level === "city" && !area;
  const needsCity = level === "barangay" && !cityCode;
  let placeholder = "Select one";
  if (loading) placeholder = "Loading barangays…";
  if (needsProvince) placeholder = "Select province / area first";
  if (needsCity) placeholder = "Select city / municipality first";

  return (
    <>
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) onBlur(); }}>
        <PopoverTrigger
          render={<Button variant="outline" />}
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={needsProvince || needsCity || loading || failed}
          className={cn(WIZARD_CONTROL_CLASS, "w-full justify-between text-left font-normal")}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="service-form-options w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Search locations…" />
            <CommandList>
              <CommandEmpty>No matching location.</CommandEmpty>
              <CommandGroup>
                {sortedOptions.map((option) => (
                  <CommandItem key={option.code} value={option.name} onSelect={() => {
                    onChange(option.name);
                    setOpen(false);
                    onBlur();
                  }}>
                    <Check className={cn("size-4", value === option.name ? "opacity-100" : "opacity-0")} />
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load barangays.{" "}
          <button type="button" className="underline" onClick={() => setRetryCount(retryCount + 1)}>Try again</button>
        </p>
      ) : null}
    </>
  );
}
