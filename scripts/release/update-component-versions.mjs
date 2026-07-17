import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MANIFEST_PATH = ".release/components.json";
const ONEC_SOURCE_DIR = "onec/omni/src/extension/бит_МедицинаОмни_ПРОФ";
const ONEC_CONFIGURATION_PATH = `${ONEC_SOURCE_DIR}/Configuration.xml`;

const COMPONENTS = {
  frontend: {
    sourceDir: "frontend",
    versionType: "semver",
    versionPath: "frontend/package.json",
    lockPath: "frontend/package-lock.json",
  },
  backend: {
    sourceDir: "backend",
    versionType: "semver",
    versionPath: "backend/package.json",
    lockPath: "backend/package-lock.json",
  },
  onec: {
    sourceDir: ONEC_SOURCE_DIR,
    versionType: "onec",
    versionPath: ONEC_CONFIGURATION_PATH,
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function bumpSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());

  if (!match) {
    throw new Error(`Unsupported semantic version: ${version}`);
  }

  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function bumpOnecVersion(version) {
  const parts = String(version).trim().split(".");

  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`Unsupported 1C extension version: ${version}`);
  }

  parts[3] = String(Number(parts[3]) + 1);
  return parts.join(".");
}

export function readOnecVersion(xml) {
  const match = /<Version>([^<]+)<\/Version>/.exec(xml);

  if (!match) {
    throw new Error("The 1C extension Configuration.xml does not contain <Version>");
  }

  return match[1].trim();
}

export function replaceOnecVersion(xml, nextVersion) {
  if (!/<Version>[^<]+<\/Version>/.test(xml)) {
    throw new Error("The 1C extension Configuration.xml does not contain <Version>");
  }

  return xml.replace(/<Version>[^<]+<\/Version>/, `<Version>${nextVersion}</Version>`);
}

function gitFiles(sourceDir, repoRoot) {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      sourceDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  return output
    .split("\0")
    .filter(Boolean)
    .map((filePath) => filePath.replaceAll("\\", "/"))
    .sort((left, right) => left.localeCompare(right, "en"));
}

export function calculateSourceHash(sourceDir, repoRoot = process.cwd()) {
  const files = gitFiles(sourceDir, repoRoot);

  if (files.length === 0) {
    throw new Error(`No source files found in ${sourceDir}`);
  }

  const digest = createHash("sha256");

  for (const filePath of files) {
    const blobHash = execFileSync(
      "git",
      ["hash-object", `--path=${filePath}`, filePath],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    ).trim();

    digest.update(filePath, "utf8");
    digest.update("\0", "utf8");
    digest.update(blobHash, "utf8");
    digest.update("\n", "utf8");
  }

  return `sha256:${digest.digest("hex")}`;
}

function readPackageVersion(component, repoRoot) {
  return String(readJson(path.join(repoRoot, component.versionPath)).version || "").trim();
}

function updatePackageVersion(component, repoRoot, nextVersion) {
  const packagePath = path.join(repoRoot, component.versionPath);
  const packageJson = readJson(packagePath);
  packageJson.version = nextVersion;
  writeJson(packagePath, packageJson);

  const lockPath = path.join(repoRoot, component.lockPath);

  if (!fs.existsSync(lockPath)) {
    return;
  }

  const packageLock = readJson(lockPath);
  packageLock.version = nextVersion;

  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = nextVersion;
  }

  writeJson(lockPath, packageLock);
}

function readCurrentVersion(component, repoRoot) {
  if (component.versionType === "onec") {
    return readOnecVersion(
      fs.readFileSync(path.join(repoRoot, component.versionPath), "utf8"),
    );
  }

  return readPackageVersion(component, repoRoot);
}

function updateVersion(component, repoRoot, nextVersion) {
  if (component.versionType === "onec") {
    const configurationPath = path.join(repoRoot, component.versionPath);
    const configurationXml = fs.readFileSync(configurationPath, "utf8");
    fs.writeFileSync(
      configurationPath,
      replaceOnecVersion(configurationXml, nextVersion),
      "utf8",
    );
    return;
  }

  updatePackageVersion(component, repoRoot, nextVersion);
}

function nextVersion(component, currentVersion) {
  return component.versionType === "onec"
    ? bumpOnecVersion(currentVersion)
    : bumpSemver(currentVersion);
}

function appendGithubOutputs(result) {
  const outputPath = process.env.GITHUB_OUTPUT;

  if (!outputPath) {
    return;
  }

  const output = [
    `any_changed=${result.anyChanged}`,
    ...Object.entries(result.components).flatMap(([name, component]) => [
      `${name}_changed=${component.changed}`,
      `${name}_version=${component.version}`,
      `${name}_source_hash=${component.sourceHash}`,
    ]),
  ];

  fs.appendFileSync(outputPath, `${output.join("\n")}\n`, "utf8");
}

export function updateComponentVersions({
  repoRoot = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH,
  dryRun = false,
} = {}) {
  const absoluteManifestPath = path.resolve(repoRoot, manifestPath);
  const manifest = readJson(absoluteManifestPath);
  const result = {
    anyChanged: false,
    components: {},
  };

  for (const [name, component] of Object.entries(COMPONENTS)) {
    const previousState = manifest.components?.[name] || {};
    const currentVersion = readCurrentVersion(component, repoRoot);
    const currentSourceHash = calculateSourceHash(component.sourceDir, repoRoot);
    const changed = currentSourceHash !== previousState.sourceHash;
    const version = changed ? nextVersion(component, currentVersion) : currentVersion;

    if (changed && !dryRun) {
      updateVersion(component, repoRoot, version);
    }

    const sourceHash = changed && !dryRun
      ? calculateSourceHash(component.sourceDir, repoRoot)
      : currentSourceHash;

    manifest.components[name] = {
      version,
      sourceHash,
    };

    result.components[name] = {
      changed,
      version,
      sourceHash,
      previousSourceHash: previousState.sourceHash || "",
    };
    result.anyChanged ||= changed;
  }

  if (!dryRun) {
    writeJson(absoluteManifestPath, manifest);
  }

  appendGithubOutputs(result);
  return result;
}

function parseArguments(argv) {
  const options = {
    dryRun: false,
    manifestPath: DEFAULT_MANIFEST_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (argument === "--manifest") {
      options.manifestPath = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const options = parseArguments(process.argv.slice(2));
  const result = updateComponentVersions(options);

  for (const [name, component] of Object.entries(result.components)) {
    console.log(
      `${name}: changed=${component.changed}; version=${component.version}; hash=${component.sourceHash}`,
    );
  }
}
