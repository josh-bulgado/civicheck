/** Delayed death can be paid while its notice is posted. */
export function canVerifyPayment(status: string, serviceCode?: string | null, postingStartDate?: string | null) {
  return status === "ready_for_release" ||
    (status === "processing" && serviceCode === "DEATH_DELAYED" && Boolean(postingStartDate));
}
