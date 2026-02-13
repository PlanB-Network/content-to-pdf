import { config as loadDotenv } from "dotenv";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

loadDotenv({ path: resolve(PROJECT_ROOT, ".env") });

export interface Config {
  becPath: string;
  blmsLocalesPath: string;
  outputDir: string;
}

export function resolveConfig(options: {
  becPath?: string;
  blmsPath?: string;
  output?: string;
}): Config {
  const becPath = resolve(
    PROJECT_ROOT,
    options.becPath || process.env.BEC_PATH || "../bitcoin-educational-content"
  );
  const blmsLocalesPath = resolve(
    PROJECT_ROOT,
    options.blmsPath ||
      process.env.BLMS_LOCALES_PATH ||
      "../bitcoin-learning-management-system/apps/academy/public/locales"
  );
  const outputDir = options.output
    ? resolve(options.output)
    : resolve(PROJECT_ROOT, "output");

  if (!existsSync(becPath)) {
    throw new Error(`BEC path not found: ${becPath}`);
  }

  return { becPath, blmsLocalesPath, outputDir };
}
