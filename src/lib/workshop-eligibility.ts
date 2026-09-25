type WorkshopEligibility = {
  status: string;
  isDemo: boolean;
  startsAt: Date | string;
};

// Evaluate after acquiring the workshop lock for mutations. Equality is closed.
export function canAcceptAttendees(workshop: WorkshopEligibility, now = new Date()) {
  return workshop.status === "published"
    && !workshop.isDemo
    && new Date(workshop.startsAt).getTime() > now.getTime();
}
