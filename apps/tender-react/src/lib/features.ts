// Product switches for behaviour we may want to flip back later.
//
// COST_CENTER_MODE
//   'single' — one cost center per request: pick a tile, or pick one from
//              "View more cost centers" (shown as a removable pill, replacing the tile choice).
//   'multi'  — the tile is the default cost center and "View more cost centers"
//              adds any number of additional cost centers as pills.
// Change DEFAULT_COST_CENTER_MODE to switch for everyone, or add ?cc=multi / ?cc=single
// to the page URL to try the other behaviour without changing code.
export type CostCenterMode = 'single' | 'multi';
const DEFAULT_COST_CENTER_MODE: CostCenterMode = 'single';

function fromUrl(): CostCenterMode | null {
  try {
    const v = new URLSearchParams(window.location.search).get('cc');
    return v === 'single' || v === 'multi' ? v : null;
  } catch {
    return null;
  }
}

export const COST_CENTER_MODE: CostCenterMode = fromUrl() ?? DEFAULT_COST_CENTER_MODE;
