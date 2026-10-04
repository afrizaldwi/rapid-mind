import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Initialize the MapLibre web worker globally once using Vite's worker bundling
if (typeof window !== 'undefined') {
    maplibregl.setWorkerUrl(workerUrl);
}

export * from 'maplibre-gl';
export { maplibregl, workerUrl };
export default maplibregl;
