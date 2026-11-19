import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { formatDateKey } from "~/lib/date";
import { postingToday } from "../marriage-posting";
import { endorsementClaimingSteps, endorsementWaitingMessage, estimatedPsaAvailability, type EndorsementDetails } from "../electronic-endorsement-release";
import { saveElectronicEndorsementFn } from "../requests.mutations";

export function ElectronicEndorsementPanel({ serviceCode, status, details, editor }: {
  serviceCode?: string | null;
  status: string | null;
  details?: EndorsementDetails | null;
  editor?: { requestId: string; updatedAt: string; createdAt: string; onSaved: () => void | Promise<unknown> };
}) {
  const id = useId();
  const [date, setDate] = useState(details?.endorsedOn ?? "");
  const [location, setLocation] = useState(details?.claimingLocation ?? "");
  const [instructions, setInstructions] = useState(details?.claimingInstructions ?? "");
  const [saving, setSaving] = useState(false);
  if (serviceCode !== "ELEC_ENDORSEMENT" || !["processing", "ready_for_release", "released"].includes(status ?? "")) return null;
  const editable = status === "processing" ? editor : undefined;
  const ready = status === "ready_for_release" || status === "released";
  const estimate = estimatedPsaAvailability(details?.endorsedOn);
  const unchanged = date === (details?.endorsedOn ?? "") && location === (details?.claimingLocation ?? "") && instructions === (details?.claimingInstructions ?? "");

  async function save() {
    if (!editable || saving) return;
    setSaving(true);
    try {
      const result = await saveElectronicEndorsementFn({ data: {
        requestId: editable.requestId, expectedUpdatedAt: editable.updatedAt,
        endorsedOn: date, claimingLocation: location, claimingInstructions: instructions,
      } });
      if (result.error) { toast.error(result.message); return; }
      toast.success("PSA endorsement details saved.");
      await editable.onSaved();
    } catch {
      toast.error("Could not save the PSA endorsement details. Please try again.");
    } finally { setSaving(false); }
  }

  return <section className="rounded-xl border border-border bg-card p-5 text-sm">
    <h2 className="text-lg font-semibold">PSA endorsement</h2>
    <p className="mt-2 text-muted-foreground">
      {status === "released" ? "The applicant received the final PSA certificate."
        : ready ? "The final PSA certificate is available. Follow the confirmed claiming instructions."
        : endorsementWaitingMessage(details)}
    </p>
    {details?.endorsedOn && <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
      <div><dt className="text-muted-foreground">Endorsed to PSA</dt><dd className="font-medium">{formatDateKey(details.endorsedOn)}</dd></div>
      {estimate && <div><dt className="text-muted-foreground">Estimated availability</dt><dd className="font-medium">Around {formatDateKey(estimate)}</dd></div>}
    </dl>}
    {ready && <div className="mt-3 space-y-2 whitespace-pre-wrap break-words">
      {endorsementClaimingSteps(details).map(step => <p key={step}>{step}</p>)}
    </div>}
    {editable && <form className="mt-4 grid gap-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-date`}>Date endorsed to PSA</Label>
        <Input id={`${id}-date`} type="date" value={date} required disabled={saving}
          min={postingToday(new Date(editable.createdAt))} max={postingToday()} onChange={event => setDate(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-location`}>Confirmed claiming location</Label>
        <Input id={`${id}-location`} value={location} disabled={saving} maxLength={240} onChange={event => setLocation(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-instructions`}>Claiming instructions</Label>
        <Textarea id={`${id}-instructions`} value={instructions} disabled={saving} maxLength={1000} rows={3} onChange={event => setInstructions(event.target.value)} />
      </div>
      <Button type="submit" className="justify-self-start" disabled={saving || !date || unchanged}>
        {saving ? "Saving..." : "Save endorsement details"}
      </Button>
    </form>}
  </section>;
}
