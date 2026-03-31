import { useNavigation } from "react-router";

import { Spinner } from "~/components/Spinner";

type Props = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Disables and shows a spinner while a native form POST navigation is in flight. */
export function NavigationFormBusyButton({ children, className = "", disabled, ...rest }: Props) {
  const navigation = useNavigation();
  const busy = navigation.state === "submitting" && navigation.formMethod === "POST";
  return (
    <button
      type="submit"
      {...rest}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? (
        <>
          <Spinner className="h-4 w-4 shrink-0" />
          <span>Working…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
