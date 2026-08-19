import { haversine } from '@/lib/geo';
import { jaroWinkler, normalizeName, parseAddress } from '@/lib/text';
import type { LicenceRecord } from '@/etl/adapters/types';
import type { OsmRecord } from '@/etl/sources/overpass';

export type MatchRule = 'proximity-name' | 'address' | 'strong-name';

export interface Match {
  licence: LicenceRecord;
  osm: OsmRecord;
  rule: MatchRule;
  distance: number;
  similarity: number;
}

export interface MatchResult {
  matches: Match[];
  /** OSM records no licence backs — queued for review, never auto-published (§5.6). */
  unmatchedOsm: OsmRecord[];
}

/**
 * The three rules of §5.6, applied in order. Each OSM record is consumed by at
 * most one licence, and each licence takes at most one OSM record, so a cluster
 * of neighbouring shops cannot collapse onto a single row.
 */
export function matchSources(licences: LicenceRecord[], osmRecords: OsmRecord[]): MatchResult {
  const matches: Match[] = [];
  const claimedOsm = new Set<string>();
  const claimedLicence = new Set<string>();

  const rules: { rule: MatchRule; accepts: (candidate: Candidate) => boolean }[] = [
    { rule: 'proximity-name', accepts: (c) => c.distance <= 40 && c.similarity >= 0.6 },
    { rule: 'address', accepts: (c) => c.sameAddress },
    { rule: 'strong-name', accepts: (c) => c.distance <= 150 && c.similarity >= 0.9 },
  ];

  for (const { rule, accepts } of rules) {
    const candidates: Candidate[] = [];
    for (const licence of licences) {
      if (claimedLicence.has(licence.sourceId)) continue;
      for (const osm of osmRecords) {
        if (claimedOsm.has(osm.osmId)) continue;
        const candidate = describe(licence, osm);
        if (accepts(candidate)) candidates.push(candidate);
      }
    }
    // Best first, so the closest/most similar pair wins a contested record.
    candidates.sort((a, b) => b.similarity - a.similarity || a.distance - b.distance);
    for (const candidate of candidates) {
      if (claimedLicence.has(candidate.licence.sourceId) || claimedOsm.has(candidate.osm.osmId)) continue;
      claimedLicence.add(candidate.licence.sourceId);
      claimedOsm.add(candidate.osm.osmId);
      matches.push({
        licence: candidate.licence,
        osm: candidate.osm,
        rule,
        distance: candidate.distance,
        similarity: candidate.similarity,
      });
    }
  }

  return {
    matches,
    unmatchedOsm: osmRecords.filter((osm) => !claimedOsm.has(osm.osmId)),
  };
}

interface Candidate {
  licence: LicenceRecord;
  osm: OsmRecord;
  distance: number;
  similarity: number;
  sameAddress: boolean;
}

function describe(licence: LicenceRecord, osm: OsmRecord): Candidate {
  const licenceAddress = parseAddress(licence.address);
  const osmAddress = osm.address ? parseAddress(osm.address) : null;
  return {
    licence,
    osm,
    distance: haversine(licence, osm),
    similarity: jaroWinkler(normalizeName(licence.name), normalizeName(osm.name)),
    sameAddress:
      osmAddress != null &&
      osmAddress.base != null &&
      licenceAddress.base != null &&
      osmAddress.street === licenceAddress.street &&
      osmAddress.base === licenceAddress.base,
  };
}
