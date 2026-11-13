/** Electronic endorsement can be paid during Processing; delayed death needs its posting date. */
export function canVerifyPayment(status: string, serviceCode?: string | null, postingStartDate?: string | null) {
  return status === "ready_for_release" ||
    (status === "processing" && serviceCode === "DEATH_DELAYED" && Boolean(postingStartDate)) ||
    (status === "processing" && serviceCode === "ELEC_ENDORSEMENT");
}
