import { describe, it, expect } from 'vitest';
import { parseNlbPortList, serializeNlbPortList, type NlbPortEntry } from './nlb-port-list';

describe('parseNlbPortList', () => {
  it('returns [] for empty input', () => {
    expect(parseNlbPortList('')).toEqual([]);
  });

  it('parses 4-token entry with ppv2=false', () => {
    expect(parseNlbPortList('http:TCP:80:80')).toEqual([
      { name: 'http', protocol: 'TCP', port: 80, healthCheckPort: 80, ppv2: false },
    ]);
  });

  it('parses 5-token entry with ppv2=true', () => {
    expect(parseNlbPortList('https:TCP:443:443:ppv2')).toEqual([
      { name: 'https', protocol: 'TCP', port: 443, healthCheckPort: 443, ppv2: true },
    ]);
  });

  it('parses the d7a8e83 default (mixed 4 + 5 token)', () => {
    expect(parseNlbPortList('http:TCP:80:80;https:TCP:443:443:ppv2')).toEqual([
      { name: 'http', protocol: 'TCP', port: 80, healthCheckPort: 80, ppv2: false },
      { name: 'https', protocol: 'TCP', port: 443, healthCheckPort: 443, ppv2: true },
    ]);
  });

  it('defaults health-check to port when missing', () => {
    expect(parseNlbPortList('foo:TCP:8080:')).toEqual([
      { name: 'foo', protocol: 'TCP', port: 8080, healthCheckPort: 8080, ppv2: false },
    ]);
  });

  it('falls back to TCP for unknown protocol', () => {
    expect(parseNlbPortList('foo:SCTP:1:1')).toEqual([
      { name: 'foo', protocol: 'TCP', port: 1, healthCheckPort: 1, ppv2: false },
    ]);
  });

  it('ignores unknown 5th-token values (only "ppv2" enables)', () => {
    expect(parseNlbPortList('foo:TCP:1:1:bogus')).toEqual([
      { name: 'foo', protocol: 'TCP', port: 1, healthCheckPort: 1, ppv2: false },
    ]);
  });
});

describe('serializeNlbPortList', () => {
  it('emits 4 tokens when ppv2=false (back-compat with pre-d7a8e83)', () => {
    const entries: NlbPortEntry[] = [
      { name: 'http', protocol: 'TCP', port: 80, healthCheckPort: 80, ppv2: false },
    ];
    expect(serializeNlbPortList(entries)).toBe('http:TCP:80:80');
  });

  it('emits 5 tokens when ppv2=true', () => {
    const entries: NlbPortEntry[] = [
      { name: 'https', protocol: 'TCP', port: 443, healthCheckPort: 443, ppv2: true },
    ];
    expect(serializeNlbPortList(entries)).toBe('https:TCP:443:443:ppv2');
  });

  it('strips ppv2 token when protocol is not TCP (PPv2 is TCP-only)', () => {
    const entries: NlbPortEntry[] = [
      { name: 'dns', protocol: 'UDP', port: 53, healthCheckPort: 53, ppv2: true },
    ];
    expect(serializeNlbPortList(entries)).toBe('dns:UDP:53:53');
  });

  it('skips entries with no name or no port', () => {
    const entries: NlbPortEntry[] = [
      { name: '', protocol: 'TCP', port: 80, healthCheckPort: 80, ppv2: false },
      { name: 'foo', protocol: 'TCP', port: 0, healthCheckPort: 0, ppv2: false },
      { name: 'bar', protocol: 'TCP', port: 22, healthCheckPort: 22, ppv2: false },
    ];
    expect(serializeNlbPortList(entries)).toBe('bar:TCP:22:22');
  });

  it('defaults healthCheckPort to port when zero/empty', () => {
    const entries: NlbPortEntry[] = [
      { name: 'foo', protocol: 'TCP', port: 8080, healthCheckPort: 0, ppv2: false },
    ];
    expect(serializeNlbPortList(entries)).toBe('foo:TCP:8080:8080');
  });
});

describe('round-trip', () => {
  it('preserves the d7a8e83 default verbatim', () => {
    const raw = 'http:TCP:80:80;https:TCP:443:443:ppv2';
    expect(serializeNlbPortList(parseNlbPortList(raw))).toBe(raw);
  });

  it('preserves a pre-d7a8e83 4-token list verbatim (no spurious ppv2)', () => {
    const raw = 'http:TCP:80:80;https:TCP:443:443';
    expect(serializeNlbPortList(parseNlbPortList(raw))).toBe(raw);
  });
});
