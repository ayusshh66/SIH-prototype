import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface AiBridgeError {
  status: "FAILED";
  error: string;
  traceback?: string;
}

/**
 * Resolves the root directory containing the `ai/` package.
 */
export function resolveProjectRoot(): string {
  const configured = (process.env.PROJECT_ROOT || process.env.AI_ROOT_DIR)?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  // Check if cwd has ai/
  if (fs.existsSync(path.resolve(process.cwd(), "ai"))) {
    return path.resolve(process.cwd());
  }

  // Check if parent directory has ai/
  if (fs.existsSync(path.resolve(process.cwd(), "..", "ai"))) {
    return path.resolve(process.cwd(), "..");
  }

  return path.resolve(__dirname, "../../../../");
}

/**
 * Invokes the Python AI bridge CLI module with a specified command and input payload.
 *
 * @param command Bridge command (e.g. "plan", "criticality", "shadow_blocks", "what_if", "emergency", "health")
 * @param payload JSON-serializable input dictionary or list
 * @param timeoutMs Maximum execution time in milliseconds (default: 20000ms)
 */
export function resolvePythonExecutable(): string {
  const configured = (process.env.PYTHON_BIN || process.env.PYTHON_EXECUTABLE)?.trim();
  if (configured) {
   return configured;
  }

  return process.platform === "win32" ? "python" : "python3";
}

export async function invokeAiBridge<TInput = unknown, TOutput = unknown>(
  command: string,
  payload: TInput,
  timeoutMs = 20000
): Promise<TOutput> {
  return new Promise<TOutput>((resolve, reject) => {
   const pythonBin = resolvePythonExecutable();
   // Target project root (where ai/ package resides)
   const rootDir = resolveProjectRoot();
   const pythonPath = [rootDir, process.env.PYTHONPATH]
     .filter((entry): entry is string => Boolean(entry?.trim()))
     .join(path.delimiter);

    const proc = spawn(pythonBin, ["-m", "ai.bridge", command], {
      cwd: rootDir,
      env: {
        ...process.env,
        // Keep Railpack's deployed Python dependency directory while making
        // the repository's ai package importable.
        PYTHONPATH: pythonPath,
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdoutData = "";
    let stderrData = "";
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        proc.kill();
        reject(new Error(`AI bridge command '${command}' timed out after ${timeoutMs}ms.`));
      }
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString("utf-8");
    });

    proc.stderr.on("data", (chunk) => {
      stderrData += chunk.toString("utf-8");
    });

    proc.on("error", (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to spawn Python process (${pythonBin}): ${err.message}`));
      }
    });

    proc.on("close", (code) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (code !== 0) {
        // Attempt to parse JSON error from stderr or stdout
        try {
          const parsedErr = JSON.parse(stderrData || stdoutData);
          if (parsedErr && parsedErr.error) {
            return reject(new Error(`AI Engine Error [${command}]: ${parsedErr.error}`));
          }
        } catch {
          // fall through
        }
        return reject(
          new Error(
            `AI bridge command '${command}' exited with code ${code}. Stderr: ${
              stderrData || "No stderr output"
            }`
          )
        );
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        reject(
          new Error(
            `Failed to parse JSON response from AI bridge '${command}': ${message}. Raw output: ${stdoutData.slice(
              0,
              500
            )}`
          )
        );
      }
    });

    // Write input payload to stdin and close stdin stream
    try {
      const inputStr = JSON.stringify(payload ?? {});
      proc.stdin.write(inputStr, "utf-8", () => {
        proc.stdin.end();
      });
    } catch (err: unknown) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        proc.kill();
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`Failed to serialize input for AI bridge '${command}': ${message}`));
      }
    }
  });
}
