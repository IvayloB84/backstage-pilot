import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
// FIXED: Import the standard new architecture alpha plugin natively
import kubernetesPlugin from '@backstage/plugin-kubernetes/alpha';
import { navModule } from './modules/nav';

import React from 'react';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { EntityKubernetesContent } from '@backstage/plugin-kubernetes';

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

// Modern UI Blueprint Extension using the corrected capitalized export signature class name
const kubernetesCatalogTabModule = createFrontendModule({
  pluginId: 'catalog',
  moduleId: 'kubernetes-entity-content',
  register(reg) {
    reg.registerExtension(
      EntityContentBlueprint.make({
        name: 'kubernetes',
        params: {
          title: 'Kubernetes',
          path: '/kubernetes',
          filter: 'kind:component',
          // FIXED: Uses the explicit components wrapper renderer to trigger /resources/ API calls instead of /services/
          loader: async () => <EntityKubernetesContent refreshInterval={10000} />,
        },
      }),
    );
  },
});

export default createApp({
  features: [
    catalogPlugin,
    scaffolderPlugin,
    userSettingsPlugin,
    kubernetesPlugin, 
    navModule,
    kubernetesCatalogTabModule,
    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPageModule],
    }),
  ],
});
