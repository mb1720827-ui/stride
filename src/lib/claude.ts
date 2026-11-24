// The one place Stride calls the AI. Approach A: Claude Code on the owner's laptop (their Claude plan, no API key).
// Moving to the Claude API later means replacing runPlanner()'s body; callers stay the same.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/** Claude Code: CLAUDE_BIN, then `claude` on PATH, then the newest copy bundled with the VS Code extension. */
export function findClaude(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const exe = process.platform === "win32" ? "claude.exe" : "claude";
  for (const dir of (process.env.PATH ?? "").split(process.platform === "win32" ? ";" : ":")) {
    if (dir && existsSync(join(dir, exe))) return join(dir, exe);
  }
  const extensions = join(homedir(), ".vscode", "extensions");
  const bundled = existsSync(extensions)
    ? readdirSync(extensions)
        .filter((d) => d.startsWith("anthropic.claude-code-"))
        .map((d) => join(extensions, d, "resources", "native-binary", exe))
        .filter((p) => existsSync(p))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    : [];
  if (bundled[0]) return bundled[0];
  throw new Error("Claude Code isn't installed. Install it (npm install -g @anthropic-ai/claude-code) or set CLAUDE_BIN.");
}

/**
 * Runs Claude Code headless on `prompt` and returns its structured output, validated with `schema`.
 * Isolated: an empty temporary folder, no shell or file-writing tools, no personal settings, hooks, plugins or MCP
 * servers. `web: true` allows only WebSearch and WebFetch (for finding learning resources).
 */
export async function runPlanner<T>(prompt: string, schema: z.ZodType<T>, opts: { web?: boolean; claude?: string } = {}): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "stride-"));
  const args = ["-p", "--output-format", "json", "--json-schema", JSON.stringify(z.toJSONSchema(schema, { target: "draft-7" })),
    "--allowedTools", opts.web ? "WebSearch,WebFetch" : "Read", "--permission-mode", "dontAsk", "--restricted",
    "--setting-sources", "project", "--strict-mcp-config", "--no-session-persistence"];
  if (process.env.STRIDE_MODEL) args.push("--model", process.env.STRIDE_MODEL);
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(opts.claude ?? findClaude(), args, { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
      let out = "";
      let err = "";
      const timer = setTimeout(() => child.kill(), 10 * 60_000);
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(out);
        else reject(new Error(`Claude Code exited with ${code}: ${(err || out).slice(0, 300)}`));
      });
      child.stdin.end(prompt);
    });
    const result = JSON.parse(stdout);
    if (result.is_error) throw new Error(`Claude Code: ${String(result.result).slice(0, 300)}`);
    return schema.parse(result.structured_output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
