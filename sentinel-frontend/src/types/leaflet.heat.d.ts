/**
 * Minimal type shim for leaflet.heat.
 * The library has no official @types package — this silences the
 * "cannot find module" TS error at the import site.
 * The actual L.heatLayer() call still uses @ts-expect-error because
 * augmenting the Leaflet namespace properly is out of scope.
 */
declare module "leaflet.heat" {
  const _default: unknown;
  export default _default;
}
