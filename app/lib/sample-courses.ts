export type CourseLesson = {
  id: string;
  title: string;
  durationMin: number;
  /** When true, non-subscribers can open this lesson (e.g. YouTube link). */
  isFreePreview: boolean;
  /** Public URL for preview lessons (YouTube / TikTok). */
  previewUrl?: string;
};

export type SampleCourse = {
  slug: string;
  title: string;
  subtitle: string;
  track: "tech" | "english";
  description: string;
  lessonCount: number;
  lessons: CourseLesson[];
};

/** Sample catalog — replace with Supabase later. No course is fully free: full paths require a subscription. */
export const SAMPLE_COURSES: SampleCourse[] = [
  {
    slug: "english-support-tickets",
    title: "English for support tickets",
    subtitle: "Clear, polite, and fast written English for CS tools",
    track: "english",
    description:
      "Templates, tone, and clarity for email, chat, and ticket systems. You practice rewriting real snippets and submit PRs in the shared learner repo.",
    lessonCount: 6,
    lessons: [
      {
        id: "es-1",
        title: "Tone ladder: friendly vs formal",
        durationMin: 12,
        isFreePreview: true,
        previewUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      },
      {
        id: "es-2",
        title: "Structuring a first reply",
        durationMin: 18,
        isFreePreview: true,
        previewUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      },
      {
        id: "es-3",
        title: "Escalations without annoyance",
        durationMin: 14,
        isFreePreview: false,
      },
      {
        id: "es-4",
        title: "Saying no with a next step",
        durationMin: 16,
        isFreePreview: false,
      },
      {
        id: "es-5",
        title: "Latency and expectations",
        durationMin: 11,
        isFreePreview: false,
      },
      {
        id: "es-6",
        title: "Capstone: rewrite five real tickets",
        durationMin: 35,
        isFreePreview: false,
      },
    ],
  },
  {
    slug: "git-github-contributors",
    title: "Git & GitHub for contributors",
    subtitle: "Branches, PRs, and reviews on a shared training repo",
    track: "tech",
    description:
      "From clone to merge: everyday commands, good commit messages, and opening pull requests the way hiring teams expect.",
    lessonCount: 8,
    lessons: [
      {
        id: "gh-1",
        title: "Clone, branch, first commit",
        durationMin: 22,
        isFreePreview: true,
        previewUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      },
      {
        id: "gh-2",
        title: "Syncing with upstream",
        durationMin: 15,
        isFreePreview: false,
      },
      {
        id: "gh-3",
        title: "Pull requests and descriptions",
        durationMin: 20,
        isFreePreview: false,
      },
      {
        id: "gh-4",
        title: "Reviewing others’ diffs",
        durationMin: 18,
        isFreePreview: false,
      },
      {
        id: "gh-5",
        title: "Handling feedback and CI checks",
        durationMin: 17,
        isFreePreview: false,
      },
      {
        id: "gh-6",
        title: "Conflicts without fluff",
        durationMin: 25,
        isFreePreview: false,
      },
      {
        id: "gh-7",
        title: "Rebase vs merge (practical rule)",
        durationMin: 14,
        isFreePreview: false,
      },
      {
        id: "gh-8",
        title: "Capstone: ship a small fix",
        durationMin: 40,
        isFreePreview: false,
      },
    ],
  },
  {
    slug: "sales-outreach-english",
    title: "Sales outreach in English",
    subtitle: "Cold email and call openers that sound human",
    track: "english",
    description:
      "Frameworks for ICP, sequence basics, and language that avoids spam triggers—aimed at SDR-style roles.",
    lessonCount: 5,
    lessons: [
      {
        id: "so-1",
        title: "ICP in one paragraph",
        durationMin: 14,
        isFreePreview: false,
      },
      {
        id: "so-2",
        title: "Cold email anatomy",
        durationMin: 19,
        isFreePreview: false,
      },
      {
        id: "so-3",
        title: "Follow-ups that do not nag",
        durationMin: 16,
        isFreePreview: false,
      },
      {
        id: "so-4",
        title: "Call opener + permission",
        durationMin: 21,
        isFreePreview: false,
      },
      {
        id: "so-5",
        title: "Capstone: a three-touch sequence",
        durationMin: 32,
        isFreePreview: false,
      },
    ],
  },
  {
    slug: "javascript-fundamentals",
    title: "JavaScript fundamentals for web roles",
    subtitle: "Readable code and small projects hiring managers recognize",
    track: "tech",
    description:
      "Syntax you use on the job: functions, modules, async/await, and debugging—paired with short exercises.",
    lessonCount: 10,
    lessons: [
      {
        id: "js-1",
        title: "Values, types, and strict mode",
        durationMin: 16,
        isFreePreview: true,
        previewUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      },
      {
        id: "js-2",
        title: "Functions and scope",
        durationMin: 22,
        isFreePreview: true,
        previewUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      },
      {
        id: "js-3",
        title: "Arrays and list patterns",
        durationMin: 20,
        isFreePreview: true,
        previewUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      },
      {
        id: "js-4",
        title: "Objects and JSON boundaries",
        durationMin: 18,
        isFreePreview: false,
      },
      {
        id: "js-5",
        title: "Modules in real repos",
        durationMin: 24,
        isFreePreview: false,
      },
      {
        id: "js-6",
        title: "Promises and async/await",
        durationMin: 28,
        isFreePreview: false,
      },
      {
        id: "js-7",
        title: "Fetch and error handling",
        durationMin: 26,
        isFreePreview: false,
      },
      {
        id: "js-8",
        title: "Debugging in the browser",
        durationMin: 19,
        isFreePreview: false,
      },
      {
        id: "js-9",
        title: "Small CLI-style exercise",
        durationMin: 35,
        isFreePreview: false,
      },
      {
        id: "js-10",
        title: "Capstone: refactor for readability",
        durationMin: 45,
        isFreePreview: false,
      },
    ],
  },
];

export function getSampleCourseBySlug(slug: string): SampleCourse | undefined {
  return SAMPLE_COURSES.find((c) => c.slug === slug);
}

export function countFreePreviews(course: SampleCourse): number {
  return course.lessons.filter((l) => l.isFreePreview).length;
}
