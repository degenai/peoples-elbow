// Route Finder Module
// Haversine distance calculation and TSP solver for optimal route planning

const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate the Haversine distance between two coordinates in miles.
 * "As the crow flies" - straight line distance on Earth's surface.
 *
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in miles
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Build a distance matrix for a set of locations.
 *
 * @param {Array<{lat: number, lon: number}>} locations - Array of coordinate objects
 * @returns {Array<Array<number>>} 2D distance matrix
 */
function buildDistanceMatrix(locations) {
  const n = locations.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = haversineDistance(
        locations[i].lat, locations[i].lon,
        locations[j].lat, locations[j].lon
      );
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return matrix;
}

/**
 * Select the K nearest leads to the starting point using greedy selection.
 * This creates a cluster of nearby leads rather than far-flung ones.
 *
 * @param {Object} startCoords - {lat, lon} of starting location
 * @param {Array<Object>} leads - Array of lead objects with coords property
 * @param {number} maxLeads - Maximum number of leads to select
 * @returns {Array<Object>} Selected leads (subset)
 */
function selectNearestLeads(startCoords, leads, maxLeads) {
  if (leads.length <= maxLeads) {
    return leads;
  }

  // Calculate distance from start for each lead
  const leadsWithDistance = leads.map(lead => ({
    lead,
    distanceFromStart: haversineDistance(
      startCoords.lat, startCoords.lon,
      lead.coords.lat, lead.coords.lon
    )
  }));

  // Sort by distance from start
  leadsWithDistance.sort((a, b) => a.distanceFromStart - b.distanceFromStart);

  // Take the nearest K
  return leadsWithDistance.slice(0, maxLeads).map(item => item.lead);
}

/**
 * Solve TSP using Nearest Neighbor heuristic.
 * Starts from index 0 (the starting location) and greedily picks closest unvisited.
 *
 * @param {Array<Array<number>>} distMatrix - Distance matrix
 * @param {number} startIndex - Index to start from (usually 0)
 * @returns {Array<number>} Ordered array of indices representing the route
 */
function nearestNeighborTSP(distMatrix, startIndex = 0) {
  const n = distMatrix.length;
  const visited = new Set([startIndex]);
  const route = [startIndex];
  let current = startIndex;

  while (visited.size < n) {
    let nearestDist = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distMatrix[current][i] < nearestDist) {
        nearestDist = distMatrix[current][i];
        nearestIdx = i;
      }
    }

    if (nearestIdx !== -1) {
      visited.add(nearestIdx);
      route.push(nearestIdx);
      current = nearestIdx;
    }
  }

  return route;
}

/**
 * Calculate total route distance.
 *
 * @param {Array<number>} route - Array of indices
 * @param {Array<Array<number>>} distMatrix - Distance matrix
 * @returns {number} Total distance
 */
function routeDistance(route, distMatrix) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += distMatrix[route[i]][route[i + 1]];
  }
  return total;
}

/**
 * Improve a route using 2-opt swaps.
 * Repeatedly reverses segments of the route if it reduces total distance.
 *
 * @param {Array<number>} route - Initial route (array of indices)
 * @param {Array<Array<number>>} distMatrix - Distance matrix
 * @param {number} maxIterations - Maximum improvement iterations
 * @returns {Array<number>} Improved route
 */
function twoOptImprove(route, distMatrix, maxIterations = 100) {
  let improved = true;
  let iterations = 0;
  let bestRoute = [...route];
  let bestDistance = routeDistance(bestRoute, distMatrix);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Start from 1 to keep the starting point fixed
    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let j = i + 1; j < bestRoute.length; j++) {
        // Create new route by reversing segment between i and j
        const newRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, j + 1).reverse(),
          ...bestRoute.slice(j + 1)
        ];

        const newDistance = routeDistance(newRoute, distMatrix);

        if (newDistance < bestDistance) {
          bestRoute = newRoute;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Main route solving function.
 * Takes a starting point and leads, returns optimally ordered route.
 *
 * @param {Object} startCoords - {lat, lon} of starting location
 * @param {Array<Object>} leads - Array of leads with coords: {lat, lon}
 * @param {number} maxLeads - Maximum leads to include in route
 * @returns {Object} Result with orderedLeads and routeStats
 */
function solveRoute(startCoords, leads, maxLeads) {
  // Filter to leads with valid coordinates
  const validLeads = leads.filter(lead =>
    lead.coords &&
    typeof lead.coords.lat === 'number' &&
    typeof lead.coords.lon === 'number'
  );

  if (validLeads.length === 0) {
    return {
      orderedLeads: [],
      routeStats: {
        totalDistance: 0,
        leadsIncluded: 0,
        leadsSkipped: leads.length
      }
    };
  }

  // Select subset of nearest leads
  const selectedLeads = selectNearestLeads(startCoords, validLeads, maxLeads);

  // Build locations array with start point at index 0
  const locations = [
    { lat: startCoords.lat, lon: startCoords.lon },
    ...selectedLeads.map(lead => lead.coords)
  ];

  // Build distance matrix
  const distMatrix = buildDistanceMatrix(locations);

  // Solve with nearest neighbor
  let route = nearestNeighborTSP(distMatrix, 0);

  // Improve with 2-opt
  route = twoOptImprove(route, distMatrix);

  // Calculate distances between consecutive stops
  const orderedLeads = [];
  for (let i = 1; i < route.length; i++) {
    const leadIndex = route[i] - 1; // -1 because start point is at index 0
    const prevIndex = route[i - 1];
    const distanceFromPrevious = distMatrix[prevIndex][route[i]];

    orderedLeads.push({
      ...selectedLeads[leadIndex],
      routeOrder: i,
      distanceFromPrevious: Math.round(distanceFromPrevious * 100) / 100
    });
  }

  // Calculate total route distance
  const totalDistance = routeDistance(route, distMatrix);

  return {
    orderedLeads,
    routeStats: {
      totalDistance: Math.round(totalDistance * 100) / 100,
      leadsIncluded: selectedLeads.length,
      leadsSkipped: leads.length - validLeads.length
    }
  };
}

/**
 * Generate a Google Maps multi-stop directions URL.
 *
 * @param {string} startAddress - Starting address
 * @param {Array<Object>} orderedLeads - Leads in visit order with address property
 * @returns {string} Google Maps directions URL
 */
function generateGoogleMapsUrl(startAddress, orderedLeads) {
  const stops = [startAddress, ...orderedLeads.map(lead => lead.address)];
  const encodedStops = stops.map(addr => encodeURIComponent(addr));
  return `https://www.google.com/maps/dir/${encodedStops.join('/')}`;
}

export {
  haversineDistance,
  buildDistanceMatrix,
  selectNearestLeads,
  nearestNeighborTSP,
  twoOptImprove,
  routeDistance,
  solveRoute,
  generateGoogleMapsUrl
};
