#!/bin/bash
set -e

PROJECT_DIR="/media/theone/HDD/docker-files/github_projects/backstage-pilot"
CLUSTER_NODE="k3d-my-rootless-cluster-server-0"
NAMESPACE="default"
DEPLOYMENT="backstage-pilot"

function print_usage() {
    echo "Usage: bash $0 [build | load-only | restart]"
    echo "--------------------------------------------------------"
    echo "  build     : Runs required host steps, builds official Docker image, loads to cluster, and restarts pods."
    echo "  load-only : Takes existing local Docker image, loads it to cluster, and restarts pods (no build)."
    echo "  restart   : Just kills and restarts the pods quickly via kubectl (no build, no image loading)."
    echo "--------------------------------------------------------"
}

function run_official_host_and_docker_build() {
    echo "=== 1. Executing Official Host Steps ==="
    cd "$PROJECT_DIR"
    
    echo "-> Running yarn install..."
    yarn install
    
    echo "-> Generating Type Definitions (yarn tsc)..."
    yarn tsc
    
    echo "-> Building Backend Production Packages (yarn build:backend)..."
    yarn build:backend

    echo "=== 2. Building official Docker image ==="
    docker build -t backstage-pilot:latest "$PROJECT_DIR"
}

function load_into_cluster() {
    echo "=== 3. Streaming image tar archive directly into k3d container cache ==="
    docker save backstage-pilot:latest | docker exec -i "$CLUSTER_NODE" ctr -n k8s.io images import -
}

function restart_pods() {
    echo "=== 4. Re-triggering pod rollout lifecycle via kubectl ==="
    kubectl rollout restart deployment/"$DEPLOYMENT" -n "$NAMESPACE"
    kubectl delete pods -n "$NAMESPACE" -l app="$DEPLOYMENT"
    echo "=== Waiting for pod status... ==="
    sleep 3
    kubectl get pods -n "$NAMESPACE"
}

# --- Action Router ---
case "$1" in
    build)
        run_official_host_and_docker_build
        load_into_cluster
        restart_pods
        ;;
    load-only)
        load_into_cluster
        restart_pods
        ;;
    restart)
        restart_pods
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
