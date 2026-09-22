import * as dotenv from 'dotenv';
import path from 'path';
import { createBackend } from '@backstage/backend-defaults';
import { resolvePackagePath } from '@backstage/backend-plugin-api';

// Find the path safely using Backstage's API instead of __dirname
const packagePath = resolvePackagePath('backend', 'package.json');
const backendDir = path.dirname(packagePath);

dotenv.config({ path: path.resolve(backendDir, '../../../.env') });

const backend = createBackend();

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
backend.add(import('@backstage/plugin-auth-backend-module-oidc-provider'));
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