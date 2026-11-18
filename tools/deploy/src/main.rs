use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};
use std::thread::sleep;
use std::time::Duration;

#[derive(Parser)]
#[command(about = "K3s build, image import, and deployment rollout CLI")]
struct Cli {
    /// Path to the project directory (defaults to current folder)
    #[arg(short, long, global = true, default_value = ".")]
    project_dir: PathBuf,

    /// Target Kubernetes namespace
    #[arg(short, long, global = true, default_value = "default")]
    namespace: String,

    /// Target Kubernetes deployment and app label name
    #[arg(short, long, global = true, default_value = "backstage-pilot")]
    deployment: String,

    /// Docker image name and tag
    #[arg(short, long, global = true, default_value = "backstage-pilot:latest")]
    image: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Executes host build steps, builds Docker image, imports to k3s, restarts pods, and cleans cache
    Build,
    /// Runs host verification and builds the Docker image locally without touching k3s
    BuildOnly,
    /// Imports existing local Docker image into k3s containerd store and triggers pod rollout
    LoadOnly,
    /// Triggers a fresh deployment rollout lifecycle and deletes active pods via kubectl
    Restart,
    /// Purges temporary Docker buildx caches and dangling image layers
    Clean,
}

/// Runs a command in the specified directory and returns true on exit code 0
fn run_step(dir: &Path, program: &str, args: &[&str]) -> bool {
    Command::new(program)
        .current_dir(dir)
        .args(args)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn run_host_and_docker_build(project_dir: &Path, image: &str) -> Result<(), &'static str> {
    println!("=== 1. Executing Official Host Steps in '{}' ===", project_dir.display());

    println!("-> Running yarn install...");
    if !run_step(project_dir, "yarn", &["install", "--immutable"]) {
        return Err("yarn install failed");
    }

    println!("-> Generating Type Definitions (yarn tsc)...");
    if !run_step(project_dir, "yarn", &["tsc"]) {
        return Err("yarn tsc failed");
    }

    println!("-> Building Backend Production Packages (yarn --cwd packages/backend build)...");
    if !run_step(project_dir, "yarn", &["--cwd", "packages/backend", "build"]) {
        return Err("yarn backend build failed");
    }

    println!("=== 2. Building official Docker image '{}' ===", image);
    if !run_step(project_dir, "docker", &["build", "--no-cache", "-t", image, "."]) {
        return Err("docker build failed");
    }

    Ok(())
}

/// Streams `docker save <image>` directly into `k3s ctr -n k8s.io images import -`
fn load_into_k3s(image: &str) -> Result<(), &'static str> {
    println!("=== 3. Importing image '{}' into k3s containerd content store ===", image);

    let mut save = Command::new("docker")
        .args(["save", image])
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|_| "failed to start docker save")?;

    let save_stdout = save.stdout.take().ok_or("failed to capture docker save stdout")?;

    let import_status = Command::new("k3s")
        .args(["ctr", "-n", "k8s.io", "images", "import", "-"])
        .stdin(save_stdout)
        .status()
        .map_err(|_| "failed to execute k3s ctr import (check permissions/sudo)")?;

    let save_status = save.wait().map_err(|_| "docker save process failed")?;

    if !save_status.success() || !import_status.success() {
        return Err("image import into k3s failed");
    }

    Ok(())
}

fn restart_pods(deployment: &str, namespace: &str) -> Result<(), &'static str> {
    println!("=== 4. Re-triggering pod rollout lifecycle via kubectl ===");
    let deploy_target = format!("deployment/{}", deployment);
    let app_label = format!("app={}", deployment);

    if !run_step(Path::new("."), "kubectl", &["rollout", "restart", &deploy_target, "-n", namespace]) {
        return Err("kubectl rollout restart failed");
    }

    if !run_step(Path::new("."), "kubectl", &["delete", "pods", "-n", namespace, "-l", &app_label]) {
        return Err("kubectl delete pods failed");
    }

    println!("=== Waiting for pod status... ===");
    sleep(Duration::from_secs(3));
    run_step(Path::new("."), "kubectl", &["get", "pods", "-n", namespace]);

    Ok(())
}

fn clean_build_cache() {
    println!("=== 5. Purging temporary Docker buildx build cache and dangling layers ===");
    run_step(Path::new("."), "docker", &["builder", "prune", "-f"]);
    run_step(Path::new("."), "docker", &["image", "prune", "-f"]);
    println!("=== System space reclamation complete ===");
}

fn execute(cli: Cli) -> Result<(), &'static str> {
    match cli.command {
        Commands::BuildOnly => 
            run_host_and_docker_build(&cli.project_dir, &cli.image),
        Commands::Build => {
            run_host_and_docker_build(&cli.project_dir, &cli.image)?;
            load_into_k3s(&cli.image)?;
            restart_pods(&cli.deployment, &cli.namespace)?;
            clean_build_cache();
            Ok(())
        }
        Commands::LoadOnly => {
            load_into_k3s(&cli.image)?;
            restart_pods(&cli.deployment, &cli.namespace)?;
            Ok(())
        }
        Commands::Restart => restart_pods(&cli.deployment, &cli.namespace),
        Commands::Clean => {
            clean_build_cache();
            Ok(())
        }
    }
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    match execute(cli) {
        Ok(()) => ExitCode::SUCCESS,
        Err(msg) => {
            eprintln!("ERROR: {}", msg);
            ExitCode::FAILURE
        }
    }
}

