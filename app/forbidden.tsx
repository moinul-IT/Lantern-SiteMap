import Link from "next/link";
import AccessNotice from "@/components/AccessNotice";

/**
 * Rendered with a 403 whenever a page calls `forbidden()` — today that is only
 * /manage, reached by someone signed in without the content manager role.
 *
 * Deliberately not a redirect to sign-in: this person is already signed in, so
 * signing in again would send them round a loop that ends where it started,
 * with nothing explaining why.
 */
export default function Forbidden() {
  return (
    <AccessNotice>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
        You are signed in, but this account has not been given the content
        manager role, so there is nothing here to edit.
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
        Someone who administers the app can grant it in Azure, under the app
        registration&rsquo;s users and roles.
      </p>
      <Link
        href="/"
        className="mt-6 block text-[13px] text-ink-faint underline-offset-4 hover:underline"
      >
        Back to the map
      </Link>
    </AccessNotice>
  );
}
