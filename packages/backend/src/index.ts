import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createBackend } from '@backstage/backend-defaults';
import { createBackendModule } from '@backstage/backend-plugin-api';
import { 
  authProvidersExtensionPoint, 
  createOAuthProviderFactory 
} from '@backstage/plugin-auth-node';
import { oidcAuthenticator } from '@backstage/plugin-auth-backend-module-oidc-provider';

const backend = createBackend();

// --- CUSTOM TYPE-SAFE KEYCLOAK OIDC SERVICE MODULE ---
const customOidcAuthModule = createBackendModule({
  pluginId: 'auth',
  moduleId: 'custom-oidc-provider',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'oidc', // Matches the 'oidc' configuration provider layout in App.tsx
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
            signInResolver: async (info, ctx) => { 
              const fullProfile = info.result.fullProfile;
              const userinfo = (fullProfile as any).userinfo || {};
              
              // 1. Safe extraction with strict type routing fallbacks
              const parsedUsername = 
                userinfo.preferred_username || 
                userinfo.sub || 
                (fullProfile as any).username;

              // 2. Validate that the value exists and is an explicit string primitive
              if (!parsedUsername || typeof parsedUsername !== 'string') {
                throw new Error('User identity could not be parsed from Keycloak OIDC token payload');
              }

              // 3. Clean string white-spaces to secure downstream DB queries
              const normalizedUsername = parsedUsername.trim().toLowerCase();

              if (!normalizedUsername) {
                throw new Error('Parsed Keycloak username metadata is blank');
              }

              // 4. Safely enroll the user entity mapping into the platform catalog
              return ctx.signInWithCatalogUser({
                entityRef: {
                  kind: 'User',
                  name: normalizedUsername, 
                },
              });
            },
          }),
        });
      },
    });
  },
});

// Register the custom OIDC module
backend.add(customOidcAuthModule);

// --- PLATFORM CORE INFRASTRUCTURE SERVICES ---
backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// --- SCAFFOLDER CORE & EXTENSION PIPELINES ---
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-notifications'));
backend.add(import('@roadiehq/scaffolder-backend-module-utils'));

// --- PLATFORM TECHNICAL DOCUMENTATION ENGINE ---
backend.add(import('@backstage/plugin-techdocs-backend'));

// --- CORE SECURITY IDENTITY PROVIDERS ---
backend.add(import('@backstage/plugin-auth-backend'));
// REMOVED DUPLICATE: @backstage-community/plugin-auth-backend-module-keycloak-provider (avoids handler collision with our custom OIDC)
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

// --- Enrolls the HTTP Request action template runner capacity ---
backend.add(import('@roadiehq/scaffolder-backend-module-http-request'));

// --- CATALOG MECHANICS & ADVANCED SCHEMAS ---
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));
backend.add(import('@backstage-community/plugin-catalog-backend-module-keycloak'));

// --- SECURITY RBAC & ACCESS POLICIES ---
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));

// --- MULTI-INDEX CORE SEARCH MODULES ---
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// --- EXTERNAL CLUSTER CLOUD MONITORING PLUGINS ---
backend.add(import('@backstage/plugin-kubernetes-backend'));
backend.add(import('@roadiehq/backstage-plugin-argo-cd-backend'));

// --- REPLICATED SIGNALING & NOTIFICATION FRAMEWORKS ---
backend.add(import('@backstage/plugin-user-settings-backend'));
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

// --- AI CORE ASSISTANT CONNECTOR ENGINE ---
backend.add(import('@backstage/plugin-mcp-actions-backend'));

backend.start();