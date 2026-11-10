import { isWalkInBirth } from "./walk-in-birth";

export function isWalkInMarriage(serviceCode: string) {
  return ["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"].includes(serviceCode);
}

export function isWalkInRegistration(serviceCode: string) {
  return isWalkInBirth(serviceCode) || isWalkInMarriage(serviceCode);
}
