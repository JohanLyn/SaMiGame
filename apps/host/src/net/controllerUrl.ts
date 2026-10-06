const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Adressen telefonerne skal åbne. Åbnes TV'et på "localhost", kan telefonerne ikke bruge den,
 * så vi bruger computerens LAN-adresse fra serveren i stedet.
 */
export function controllerUrl(code: string, lanAddresses: string[], loc: Location = location): string {
  const configured = import.meta.env.VITE_CONTROLLER_URL as string | undefined;
  const port = (import.meta.env.VITE_CONTROLLER_PORT as string | undefined) ?? '5174';
  let base: string;
  if (configured) {
    base = configured.replace(/\/$/, '');
  } else {
    const host = LOCAL_HOSTS.has(loc.hostname) && lanAddresses.length > 0 ? lanAddresses[0] : loc.hostname;
    base = `${loc.protocol}//${host}:${port}`;
  }
  return `${base}/?room=${code}`;
}
