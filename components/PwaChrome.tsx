import InstallPrompt from "./InstallPrompt";
import OfflineBanner from "./OfflineBanner";
import ServiceWorkerRegistrar from "./ServiceWorkerRegistrar";

/**
 * The PWA's own floating chrome, mounted once in the root layout so it survives
 * every view switch.
 *
 * Layering, which is fiddlier than it looks. SiteExplorer's floating chrome
 * wrapper is `z-600` *and* positioned, so it is a stacking context: everything
 * inside it — the legend, and the phone detail sheet's own `z-800` — collapses
 * to that single 600 for anything outside. There is no slot between them to
 * take from here, so this sits **below** the lot at 550. Above it, a transient
 * pill would cover the sheet's action row and swallow the taps meant for it.
 * The in-depth overlay renders outside that wrapper at `z-900` and so still
 * covers these, which is what we want.
 *
 * Being underneath means the phone bottom band (legend pill, Leaflet's zoom
 * control at its own `z-1000`) would paint over a pill anchored to the bottom
 * edge, hence `bottom-16` on phones: it clears that whole row rather than
 * fighting it for the same space. From md up the band is far enough away.
 *
 * The wrapper ignores pointer events so the map behind it stays draggable, and
 * each pill opts back in.
 */
export default function PwaChrome() {
  return (
    <div className="safe-b pointer-events-none fixed inset-x-0 bottom-16 z-[550] flex flex-col items-center justify-end gap-2 px-3 md:bottom-0 md:px-6 [&>*]:pointer-events-auto">
      <ServiceWorkerRegistrar />
      <InstallPrompt />
      <OfflineBanner />
    </div>
  );
}
