// Tests for route-finder.js
// Plain node:test + ESM, no test framework to install. Run with:
//   node --test js/crm/route-finder.test.js
//
// "Steal This Site" suite: these tests double as documentation. Each one says,
// in plain language, what guarantee the route math is supposed to give you.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  haversineDistance,
  buildDistanceMatrix,
  nearestNeighborTSP,
  twoOptImprove,
  routeDistance,
  solveRoute,
  generateGoogleMapsUrl
} from './route-finder.js';

// ---------------------------------------------------------------------------
// 1. Haversine sanity: a known city pair should come out near the real value.
// ---------------------------------------------------------------------------
test('haversineDistance matches a known city pair (NYC <-> LA)', () => {
  // Great-circle distance New York City to Los Angeles is ~2451 miles.
  const nyc = { lat: 40.7128, lon: -74.0060 };
  const la = { lat: 34.0522, lon: -118.2437 };

  const miles = haversineDistance(nyc.lat, nyc.lon, la.lat, la.lon);

  // Allow a generous tolerance — the published figure varies by source and we
  // use a spherical Earth, not an ellipsoid. Anything within 25 miles of 2451
  // proves the formula isn't off by a unit or a sign.
  assert.ok(Math.abs(miles - 2451) < 25, `expected ~2451 mi, got ${miles}`);
});

test('haversineDistance is zero for identical points', () => {
  assert.equal(haversineDistance(33.75, -84.39, 33.75, -84.39), 0);
});

// ---------------------------------------------------------------------------
// 2. 2-opt must never make a route worse than the nearest-neighbor start.
//    Fixed 6-point set so the result is deterministic across runs.
// ---------------------------------------------------------------------------
test('twoOptImprove total distance <= nearest-neighbor on a fixed 6-point set', () => {
  // Six points placed so that pure nearest-neighbor produces a crossing route
  // that 2-opt can untangle. Index 0 is the start; the rest are "leads".
  const points = [
    { lat: 0, lon: 0 },   // 0 - start
    { lat: 0, lon: 3 },   // 1
    { lat: 3, lon: 0 },   // 2
    { lat: 3, lon: 3 },   // 3
    { lat: 1, lon: 4 },   // 4
    { lat: 4, lon: 1 }    // 5
  ];

  const matrix = buildDistanceMatrix(points);

  const nnRoute = nearestNeighborTSP(matrix, 0);
  const nnDistance = routeDistance(nnRoute, matrix);

  const optRoute = twoOptImprove(nnRoute, matrix);
  const optDistance = routeDistance(optRoute, matrix);

  // 2-opt only ever applies a swap when it strictly shortens the route, so the
  // result must be improved-or-equal, never worse.
  assert.ok(
    optDistance <= nnDistance + 1e-9,
    `2-opt made it worse: nn=${nnDistance}, opt=${optDistance}`
  );

  // It must keep the same node set (a permutation), just reordered, and keep
  // the start fixed at index 0.
  assert.equal(optRoute[0], 0, 'start point must stay first');
  assert.deepEqual([...optRoute].sort(), [0, 1, 2, 3, 4, 5]);
});

test('twoOptImprove strictly improves a deliberately crossed route', () => {
  // A square: 0,1,2,3 at the corners. Visiting them in the order 0->2->1->3
  // crosses the square diagonally (long). 2-opt should find the perimeter,
  // which is shorter. This proves the improver actually does something, not
  // just that it doesn't regress.
  const square = [
    { lat: 0, lon: 0 }, // 0
    { lat: 0, lon: 1 }, // 1
    { lat: 1, lon: 0 }, // 2
    { lat: 1, lon: 1 }  // 3
  ];
  const matrix = buildDistanceMatrix(square);

  // Force the crossed starting order (not nearest-neighbor) to give 2-opt
  // something to fix.
  const crossed = [0, 2, 1, 3];
  const crossedDistance = routeDistance(crossed, matrix);

  const improved = twoOptImprove(crossed, matrix);
  const improvedDistance = routeDistance(improved, matrix);

  assert.ok(
    improvedDistance < crossedDistance,
    `expected improvement: crossed=${crossedDistance}, improved=${improvedDistance}`
  );
});

// ---------------------------------------------------------------------------
// 3. generateGoogleMapsUrl: 9-stop cap + dropped count.
// ---------------------------------------------------------------------------
test('generateGoogleMapsUrl caps at 9 stops beyond the origin and reports dropped', () => {
  // 12 leads — 3 more than the cap of 9.
  const leads = Array.from({ length: 12 }, (_, i) => ({
    address: `${i + 1} Test St, Woodstock, GA`
  }));

  const result = generateGoogleMapsUrl('Start Address, Woodstock, GA', leads);

  assert.equal(result.includedStops, 9, 'should include exactly 9 leads');
  assert.equal(result.droppedStops, 3, 'should drop the 3 that did not fit');

  // The URL itself should have origin + 9 = 10 path segments after /maps/dir/.
  const path = result.url.split('/maps/dir/')[1];
  const segments = path.split('/');
  assert.equal(segments.length, 10, 'origin + 9 waypoints = 10 URL segments');

  // The 10th lead onward must NOT appear in the URL.
  assert.ok(!result.url.includes('10%20Test%20St'), 'dropped stop leaked into URL');
});

test('generateGoogleMapsUrl includes everything when under the cap', () => {
  const leads = [
    { address: 'A St' },
    { address: 'B St' },
    { address: 'C St' }
  ];

  const result = generateGoogleMapsUrl('Home', leads);

  assert.equal(result.includedStops, 3);
  assert.equal(result.droppedStops, 0);
  // origin + 3 = 4 segments
  assert.equal(result.url.split('/maps/dir/')[1].split('/').length, 4);
});

test('generateGoogleMapsUrl handles an empty lead list', () => {
  const result = generateGoogleMapsUrl('Home', []);
  assert.equal(result.includedStops, 0);
  assert.equal(result.droppedStops, 0);
  assert.equal(result.url, 'https://www.google.com/maps/dir/Home');
});

// ---------------------------------------------------------------------------
// 4. leadsSkipped: leads without valid coords must be counted as skipped, not
//    silently routed.
// ---------------------------------------------------------------------------
test('solveRoute counts coord-less leads as leadsSkipped', () => {
  const start = { lat: 34.10, lon: -84.51 }; // Woodstock-ish

  const leads = [
    { id: 'a', coords: { lat: 34.11, lon: -84.52 } }, // valid
    { id: 'b', coords: null },                          // skipped
    { id: 'c', coords: { lat: 34.09, lon: -84.50 } }, // valid
    { id: 'd' },                                        // no coords key -> skipped
    { id: 'e', coords: { lat: 'nope', lon: -84.5 } }   // non-numeric -> skipped
  ];

  const { orderedLeads, routeStats } = solveRoute(start, leads, 10);

  assert.equal(routeStats.leadsSkipped, 3, 'b, d, e have no usable coords');
  assert.equal(routeStats.leadsIncluded, 2, 'only a and c are routable');
  assert.equal(orderedLeads.length, 2);
});

test('solveRoute returns all-skipped when no lead has coords', () => {
  const start = { lat: 34.10, lon: -84.51 };
  const leads = [{ id: 'a' }, { id: 'b', coords: null }];

  const { orderedLeads, routeStats } = solveRoute(start, leads, 10);

  assert.equal(routeStats.leadsSkipped, 2);
  assert.equal(routeStats.leadsIncluded, 0);
  assert.equal(routeStats.totalDistance, 0);
  assert.deepEqual(orderedLeads, []);
});
