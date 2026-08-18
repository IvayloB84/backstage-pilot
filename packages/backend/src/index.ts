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

const customOidcAuthModule = createBackendModule({
  pluginId: 'auth',
  moduleId: 'custom-oidc-provider',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'oidc',
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
            async signInResolver(info, ctx) { 
              const userinfo = info.result.fullProfile.userinfo;
              const username = userinfo.preferred_username || userinfo.sub || '';

              if (!username) {
                throw new Error('User identity could not be parsed from OIDC token payload');
              }

              return ctx.signInWithCatalogUser({
                entityRef: {
                  kind: 'User',
                  name: username,
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

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// Scaffolder plugin
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-notifications'));

// Techdocs plugin
backend.add(import('@backstage/plugin-techdocs-backend'));

// Auth plugin & Core GitHub Module configuration
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

// Duplicate default oidc-provider import REMOVED to avoid extension conflicts

backend.add(import('@backstage-community/plugin-catalog-backend-module-keycloak'));

// Catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// Permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));

// Search plugin
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// Kubernetes plugin
backend.add(import('@backstage/plugin-kubernetes-backend'));

// User settings plugin
backend.add(import('@backstage/plugin-user-settings-backend'));

// Notifications and signals plugins
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

// MCP actions plugin
backend.add(import('@backstage/plugin-mcp-actions-backend'));

// RESTORES BACKEND ROUTING FOR ARGOCD CLIENT COMMUNICATORS
backend.add(import('@roadiehq/backstage-plugin-argo-cd-backend'));

// Unlocks advanced template utilities natively inside your custom container
backend.add(import('@roadiehq/scaffolder-backend-module-utils'));

backend.start();