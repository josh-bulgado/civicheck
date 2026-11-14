import { isWalkInBirth } from "./walk-in-birth";
import { isWalkInPetition } from "./walk-in-petition";

export function isWalkInMarriage(serviceCode: string) {
  return ["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"].includes(serviceCode);
}

export function isWalkInDeath(serviceCode: string) {
  return ["DEATH_ONTIME", "DEATH_DELAYED"].includes(serviceCode);
}

export function isWalkInRegistration(serviceCode: string) {
  return isWalkInBirth(serviceCode) || isWalkInMarriage(serviceCode) || isWalkInDeath(serviceCode);
}

export function isWalkInCourtDecree(serviceCode: string) {
  return ["COURT-ANNULMENT", "COURT-FOREIGN-ADOPTION"].includes(serviceCode);
}

export function isWalkInDetailedIntake(serviceCode: string) {
  if (isWalkInPetition(serviceCode)) return true;
  return isWalkInRegistration(serviceCode) || ["MARRIAGE_LICENSE", "LEGITIMATION", "SUPPLEMENTAL_REPORT", "RA9255_SURNAME", "OTHER_CERT", "ELEC_ENDORSEMENT"].includes(serviceCode) || isWalkInCourtDecree(serviceCode);
}
