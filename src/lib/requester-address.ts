import locations from "./philippine-locations.json";

export type PhilippineAddressLevel = "province" | "city" | "barangay";
export type LocationOption = { code: string; name: string };

export const addressAreas = locations;

export function addressCities(area: string): LocationOption[] {
  return locations.find((group) => group.name === area)?.cities ?? [];
}

export function addressDescendants(level: PhilippineAddressLevel): string[] {
  // Changing a province clears the city and barangay.
  if (level === "province") {
    return ["requester_city", "requester_barangay"];
  }
  if (level === "city") {
    return ["requester_barangay"];
  }
  return [];
}

// Join the address fields into one line for the verification PDF.
export function formatRequesterAddress(answers: Record<string, unknown>): string {
  function part(key: string): string {
    const value = answers[key];
    if (typeof value === "string") {
      return value.trim();
    }
    return "";
  }

  if (part("requester_country")) {
    return [
      part("requester_address_line1"), part("requester_address_line2"),
      part("requester_overseas_city"), part("requester_overseas_region"),
      part("requester_postal_code"), part("requester_country"),
    ].filter(Boolean).join(", ");
  }
  const area = part("requester_province");
  const selectedArea = locations.find((group) => group.name === area);
  let province = area;

  // These codes end in eight zeros when the area is a region.
  // Region names help users find a city, but are left out of the PDF.
  // Keep Metro Manila because it is part of the address.
  const isRegion = selectedArea?.code.endsWith("00000000");
  if (isRegion && area !== "Metro Manila") {
    province = "";
  }

  // Older requests saved the whole address in one text box.
  let street = part("requester_address");
  if (area) {
    street = part("requester_street");
  }

  // For example: "City of Legazpi" becomes "Legazpi City".
  let city = part("requester_city");
  if (city.startsWith("City of ") && city.length > 8) {
    city = city.slice(8) + " City";
  }

  return [
    street, part("requester_barangay"), city, province,
  ].filter(Boolean).join(", ");
}
