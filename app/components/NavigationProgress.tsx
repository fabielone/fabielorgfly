import { useNavigation } from "react-router";

/** Thin animated bar during full-page navigations and native form POSTs. */
export function NavigationProgress() {
  const navigation = useNavigation();
  const busy = navigation.state === "loading" || navigation.state === "submitting";

  return (
    <div
      className={`pointer-events-none fixed top-0 right-0 left-0 z-[200] h-[3px] overflow-hidden transition-opacity duration-200 ${
        busy ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <div
        className={`h-full bg-emerald-600 dark:bg-emerald-500 ${busy ? "w-1/3 animate-nav-progress" : "w-0"}`}
      />
    </div>
  );
}
