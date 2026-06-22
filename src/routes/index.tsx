import { createFileRoute } from "@tanstack/react-router";
import Hero01 from "~/components/blocks/hero-01";
export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <Hero01 />
    </div>
  );
}
