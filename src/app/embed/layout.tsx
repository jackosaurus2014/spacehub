/**
 * Layout for /embed/* routes.
 *
 * The root layout at src/app/layout.tsx always mounts Navigation, Footer,
 * MobileTabBar, TrialBanner and related chrome. Because we cannot modify
 * that file, we inject CSS here to hide those shells so the embed pages
 * render bare inside iframes.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        // Hide all root-layout chrome that would pollute an iframe embed.
        // Selectors target the siblings of <main id="main-content"> inside
        // the flex container. Scoped by body[data-embed] below.
        dangerouslySetInnerHTML={{
          __html: `
            body[data-embed="true"] nav,
            body[data-embed="true"] footer,
            body[data-embed="true"] header,
            body[data-embed="true"] [data-trial-banner],
            body[data-embed="true"] [data-announcement-banner],
            body[data-embed="true"] [data-live-now-banner],
            body[data-embed="true"] [data-industry-ticker],
            body[data-embed="true"] [data-mobile-tab-bar],
            body[data-embed="true"] [data-module-nav-bar],
            body[data-embed="true"] [data-auto-breadcrumb],
            body[data-embed="true"] [data-quick-access-sidebar],
            body[data-embed="true"] [data-swipe-nav],
            body[data-embed="true"] [data-cookie-consent],
            body[data-embed="true"] [data-pwa-install] {
              display: none !important;
            }
            body[data-embed="true"] main#main-content {
              padding-left: 0 !important;
              padding-bottom: 0 !important;
            }
            body[data-embed="true"] { background: transparent; }
          `,
        }}
      />
      <script
        // Mark the body so the CSS selectors above activate without a
        // client component. Safe — runs once per embed route navigation.
        dangerouslySetInnerHTML={{
          __html: `document.body.setAttribute('data-embed','true');`,
        }}
      />
      {children}
    </>
  );
}
