import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  bumpOnecVersion,
  bumpSemver,
  readOnecVersion,
  replaceOnecVersion,
  updateComponentVersions,
} from "./update-component-versions.mjs";

test("bumps frontend and backend semantic patch versions", () => {
  assert.equal(bumpSemver("0.0.0"), "0.0.1");
  assert.equal(bumpSemver("1.7.9"), "1.7.10");
});

test("bumps the last part of a 1C extension version", () => {
  assert.equal(bumpOnecVersion("1.1.0.1"), "1.1.0.2");
  assert.equal(bumpOnecVersion("2.4.10.99"), "2.4.10.100");
});

test("reads and replaces only the 1C extension version property", () => {
  const source = "<Properties><Version>1.1.0.1</Version></Properties>";
  const updated = replaceOnecVersion(source, "1.1.0.2");

  assert.equal(readOnecVersion(updated), "1.1.0.2");
  assert.equal(updated, "<Properties><Version>1.1.0.2</Version></Properties>");
});

test("bumps changed component folders once and then stays idempotent", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "component-versions-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: repoRoot });

    for (const component of ["frontend", "backend"]) {
      fs.mkdirSync(path.join(repoRoot, component), { recursive: true });
      fs.writeFileSync(
        path.join(repoRoot, component, "package.json"),
        `${JSON.stringify({ name: component, version: component === "frontend" ? "0.0.0" : "1.0.0" }, null, 2)}\n`,
      );
      fs.writeFileSync(
        path.join(repoRoot, component, "package-lock.json"),
        `${JSON.stringify({
          name: component,
          version: component === "frontend" ? "0.0.0" : "1.0.0",
          lockfileVersion: 3,
          packages: {
            "": {
              name: component,
              version: component === "frontend" ? "0.0.0" : "1.0.0",
            },
          },
        }, null, 2)}\n`,
      );
      fs.writeFileSync(path.join(repoRoot, component, "source.txt"), component);
    }

    const onecDir = path.join(
      repoRoot,
      "onec/omni/src/extension/бит_МедицинаОмни_ПРОФ",
    );
    fs.mkdirSync(onecDir, { recursive: true });
    fs.writeFileSync(
      path.join(onecDir, "Configuration.xml"),
      "<Properties><Version>1.1.0.1</Version></Properties>",
    );
    fs.writeFileSync(path.join(onecDir, "Module.bsl"), "Функция Тест()\nКонецФункции");

    const releaseDir = path.join(repoRoot, ".release");
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(releaseDir, "components.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        components: {
          frontend: { version: "0.0.0", sourceHash: "" },
          backend: { version: "1.0.0", sourceHash: "" },
          onec: { version: "1.1.0.1", sourceHash: "" },
        },
      }, null, 2)}\n`,
    );

    const firstRun = updateComponentVersions({ repoRoot });
    assert.equal(firstRun.anyChanged, true);
    assert.equal(firstRun.components.frontend.version, "0.0.1");
    assert.equal(firstRun.components.backend.version, "1.0.1");
    assert.equal(firstRun.components.onec.version, "1.1.0.2");

    const secondRun = updateComponentVersions({ repoRoot });
    assert.equal(secondRun.anyChanged, false);
    assert.equal(secondRun.components.frontend.version, "0.0.1");
    assert.equal(secondRun.components.backend.version, "1.0.1");
    assert.equal(secondRun.components.onec.version, "1.1.0.2");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
