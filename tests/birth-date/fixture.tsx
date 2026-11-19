import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { DynamicFormFields } from "~/features/forms/components/DynamicFormFields";
import { formTemplateDefinitionSchema } from "~/features/forms/form-template.types";
import "~/styles/app.css";

const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
const record = params.get("kind") === "record";
const marriage = params.get("kind") === "marriage";
const definition = formTemplateDefinitionSchema.parse({
  schemaVersion: 1,
  sections: [{ key: "request_details", title: "Request details", step: "case", fields: marriage
    ? ["bride", "groom"].map((party) => ({ key: `${party}_date_of_birth`, type: "date", label: `${party === "bride" ? "Bride" : "Groom"}'s date of birth`, dateDirection: "past", required: true }))
    : [
      ...(record ? [{ key: "record_type", type: "select", label: "Record type", options: ["birth", "marriage", "death"].map((value) => ({ value, label: value })) }] : []),
      { key: "event_date", type: "date", label: record ? "Date of the event on the record" : "Date of Birth", dateDirection: "past", required: true },
      { key: "event_place", type: "text", label: "Place of Birth" },
    ],
  }, { key: "people", title: "Person", step: "details", fields: [{ key: "subjects", type: "person_group", label: "Name" }] }],
});

function Fixture() {
  const form = useForm<Record<string, string>>({ mode: params.get("mode") === "onBlur" ? "onBlur" : "onChange", defaultValues: {
    event_date: params.get("value") ?? "", record_type: record ? "birth" : "",
  } });
  const values = form.watch();
  return (
    <main data-service-form className="mx-auto flex max-w-4xl flex-col gap-6 p-5 md:p-12">
      <h1>Request details</h1>
      <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(() => undefined)}>
        <DynamicFormFields definition={definition} step="case" control={form.control} values={values} showRequiredMarks />
        <div className="flex gap-3">
          <Button type="submit" disabled={!params.has("submit") && !form.formState.isValid}>Next</Button>
          <Button type="button" onClick={() => form.reset({ event_date: "", record_type: record ? "birth" : "" })}>Reset</Button>
        </div>
      </form>
      <output aria-label="Saved date">{values.event_date || "No complete date"}</output>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
