import * as turf from '@turf/turf';

const p1 = turf.polygon([[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]]);
const p2 = turf.polygon([[[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]]]);

try {
  const result = turf.intersect(turf.featureCollection([p1, p2]));
  console.log("Success with featureCollection:", !!result);
} catch (e) {
  console.log("Error with featureCollection:", e.message);
}
