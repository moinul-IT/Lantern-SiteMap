import Link from "next/link";
import { loginUrl } from "@/lib/server/principal";
import AccessNotice from "@/components/AccessNotice";

/**
 * Rendered with a 401 whenever a page calls `unauthorized()` — today that is
 * only /manage, reached by someone who has not signed in.
 */
export default function Unauthorized() {
  return (
    <AccessNotice>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
        Sign in with your Lantern account to edit site information, rosters and
        coverage.
      </p>
      <a
        href={loginUrl("/manage")}
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[13px] text-cream"
      >
        Sign in
      </a>
      <Link
        href="/"
        className="mt-6 block text-[13px] text-ink-faint underline-offset-4 hover:underline"
      >
        Back to the map
      </Link>
    </AccessNotice>
  );
}
