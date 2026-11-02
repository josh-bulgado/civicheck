export function RegistrationNoticeText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span
          key={index}
          className={index === 0 && lines.length > 1
            ? "block font-semibold"
            : "mt-2 block text-base font-normal"}
        >
          {line}
        </span>
      ))}
    </>
  );
}
