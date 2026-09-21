import type { Metadata } from "next";
import { requireOrganizer } from "@/lib/organizer";
import { WorkshopForm } from "../workshop-form";

export const metadata: Metadata = { title: "Create workshop" };

export default async function NewWorkshopPage() {
  await requireOrganizer();

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#537b26]">Organizer workspace</p>
      <h1 className="mt-3 text-4xl font-bold">Create a workshop</h1>
      <p className="mt-3 max-w-2xl leading-7 text-[#596760]">Start with a private draft. You can review it before publishing it on the public workshop page.</p>
      <WorkshopForm />
    </div>
  );
}
