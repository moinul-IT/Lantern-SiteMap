/**
 * Server-side validation of an incoming snapshot.
 *
 * The client does its own shape check before rendering one, but that protects
 * the reader, not the store. This is the gate that stops a bad document being
 * persisted — once it is saved every visitor gets it, so "the map went blank
 * for everyone" is one save away without this.
 *
 * It checks structure and internal consistency, not taste: a content manager is
 * free to rename a site or empty a roster. What it refuses is a document that
 * would break the app — no sites, a site without coordinates, a cluster
 * pointing at a VP that does not exist.
 */

export const CLUSTER_IDS = [1, 2, 3, 4];
export const COVERAGE_CLUSTER_IDS = [1, 2, 3];
export const STAFF_ROLES = ["SPD", "PD", "APD", "PA", "DPO", "DSS", "Admin"];
const BOROUGHS = ["Bronx", "Manhattan", "Brooklyn", "Queens"];
const SITE_TYPES = ["Supportive Housing", "Shelter"];
const CONTRACTS = ["DOHMH", "HASA"];

type Rec = Record<string, unknown>;

const isObject = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/** New York, loosely — enough to catch a transposed or empty coordinate. */
function isPlausibleCoordinate(lat: unknown, lng: unknown) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat > 40 &&
    lat < 41.5 &&
    lng > -74.5 &&
    lng < -73
  );
}

export type ValidationResult = { valid: boolean; errors: string[] };

