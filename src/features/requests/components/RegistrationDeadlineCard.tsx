export function RegistrationDeadlineCard({ notice }: { notice: string }) {
  const [deadline, ...details] = notice.split("\n");
  return (
    <section aria-labelledby="registration-deadline-title" className="rounded-3xl border border-border-light bg-card p-5.5">
      <h2 id="registration-deadline-title" className="text-[17px] font-semibold text-foreground">Registration deadline</h2>
      <p className="mt-3 text-[17px] font-semibold text-primary">
        {deadline.replace(/^On-time registration deadline:\s*/, "")}
      </p>
      <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {details.map((line, index) => <p key={index}>{line}</p>)}
      </div>
    </section>
  );
}
