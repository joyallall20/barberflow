// Single source of truth for The Foundry.
// Every section imports from here so numbers can never drift apart.

export const FOUNDED = 2011;
export const RATING = 4.9;
export const CLIENTS = 5000;
export const TIMEZONE = "America/Chicago";

export const yearsInBusiness = () => new Date().getFullYear() - FOUNDED;

// Flip to true to show "Demo location" labels in the Shop section.
export const SHOW_DEMO_LABELS = false;

export const ADDRESS = {
  street: "1234 South Congress Ave",
  city: "Austin, TX",
  mapQuery: "South Congress Ave, Austin, TX",
};

// Swap for a dedicated interior photo when you have one.
export const INTERIOR_IMAGE = "/hero.jfif";

// Display rows for the Shop section
export const HOURS = [
  { days: "Mon — Sat", time: "9:00 AM — 7:00 PM" },
  { days: "Sunday", time: "Closed" },
];

// Logic behind the live open/closed indicator (keep in sync with HOURS)
const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;
const CLOSED_DAYS = [0]; // 0 = Sunday

export const getShopStatus = (date = new Date()) => {
  const local = new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const day = local.getDay();
  const hour = local.getHours() + local.getMinutes() / 60;
  const openToday = !CLOSED_DAYS.includes(day);

  if (openToday && hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
    return { open: true, label: "Open · Until 7PM" };
  }
  if (openToday && hour < OPEN_HOUR) {
    return { open: false, label: "Closed · Opens 9AM" };
  }
  const tomorrowClosed = CLOSED_DAYS.includes((day + 1) % 7);
  return {
    open: false,
    label: tomorrowClosed ? "Closed · Opens Monday 9AM" : "Closed · Opens tomorrow 9AM",
  };
};

export const barbers = [
  {
    id: 1,
    slug: "marcus",
    name: "Marcus Reed",
    firstName: "Marcus",
    role: "Master Barber",
    years: 12,
    image: "/barber1.png",
    specialties: ["Classic Cuts", "Skin Fades", "Beard Sculpting"],
    intro:
      "Marcus brings a classic barber's discipline to every chair. His approach is precise, relaxed, and built around understanding exactly what each client wants.",
    quote: "Classic cuts. No shortcuts.",
  },
  {
    id: 2,
    slug: "james",
    name: "James Carter",
    firstName: "James",
    role: "Master Barber",
    years: 9,
    image: "/barber2.png",
    specialties: ["Traditional Cuts", "Modern Styling", "Taper Fades"],
    intro:
      "James blends traditional barbering with a modern Austin edge. He believes the best cut is one that looks effortless when you walk out the door.",
    quote: "Details make the difference.",
  },
  {
    id: 3,
    slug: "david",
    name: "David Cole",
    firstName: "David",
    role: "Master Barber",
    years: 8,
    image: "/barber3.png",
    specialties: ["Beard Sculpting", "Hot Towel Shaves", "Classic Cuts"],
    intro:
      "David is known for his attention to detail and his appreciation for the traditional barbering ritual, from the first consultation to the final hot towel.",
    quote: "The ritual matters.",
  },
  {
    id: 4,
    slug: "ryan",
    name: "Ryan Hayes",
    firstName: "Ryan",
    role: "Master Barber",
    years: 7,
    image: "/barber4.png",
    specialties: ["Skin Fades", "Textured Cuts", "Modern Styling"],
    intro:
      "Ryan combines modern technique with the relaxed atmosphere of an old-school barbershop. His specialty is clean, natural-looking styles built around each client's personality.",
    quote: "Make it yours.",
  },
];