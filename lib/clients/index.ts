// ============================================
// CLIENT REGISTRY
// ============================================

import type { ClientConfig, ClientSchema, ClientModule } from "./types";

// Re-export types for convenience
export * from "./types";

// Import all client modules
import * as arla from "./arla";
import * as kering from "./kering";
import * as carlsberg from "./carlsberg";

/**
 * Client registry - maps client slug to module
 * Add new clients here
 */
const clientRegistry: Record<string, ClientModule> = {
  arla,
  kering,
  carlsberg,
  // Add new clients here:
  // newclient: newclientModule,
};

/**
 * Get a client module by slug
 */
export function getClient(slug: string): ClientModule | null {
  return clientRegistry[slug.toLowerCase()] || null;
}

/**
 * Get list of all client slugs
 */
export function getClientSlugs(): string[] {
  return Object.keys(clientRegistry);
}

/**
 * Get list of all client names (display names)
 */
export function getClientNames(): string[] {
  return Object.values(clientRegistry).map((client) => client.config.name);
}

/**
 * Get all client configs
 */
export function getAllClientConfigs(): ClientConfig[] {
  return Object.values(clientRegistry).map((client) => client.config);
}

/**
 * Get client schema by slug
 */
export function getClientSchema(slug: string): ClientSchema | null {
  const client = getClient(slug);
  return client?.schema || null;
}

/**
 * Get client config by slug
 */
export function getClientConfig(slug: string): ClientConfig | null {
  const client = getClient(slug);
  return client?.config || null;
}

/**
 * Get client ID by name (for backwards compatibility)
 */
export function getClientIdByName(name: string): number | null {
  const client = getClient(name.toLowerCase());
  return client?.config.id || null;
}

/**
 * Build client data schemas map (for backwards compatibility with QueryBuilderPanel)
 */
export function getClientDataSchemas(): Record<
  string,
  { summary: ClientSchema["summary"]; trackers: ClientSchema["trackers"] }
> {
  const schemas: Record<
    string,
    { summary: ClientSchema["summary"]; trackers: ClientSchema["trackers"] }
  > = {};

  for (const client of Object.values(clientRegistry)) {
    // Use display name as key for backwards compatibility
    schemas[client.config.name] = {
      summary: client.schema.summary,
      trackers: client.schema.trackers,
    };
  }

  return schemas;
}
