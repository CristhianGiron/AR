export function createState() {
  return {
    startupReady: false, entries: [], chosen: null, isolatedItem: null, hudHidden: false, hudSurface: null, navigationExpanded: false, collectionMode: false,
    missionId: null, missionNotes: {},
    mode: "rotate", rotationExpanded: false, gesture: null,
    viewState: { x: 0, y: 0, zoom: 1 }, catalog: [],
    sceneGeneration: 0, catalogLoading: false, pendingLoads: 0,
  };
}
