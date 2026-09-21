export type Workshop = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  venue: string;
  address: string;
  organizer: string;
  capacity: number;
  confirmedCount: number;
  learningPoints: string[];
  isDemo: boolean;
};

// Example content used only when DATABASE_URL is not configured and by the seed script.
const workshops: Workshop[] = [
  {
    slug: "urban-gardening-basics",
    title: "Urban gardening basics",
    summary: "Learn to grow herbs and greens in a small space, even without a garden.",
    description:
      "A hands-on introduction to choosing containers, mixing soil, and caring for plants in a small space. You will prepare a planter to take home and leave with a simple plan for your first month of growing.",
    category: "Making & growing",
    startsAt: "2027-01-16T10:00:00-08:00",
    endsAt: "2027-01-16T12:00:00-08:00",
    timeZone: "America/Los_Angeles",
    venue: "Maple Community Room",
    address: "120 Maple Street, Portland, OR",
    organizer: "Neighborhood Learning Circle",
    capacity: 12,
    confirmedCount: 7,
    isDemo: true,
    learningPoints: [
      "Choose plants that suit your light and space",
      "Prepare a container with the right soil and drainage",
      "Make a simple watering and care plan",
    ],
  },
  {
    slug: "printmaking-with-everyday-materials",
    title: "Printmaking with everyday materials",
    summary: "Make your own patterns and prints with simple tools and recycled materials.",
    description:
      "Explore texture, shape, and repetition in a relaxed printmaking session. We will use accessible materials, try several techniques, and make a small set of prints to take home. No art experience is needed.",
    category: "Art & craft",
    startsAt: "2027-01-23T13:00:00-08:00",
    endsAt: "2027-01-23T15:30:00-08:00",
    timeZone: "America/Los_Angeles",
    venue: "Eastside Arts Table",
    address: "45 Cedar Avenue, Portland, OR",
    organizer: "Neighborhood Learning Circle",
    capacity: 16,
    confirmedCount: 16,
    isDemo: true,
    learningPoints: [
      "Create reusable stamps from everyday materials",
      "Layer colors and textures into a print",
      "Take home a set of your own prints",
    ],
  },
  {
    slug: "repair-your-favorite-clothes",
    title: "Repair your favorite clothes",
    summary: "Practice simple hand-sewing repairs that help your clothes last longer.",
    description:
      "Bring a garment that needs a little care. We will practice threading a needle, sewing on a button, and mending a small tear. Materials are provided, and you can work at your own pace.",
    category: "Practical skills",
    startsAt: "2027-02-06T11:00:00-08:00",
    endsAt: "2027-02-06T13:00:00-08:00",
    timeZone: "America/Los_Angeles",
    venue: "Riverbend Library Studio",
    address: "8 River Road, Portland, OR",
    organizer: "Neighborhood Learning Circle",
    capacity: 10,
    confirmedCount: 4,
    isDemo: true,
    learningPoints: [
      "Sew a secure button by hand",
      "Mend a small tear with a basic stitch",
      "Choose simple tools for future repairs",
    ],
  },
];

export function getPublishedWorkshops(): Workshop[] {
  return [...workshops].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function getWorkshopBySlug(slug: string): Workshop | undefined {
  return workshops.find((workshop) => workshop.slug === slug);
}

export function getAvailableSeats(workshop: Workshop): number {
  return Math.max(0, workshop.capacity - workshop.confirmedCount);
}

export function formatWorkshopDate(workshop: Workshop): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: workshop.timeZone,
  }).format(new Date(workshop.startsAt));
}

export function formatWorkshopTime(workshop: Workshop): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    timeZone: workshop.timeZone,
  });
  const endWithZone = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: workshop.timeZone,
    timeZoneName: "short",
  });

  return `${formatter.format(new Date(workshop.startsAt))}–${endWithZone.format(new Date(workshop.endsAt))}`;
}
