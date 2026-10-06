import { networkInterfaces } from 'node:os';

/** IPv4-adresser på lokalnetværket, så TV'et kan lave en QR-kode som telefonerne kan nå. */
export function lanAddresses(): string[] {
  const addresses: string[] = [];
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) addresses.push(info.address);
    }
  }
  return addresses;
}
