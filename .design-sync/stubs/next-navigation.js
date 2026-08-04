// Inert stand-in for next/navigation in the design-system bundle.
//
// Nine components call useRouter()/usePathname(). Outside a Next.js app there
// is no mounted app router, so the real module throws "invariant expected app
// router to be mounted" and blanks the preview. The design agent builds UI with
// these components outside Next entirely, so routing is not part of the design
// system's contract — navigation is a no-op here rather than a crash.
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => Promise.resolve(),
});
export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const redirect = () => {};
export const notFound = () => {};
