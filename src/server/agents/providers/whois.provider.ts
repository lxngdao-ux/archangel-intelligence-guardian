/**
 * Seam for domain registration intelligence. v0.1 ships a deterministic
 * mock so Company Intelligence and the Risk Engine have something real to
 * score against in dev/demo; swap for WhoisXML/RDAP/OpenCorporates in
 * Phase 1 (docs/ROADMAP.md) without touching the agent that calls this.
 */
export interface WhoisRecord {
  domain: string;
  registeredAt: string | null;
  registrar: string | null;
  registrantPrivacyEnabled: boolean;
  ageInDays: number | null;
}

export interface WhoisProvider {
  lookup(domain: string): Promise<WhoisRecord>;
}

export class MockWhoisProvider implements WhoisProvider {
  async lookup(domain: string): Promise<WhoisRecord> {
    // Deterministic pseudo-data derived from the domain string so repeated
    // lookups of the same domain are stable across runs in dev/demo, without
    // ever claiming a false certainty — this is clearly a mock, not a guess
    // dressed up as data (see `registrantPrivacyEnabled` reasoning below).
    const hash = [...domain].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const ageInDays = (hash % 3000) + 1;
    const registeredAt = new Date(Date.now() - ageInDays * 24 * 60 * 60 * 1000).toISOString();

    return {
      domain,
      registeredAt,
      registrar: null, // real registrar lookup requires a live WHOIS/RDAP provider
      registrantPrivacyEnabled: hash % 2 === 0,
      ageInDays,
    };
  }
}

export const whoisProvider: WhoisProvider = new MockWhoisProvider();
