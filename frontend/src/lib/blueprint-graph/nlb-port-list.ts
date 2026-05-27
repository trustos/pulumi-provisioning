export type NlbProtocol = 'TCP' | 'UDP' | 'TCP_AND_UDP';

export interface NlbPortEntry {
  name: string;
  protocol: NlbProtocol;
  port: number;
  healthCheckPort: number;
  ppv2: boolean;
}

const PROTOCOLS: readonly NlbProtocol[] = ['TCP', 'UDP', 'TCP_AND_UDP'];

export function parseNlbPortList(raw: string): NlbPortEntry[] {
  if (!raw) return [];
  return raw
    .split(';')
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(':');
      const [name, protocol, port, healthCheckPort, ppv2Flag] = parts;
      const portNum = parseInt(port ?? '', 10) || 0;
      const hcPortNum = parseInt(healthCheckPort ?? '', 10) || portNum;
      return {
        name: name ?? '',
        protocol: (PROTOCOLS as readonly string[]).includes(protocol ?? '')
          ? (protocol as NlbProtocol)
          : ('TCP' as NlbProtocol),
        port: portNum,
        healthCheckPort: hcPortNum,
        ppv2: ppv2Flag === 'ppv2',
      };
    });
}

export function serializeNlbPortList(entries: NlbPortEntry[]): string {
  return entries
    .filter((e) => e.name && e.port > 0)
    .map((e) => {
      const hc = e.healthCheckPort > 0 ? e.healthCheckPort : e.port;
      const base = `${e.name}:${e.protocol}:${e.port}:${hc}`;
      return e.ppv2 && e.protocol === 'TCP' ? `${base}:ppv2` : base;
    })
    .join(';');
}
