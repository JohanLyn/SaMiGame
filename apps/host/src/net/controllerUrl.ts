const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Adressen telefonerne skal åbne. Åbnes TV'et på "localhost", kan telefonerne ikke bruge den,
 * så vi bruger computerens LAN-adresse fra serveren i stedet.
 *
 * - Udvikling (Vite): telefon-appen kører på sin egen port (5174).
 * - Produktion (byggede filer serveret af spilserveren): telefon-appen ligger på samme adresse under '/play/'.
 */
export function controllerUrl(code: string, lanAddresses: string[], loc: Location = location): string {
  const configured = import.meta.env.VITE_CONTROLLER_URL as string | undefined;
  const port = (import.meta.env.VITE_CONTROLLER_PORT as string | undefined) ?? '5174';
  let base: string;
  if (configured) {
    base = configured.replace(/\/$/, '');
  } else {
    const host = LOCAL_HOSTS.has(loc.hostname) && lanAddresses.length > 0 ? lanAddresses[0] : loc.hostname;
    if (import.meta.env.PROD) {
      base = `${loc.protocol}//${host}${loc.port ? `:${loc.port}` : ''}/play`;
    } else {
      base = `${loc.protocol}//${host}:${port}`;
    }
  }
  return `${base}/?room=${code}`;
}
