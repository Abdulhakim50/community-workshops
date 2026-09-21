"use client";

import { cancelWorkshop, publishWorkshop } from "./actions";

export function WorkshopStatusActions({ workshopId, status }: { workshopId: string; status: "draft" | "published" | "canceled" }) {
  if (status === "canceled") return null;

  return (
    <div className="flex flex-wrap gap-3">
      {status === "draft" && (
        <form action={publishWorkshop}>
          <input type="hidden" name="workshopId" value={workshopId} />
          <button className="rounded-full bg-[#537b26] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#41651d]">Publish workshop</button>
        </form>
      )}
      <form action={cancelWorkshop} onSubmit={(event) => {
        if (!window.confirm("Cancel this workshop? It will be removed from the public schedule.")) event.preventDefault();
      }}>
        <input type="hidden" name="workshopId" value={workshopId} />
        <button className="rounded-full border border-[#b75b42] px-5 py-2.5 text-sm font-bold text-[#913b25] hover:bg-[#fff0e8]">Cancel workshop</button>
      </form>
    </div>
  );
}
