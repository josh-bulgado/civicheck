import { isWalkInBirth } from "./walk-in-birth";

export function isWalkInMarriage(serviceCode: string) {
  return ["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"].includes(serviceCode);
}

export function isWalkInDeath(serviceCode: string) {
  return ["DEATH_ONTIME", "DEATH_DELAYED"].includes(serviceCode);
}

export function isWalkInRegistration(serviceCode: string) {
  return isWalkInBirth(serviceCode) || isWalkInMarriage(serviceCode) || isWalkInDeath(serviceCode);
}

export function isWalkInDetailedIntake(serviceCode: string) {
  return isWalkInRegistration(serviceCode) || ["LEGITIMATION", "SUPPLEMENTAL_REPORT"].includes(serviceCode);
}
