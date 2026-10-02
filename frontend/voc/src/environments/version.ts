import packageJson from '../../../package.json';

/**
 * Versión del Frontend obtenida directamente desde package.json (sin fallbacks ni duplicación en código)
 */
export const APP_FRONTEND_VERSION: string | undefined = packageJson.version;
export const APP_FRONTEND_VERSION_DATE: string | undefined = (packageJson as Record<string, any>)['versionDate'];

