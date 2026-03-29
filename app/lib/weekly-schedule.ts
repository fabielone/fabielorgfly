export type ScheduleDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ScheduleEventKind = "live_class" | "tiktok_live" | "social_live";

export type ScheduleSlot = {
  day: ScheduleDay;
  start: string;
  end: string;
  title: string;
  kind: ScheduleEventKind;
  /** Optional link (Zoom, TikTok profile, Instagram, etc.) */
  href?: string;
};

export type ScheduleTeacher = {
  id: string;
  name: string;
  focus: string;
  slots: ScheduleSlot[];
};

export const SCHEDULE_DAY_ORDER: ScheduleDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const SCHEDULE_DAY_LABEL: Record<ScheduleDay, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const SCHEDULE_KIND_LABEL: Record<ScheduleEventKind, string> = {
  live_class: "Live class",
  tiktok_live: "TikTok live",
  social_live: "Social live",
};

/** Demo schedule — replace with CMS or DB when ready. */
export const WEEKLY_SCHEDULE_TEACHERS: ScheduleTeacher[] = [
  {
    id: "fabiel",
    name: "Fabiel",
    focus: "English for support & tech communication",
    slots: [
      {
        day: "mon",
        start: "09:00",
        end: "10:30",
        title: "Office hours — Q&A live",
        kind: "live_class",
      },
      {
        day: "wed",
        start: "18:00",
        end: "19:00",
        title: "English drills & pronunciation",
        kind: "live_class",
      },
      {
        day: "thu",
        start: "12:30",
        end: "13:00",
        title: "Quick tips — remote work English",
        kind: "tiktok_live",
        href: "https://www.tiktok.com",
      },
      {
        day: "sat",
        start: "11:00",
        end: "12:00",
        title: "Community AMA",
        kind: "social_live",
      },
    ],
  },
  {
    id: "guest-tech",
    name: "Alex M.",
    focus: "Front-end labs & code review",
    slots: [
      {
        day: "tue",
        start: "17:00",
        end: "19:00",
        title: "Live build session — React patterns",
        kind: "live_class",
      },
      {
        day: "fri",
        start: "16:00",
        end: "17:00",
        title: "Instagram Live — career Q&A",
        kind: "social_live",
        href: "https://www.instagram.com",
      },
    ],
  },
  {
    id: "guest-english",
    name: "Jordan K.",
    focus: "Interview & portfolio English",
    slots: [
      {
        day: "mon",
        start: "19:00",
        end: "20:00",
        title: "Mock interviews (group)",
        kind: "live_class",
      },
      {
        day: "wed",
        start: "13:00",
        end: "13:45",
        title: "TikTok — “5 phrases hiring managers love”",
        kind: "tiktok_live",
        href: "https://www.tiktok.com",
      },
      {
        day: "sun",
        start: "10:00",
        end: "11:30",
        title: "Writing workshop — CV & LinkedIn",
        kind: "live_class",
      },
    ],
  },
];

export function sortSlotsByDayThenTime(slots: ScheduleSlot[]): ScheduleSlot[] {
  const dayIndex = (d: ScheduleDay) => SCHEDULE_DAY_ORDER.indexOf(d);
  return [...slots].sort((a, b) => {
    const di = dayIndex(a.day) - dayIndex(b.day);
    if (di !== 0) return di;
    return a.start.localeCompare(b.start);
  });
}
