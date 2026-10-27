import { MAIN_OFFICE, SITES } from "@/lib/sites";
import {
  PROCUREMENT_LEADERSHIP,
  PROCUREMENT_PEOPLE,
  SEED_ASSIGNMENTS,
  SITE_COVERAGE_CLUSTER,
  SITE_GRANT_ANALYST,
} from "@/lib/coverage";
import {
  CLUSTER_VPS,
  PROGRAM_LEADERSHIP,
  SHELTER_VPS,
  SITE_CONTRACT,
  SITE_TEAM,
  VPS,
} from "@/lib/oversight";
import type { ContentSnapshot } from "./types";

/**
 * The content as it stands in the source files, assembled into one snapshot.
 *
 * This is both the starting point for the store and the app's fallback: it is
 * compiled into the bundle, so the first paint needs no network and an offline
 * launch still has every site, roster and assignment. A fetched snapshot
 * replaces it only when one arrives and is newer.
 *
 * Keeping the `lib/*.ts` files as the seed also means the repo stays the record
 * of the org chart even once the content manager is editing a copy of it.
 * Version 0 is "whatever shipped with this build", which every saved snapshot
 * outranks.
 */
export const SEED_CONTENT: ContentSnapshot = {
  version: 0,
  updatedAt: "",

  sites: SITES,
  mainOffice: MAIN_OFFICE,

  vps: VPS,
  clusterVps: CLUSTER_VPS,
  shelterVps: SHELTER_VPS,
  siteTeams: SITE_TEAM,
  siteContracts: SITE_CONTRACT,
  programLeadership: PROGRAM_LEADERSHIP,

  procurementPeople: PROCUREMENT_PEOPLE,
  procurementLeadership: PROCUREMENT_LEADERSHIP,
  coverageAssignments: SEED_ASSIGNMENTS,
  siteCoverageCluster: SITE_COVERAGE_CLUSTER,
  siteGrantAnalyst: SITE_GRANT_ANALYST,
};
