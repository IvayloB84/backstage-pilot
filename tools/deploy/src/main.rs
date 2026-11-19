use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

#[derive(Parser)]
#[command(about = "Backstage application TypeScript and Docker image builder")]
struct Cli {
    /// Path to the project directory (defaults to current folder)
    #[arg(short, long, global = true, default_value = ".")]
    project_dir: PathBuf,

    /// Docker image name and tag
    #[arg(short, long, global = true, default_value = "backstage-pilot:latest")]
    image: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Runs yarn install, tsc, backend build, and builds the Docker image without cache
    Build,
    /// Runs only host TypeScript verification and backend bundle build (skips Docker)
    Verify,
}

fn run_step(dir: &Path, program: &str, args: &[&str]) -> Result<(), String> {
    let status = Command::new(program)
        .current_dir(dir)
        .args(args)
        .status()
        .map_err(|e| format!("failed to execute '{}': {}", program, e))?;

    if !status.success() {
        return Err(format!(
            "'{} {}' failed with exit code {:?}",
            program,
            args.join(" "),
            status.code()
        ));
    }

    Ok(())
}

fn run_host_build(project_dir: &Path) -> Result<(), String> {
    println!("=== 1. Executing Host Build Steps in '{}' ===", project_dir.display());

    println!("-> Running yarn install...");
    run_step(project_dir, "yarn", &["install", "--immutable"])?;

    println!("-> Generating Type Definitions (yarn tsc)...");
    run_step(project_dir, "yarn", &["tsc"])?;

    println!("-> Building Backend Production Packages (yarn --cwd packages/backend build)...");
    run_step(project_dir, "yarn", &["--cwd", "packages/backend", "build"])?;

    Ok(())
}

fn run_docker_build(project_dir: &Path, image: &str) -> Result<(), String> {
    run_host_build(project_dir)?;

    println!("=== 2. Building Docker image '{}' ===", image);
    run_step(project_dir, "docker", &["build", "--no-cache", "-t", image, "."])?;

    println!("\nBuild complete. To deploy to K3s via k3d-pilot:");
    println!("  k3d-pilot load --image {}", image);
    println!("  k3d-pilot restart --deployment backstage-pilot --namespace default");

    Ok(())
}

fn execute(cli: Cli) -> Result<(), String> {
    match cli.command {
        Commands::Build => run_docker_build(&cli.project_dir, &cli.image),
        Commands::Verify => run_host_build(&cli.project_dir),
    }
}

fn main() -> ExitCode {
    match execute(Cli::parse()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(msg) => {
            eprintln!("ERROR: {}", msg);
            ExitCode::FAILURE
        }
    }
}

