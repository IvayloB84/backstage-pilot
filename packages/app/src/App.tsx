import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
import { navModule } from './modules/nav';

import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { EntityKubernetesContent } from '@backstage/plugin-kubernetes';

// 🚀 THE ROADIE NEW FRONTEND SYSTEM IMPORT
import argoCdPlugin from '@roadiehq/backstage-plugin-argo-cd/alpha';

const signInPageModule = SignInPageBlueprint.make({
  params: {
    loader: async () => props => (
      <SignInPage
        {...props}
        title="Backstage Pilot Login"
        providers={[
          {
            id: 'github-auth-provider',
            title: 'GitHub',
            message: 'Sign in using your GitHub Account',
            apiRef: githubAuthApiRef,
          },
        ]}
      />
    ),
  },
});

// 🛠️ Custom Kubernetes Layout Module (10000ms custom poll speed configuration)
const kubernetesExtension = EntityContentBlueprint.make({
  name: 'kubernetes',
  params: {
    title: 'Kubernetes',                            // ✨ Aligned Key
    path: '/kubernetes',                            // ✨ Aligned Key
    filter: 'kind:component',
    loader: async () => <EntityKubernetesContent refreshIntervalMs={10000} />,
  },
});

const kubernetesCatalogTabModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [kubernetesExtension],
});

export default createApp({
  features: [
    catalogPlugin,
    scaffolderPlugin,
    userSettingsPlugin,
    navModule,
    
    // 🎯 Registers exactly ONE custom fast-refresh Kubernetes tab
    kubernetesCatalogTabModule, 
    
    // 🤖 Loads the native Roadie ArgoCD Plugin Extension
    argoCdPlugin,

    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPageModule],
    }),
  ],
});