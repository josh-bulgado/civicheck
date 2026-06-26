import { createFileRoute } from "@tanstack/react-router";
import CivicheckHome from "~/components/civicheck-home";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <CivicheckHome />
    </div>
  );
}
