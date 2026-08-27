import InstallPrompt from "./InstallPrompt";
import OfflineBanner from "./OfflineBanner";
import ServiceWorkerRegistrar from "./ServiceWorkerRegistrar";

/**
 * The PWA's own floating chrome, mounted once in the root layout so it survives
 * every view switch.
 *
 * Layering: above the map chrome (z-600) but below the mobile detail sheet
 * (z-800) and the in-depth overlay (z-900) — a transient pill has no business
 * covering what the user just opened. The wrapper itself ignores pointer events
 * so the strip above the bottom edge stays draggable map, and each pill opts
 * back in.
 *
 * Leaflet's own controls sit at z-1000 and so paint over all of that, which is
 * why the phone gutters are 3.5rem rather than the usual `safe-x`: that is the
 * width of the 44px zoom control plus its margin, so a pill is never rendered
 * underneath it. From md up the controls are further apart and the regular
 * safe-area padding is enough.
 */
export default function PwaChrome() {
  return (
    <div className="safe-b pointer-events-none fixed inset-x-0 bottom-0 z-[700] flex flex-col items-center justify-end gap-2 px-14 md:px-6 [&>*]:pointer-events-auto">
      <ServiceWorkerRegistrar />
      <InstallPrompt />
      <OfflineBanner />
    </div>
  );
}
