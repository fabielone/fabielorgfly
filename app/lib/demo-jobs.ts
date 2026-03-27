export type DemoJob = {
  id: string;
  title: string;
  company: string;
  role_type: string | null;
  referral_url: string;
  /** Pay band or structure when known; omit or null when the posting does not disclose it. */
  compensation?: string | null;
  /** Time zone overlap, hiring regions, etc. */
  remote_detail?: string | null;
  /** Skills / tools the posting emphasizes. */
  skills: string[];
};

export const DEMO_JOBS: DemoJob[] = [
  {
    id: "demo-1",
    title: "Junior support specialist",
    company: "Example Co.",
    role_type: "support",
    referral_url: "https://example.com/apply",
    compensation: "MXN 19,000–24,000 / month · benefits after probation",
    remote_detail: "Fully remote · 4h overlap with US Eastern",
    skills: [
      "Written English (B2+)",
      "Zendesk or similar",
      "Email & chat tone",
      "Basic troubleshooting",
      "CRM hygiene",
    ],
  },
  {
    id: "demo-2",
    title: "Outbound SDR",
    company: "Example Sales Inc.",
    role_type: "sales",
    referral_url: "https://example.com/sdr",
    compensation: "MXN 14,000 base + uncapped commission (OTE ~MXN 35k for strong quarters)",
    remote_detail: "Remote · Mexico / LATAM; US West Coast friendly",
    skills: [
      "Outbound English",
      "LinkedIn / email sequencing",
      "Objection handling",
      "HubSpot or Salesforce basics",
      "ICP research",
    ],
  },
  {
    id: "demo-3",
    title: "Junior front-end developer",
    company: "BuildRight",
    role_type: "tech",
    referral_url: "https://example.com/fe",
    compensation: null,
    remote_detail: "Remote-first · team spans EU and Americas (async-friendly)",
    skills: [
      "HTML & CSS",
      "JavaScript (ES modules)",
      "React basics",
      "Git",
      "Responsive layouts",
      "Accessibility awareness",
    ],
  },
];

export function getDemoJob(id: string): DemoJob | undefined {
  return DEMO_JOBS.find((j) => j.id === id);
}
