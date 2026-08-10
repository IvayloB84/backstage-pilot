import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
import { navModule } from './modules/nav';

import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage, Button } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint, EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { EntityKubernetesContent } from '@backstage/plugin-kubernetes';
import { useEntity } from '@backstage/plugin-catalog-react';

// THE ROADIE NEW FRONTEND SYSTEM IMPORT
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

// Custom Kubernetes Layout Module (10000ms custom poll speed configuration)
const kubernetesExtension = EntityContentBlueprint.make({
  name: 'kubernetes',
  params: {
    title: 'Kubernetes',                            
    path: '/kubernetes',                            
    filter: 'kind:component',
    loader: async () => <EntityKubernetesContent refreshIntervalMs={10000} />,
  },
});

// Platform Infrastructure Deactivation Shortcut Card Extension Fix
const dangerZoneCardExtension = EntityCardBlueprint.make({
  name: 'danger-zone-sidebar-card',
  params: {
    // FIX: Using a predicate function instead of a string to satisfy New Frontend System requirements
    filter: entity => entity.kind.toLowerCase() === 'component',
    loader: async () => {
      const DangerZoneButton = () => {
        const { entity } = useEntity();
        
        const handleRedirect = (e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          
          if (!entity?.metadata?.name) {
            console.error('Backstage Context Error: Entity metadata name is missing.');
            return;
          }

          const queryParams = new URLSearchParams({
            formData: JSON.stringify({
              repoName: entity.metadata.name,
              repoOwner: 'IvayloB84',
            })
          }).toString();

          // Native execution completely forces parameters past the layout cache limits
          window.location.href = `/create/templates/default/deactivate-component-template?${queryParams}`;
        };

        return (
          <button
            type="button"
            onClick={handleRedirect}
            style={{
              backgroundColor: '#d32f2f',
              color: '#fff',
              marginTop: '16px',
              width: '100%',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)'
            }}
          >
            Request Deactivate Component
          </button>
        );
      };
      return <DangerZoneButton />;
    },
  },
});


const kubernetesCatalogTabModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [
    kubernetesExtension,
    dangerZoneCardExtension, 
  ],
});

export default createApp({
  features: [
    catalogPlugin,
    scaffolderPlugin,
    userSettingsPlugin,
    navModule,
    
    // Registers custom catalog view components via a single NFS module
    kubernetesCatalogTabModule, 
    
    // Loads the native Roadie ArgoCD Plugin Extension
    argoCdPlugin,

    createFrontendModule({
      pluginId: 'app',
      extensions: [signInPageModule],
    }),
  ],
});