export function validateSnapshot(input: unknown): ValidationResult {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(message);

  if (!isObject(input)) return { valid: false, errors: ["not an object"] };

  // ---- Sites ------------------------------------------------------------
  if (!Array.isArray(input.sites) || input.sites.length === 0) {
    fail("sites must be a non-empty array");
  } else {
    const seen = new Set<string>();
    input.sites.forEach((site: unknown, i: number) => {
      const at = `sites[${i}]`;
      if (!isObject(site)) return fail(`${at} is not an object`);
      if (!isNonEmptyString(site.id)) fail(`${at}.id is required`);
      else if (seen.has(site.id)) fail(`${at}.id "${site.id}" is duplicated`);
      else seen.add(site.id);

      if (!isNonEmptyString(site.name)) fail(`${at}.name is required`);
      if (!BOROUGHS.includes(site.borough as string)) fail(`${at}.borough is invalid`);
      if (!SITE_TYPES.includes(site.type as string)) fail(`${at}.type is invalid`);
      if (!isPlausibleCoordinate(site.lat, site.lng)) {
        fail(`${at} coordinates are missing or outside the New York area`);
      }
      if (site.cluster !== null && !CLUSTER_IDS.includes(site.cluster as number)) {
        fail(`${at}.cluster must be null or one of ${CLUSTER_IDS.join(", ")}`);
      }
    });
  }

  const siteIds = new Set<string>(
    Array.isArray(input.sites)
      ? input.sites.filter(isObject).map((s) => s.id as string)
      : [],
  );

  // ---- The office -------------------------------------------------------
  if (!isObject(input.mainOffice)) fail("mainOffice is required");
  else {
    if (!isNonEmptyString(input.mainOffice.id)) fail("mainOffice.id is required");
    if (!isNonEmptyString(input.mainOffice.name)) fail("mainOffice.name is required");
    if (!isPlausibleCoordinate(input.mainOffice.lat, input.mainOffice.lng)) {
      fail("mainOffice coordinates are missing or outside the New York area");
    }
  }

  // ---- Oversight --------------------------------------------------------
  if (!Array.isArray(input.vps)) fail("vps must be an array");
  const vpIds = new Set<string>(
    Array.isArray(input.vps)
      ? input.vps.filter(isObject).map((v) => v.id as string)
      : [],
  );
  if (Array.isArray(input.vps)) {
    input.vps.forEach((vp: unknown, i: number) => {
      if (!isObject(vp)) return fail(`vps[${i}] is not an object`);
      if (!isNonEmptyString(vp.id)) fail(`vps[${i}].id is required`);
      if (!isNonEmptyString(vp.name)) fail(`vps[${i}].name is required`);
    });
  }

  if (!isObject(input.clusterVps)) fail("clusterVps is required");
  else {
    for (const cluster of CLUSTER_IDS) {
      const vpId = input.clusterVps[cluster];
      if (!isNonEmptyString(vpId)) fail(`clusterVps[${cluster}] is required`);
      else if (!vpIds.has(vpId)) {
        fail(`clusterVps[${cluster}] points at unknown VP "${vpId}"`);
      }
    }
  }

  if (!Array.isArray(input.shelterVps)) fail("shelterVps must be an array");
  else {
    input.shelterVps.forEach((id: unknown, i: number) => {
      if (!vpIds.has(id as string)) {
        fail(`shelterVps[${i}] points at unknown VP "${String(id)}"`);
      }
    });
  }

  if (!isObject(input.siteTeams)) fail("siteTeams is required");
  else {
    for (const [siteId, team] of Object.entries(input.siteTeams)) {
      if (!siteIds.has(siteId)) {
        fail(`siteTeams has an entry for unknown site "${siteId}"`);
      }
      if (!isObject(team) || !Array.isArray(team.staff)) {
        fail(`siteTeams["${siteId}"].staff must be an array`);
        continue;
      }
      team.staff.forEach((entry: unknown, i: number) => {
        const at = `siteTeams["${siteId}"].staff[${i}]`;
        if (!isObject(entry)) return fail(`${at} is not an object`);
        if (!STAFF_ROLES.includes(entry.role as string)) fail(`${at}.role is invalid`);
        if (!isNonEmptyString(entry.name)) fail(`${at}.name is required`);
      });
    }
  }

  if (isObject(input.siteContracts)) {
    for (const [siteId, contract] of Object.entries(input.siteContracts)) {
      if (!siteIds.has(siteId)) {
        fail(`siteContracts has an entry for unknown site "${siteId}"`);
      }
      if (!CONTRACTS.includes(contract as string)) {
        fail(`siteContracts["${siteId}"] is invalid`);
      }
    }
  } else {
    fail("siteContracts is required");
  }

  if (!Array.isArray(input.programLeadership)) fail("programLeadership must be an array");

  // ---- Procurement ------------------------------------------------------
  if (!Array.isArray(input.procurementPeople)) fail("procurementPeople must be an array");
  const personIds = new Set<string>(
    Array.isArray(input.procurementPeople)
      ? input.procurementPeople.filter(isObject).map((p) => p.id as string)
      : [],
  );

  if (!Array.isArray(input.procurementLeadership)) {
    fail("procurementLeadership must be an array");
  } else {
    input.procurementLeadership.forEach((id: unknown, i: number) => {
      if (!personIds.has(id as string)) {
        fail(`procurementLeadership[${i}] points at unknown person "${String(id)}"`);
      }
    });
  }

  if (!isObject(input.coverageAssignments)) fail("coverageAssignments is required");
  else {
    for (const cluster of COVERAGE_CLUSTER_IDS) {
      const assignment = input.coverageAssignments[cluster];
      if (!isObject(assignment)) {
        fail(`coverageAssignments[${cluster}] is required`);
        continue;
      }
      const id = assignment.procurementId;
      if (id !== null && !personIds.has(id as string)) {
        fail(`coverageAssignments[${cluster}] points at unknown person "${String(id)}"`);
      }
    }
  }

  if (!isObject(input.siteCoverageCluster)) fail("siteCoverageCluster is required");
  else {
    for (const [siteId, cluster] of Object.entries(input.siteCoverageCluster)) {
      if (!siteIds.has(siteId)) {
        fail(`siteCoverageCluster has an entry for unknown site "${siteId}"`);
      }
      if (!COVERAGE_CLUSTER_IDS.includes(cluster as number)) {
        fail(
          `siteCoverageCluster["${siteId}"] must be one of ${COVERAGE_CLUSTER_IDS.join(", ")}`,
        );
      }
    }
  }

  if (!isObject(input.siteGrantAnalyst)) fail("siteGrantAnalyst is required");
  else {
    for (const siteId of Object.keys(input.siteGrantAnalyst)) {
      if (!siteIds.has(siteId)) {
        fail(`siteGrantAnalyst has an entry for unknown site "${siteId}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
