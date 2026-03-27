/** Shared job card / apply header copy for compensation + remote context. */

export function JobSkillsList({ skills }: { skills: string[] }) {
  if (!skills.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Skills asked for</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {skills.map((skill, i) => (
          <li
            key={`${i}-${skill}`}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-200"
          >
            {skill}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompensationLine({ compensation }: { compensation: string | null | undefined }) {
  if (compensation && compensation.trim() !== "") {
    return (
      <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <span className="text-zinc-500 dark:text-zinc-400">Compensation · </span>
        {compensation}
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Compensation not listed — confirm with the employer.</p>
  );
}

export function RemoteDetailLine({ remoteDetail }: { remoteDetail: string | null | undefined }) {
  if (!remoteDetail || remoteDetail.trim() === "") return null;
  return <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{remoteDetail}</p>;
}
