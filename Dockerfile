FROM node:24-trixie-slim

# Set Python interpreter for `node-gyp` to use
ENV PYTHON=/usr/bin/python3

# OPTIMIZED: Combined dependency setups into a single layer and removed heavy g++ compiler tools
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

# System Configuration Phase: Run corepack while still root to generate system mappings
RUN corepack enable

# From here on we use the least-privileged `node` user to run the backend.
USER node
WORKDIR /app

# Point Corepack home explicitly to an unprivileged directory to prevent EACCES errors
ENV COREPACK_HOME=/tmp/corepack

# Copy files needed by Yarn
COPY --chown=node:node .yarn ./.yarn
COPY --chown=node:node .yarnrc.yml ./
COPY --chown=node:node backstage.json ./
# FIXED: Copies critical Yarn 4 Plug'n'Play files (.pnp.cjs, .pnp.loader.mjs) for runtime module resolution
COPY --chown=node:node .pnp.* ./

# This switches many Node.js dependencies to production mode.
ENV NODE_ENV=production

# This disables node snapshot for Node 20 to work with the Scaffolder
ENV NODE_OPTIONS="--no-node-snapshot"

# Copy repo skeleton first, to avoid unnecessary docker cache invalidation.
COPY --chown=node:node yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# Yarn 4 Modern Production Command Chain: Run standard install to sync dependencies smoothly
RUN --mount=type=cache,target=/home/node/.cache/yarn,sharing=locked,uid=1000,gid=1000 \
    yarn install

# This will include the examples, if you don't need these simply remove this line
COPY --chown=node:node examples ./examples

# Then copy the rest of the backend bundle, along with any other files we might want.
COPY --chown=node:node packages/backend/dist/bundle.tar.gz ./
# FIXED: Forces the tar extractor to unpack relative to the working root directory to align code-split chunks natively!
RUN tar xzf bundle.tar.gz -C ./ && rm bundle.tar.gz

# FIXED: Targets the definitively verified production script name output by your compiler tools
CMD ["node", "packages/backend/dist/index.cjs.js", "--config", "app-config.yaml"]
