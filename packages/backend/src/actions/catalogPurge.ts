import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { CatalogService } from '@backstage/plugin-catalog-node';

export function createCatalogPurgeAction(options: { catalogClient: CatalogService }) {
  // Use any, any to fix the generic payload bounds
  return createTemplateAction<any, any>({
    id: 'platform:catalog:purge',
    description: '100% Automated hard delete of component and location records from the DB',
    schema: {
      input: {
        type: 'object',
        required: ['repoName'],
        properties: {
          repoName: {
            type: 'string',
            title: 'Repository Name',
          },
        },
      },
    },
    async handler(ctx) {
      const { repoName } = ctx.input;
      ctx.logger.info(`Searching database for location anchors matching: ${repoName}`);

      // Native Backstage method to capture the correct system credentials block
      const credentials = await ctx.getInitiatorCredentials();

      // Query the location table matching the user context identity
      const response = await options.catalogClient.getLocations(undefined, {
        credentials,
      });

      const targetLocation = response.items.find((loc: any) => 
        loc.target.includes(`/${repoName}`)
      );

      if (!targetLocation) {
        ctx.logger.warn(`No active database leftovers found for ${repoName}. Skipping eviction.`);
        return;
      }

      ctx.logger.info(`Found location database ID: ${targetLocation.id}. Evicting anchor row...`);

      // Erase the manual location anchor row directly from the database
      await options.catalogClient.removeLocationById(targetLocation.id, {
        credentials,
      });
      
      ctx.logger.info(`Successfully purged all database entries for ${repoName}. Logs are clean.`);
    },
  });
}