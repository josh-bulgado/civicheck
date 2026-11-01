// Run this script after updating the Philippine location package.
import { philippines } from "@ianlabicani/geoph-lite";
import { writeFile } from "node:fs/promises";

const groups = [];
for (const region of philippines.regions()) {
  const regionData = await philippines.region(region.psgc_code);
  for (const province of regionData.provinces) {
    groups.push({
      code: province.psgc_code,
      name: province.name,
      cities: province.localities.map(({ psgc_code, name }) => ({ code: psgc_code, name })),
    });
  }
  // Some cities belong directly to a region instead of a province.
  if (regionData.localities.length) {
    let areaName = regionData.name + " — Independent cities / municipalities";
    if (regionData.psgc_code === "1300000000") {
      areaName = "Metro Manila";
    }
    groups.push({
      code: regionData.psgc_code,
      name: areaName,
      cities: regionData.localities.map(({ psgc_code, name }) => ({ code: psgc_code, name })),
    });
  }
}
groups.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(new URL("../src/lib/philippine-locations.json", import.meta.url),
  JSON.stringify(groups, null, 2) + "\n");
