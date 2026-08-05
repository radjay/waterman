UserMenu from waterman. Use via `window.Waterman.UserMenu` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Signed-in user menu (avatar trigger plus account actions) for the app header.

**Renders nothing when signed out.** `UserMenu` takes no props and returns
`null` unless `useAuth().user` is set. A preview cannot produce that state: the
harness has no session token, and `AuthProvider` validates a token by querying
Convex, which is deliberately pointed at a non-resolving host.

There is deliberately no preview card — any card would show only the layout
composed around it, never the component's own output. Use it inside `Header` /
`GlobalNavigation` in an authenticated app.
