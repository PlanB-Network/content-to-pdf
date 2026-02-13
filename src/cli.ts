import { Command } from "commander";
import { resolveConfig } from "./config.js";
import { generateCoursePdf } from "./course.js";
import { generateQuizPdf } from "./quiz.js";

const program = new Command();

program
  .name("content-to-pdf")
  .description("Generate PDFs for Bitcoin Educational Content courses and quizzes")
  .version("1.0.0");

program
  .command("course")
  .description("Generate a course PDF")
  .requiredOption("--code <code>", "Course code (e.g. btc101)")
  .requiredOption("--lang <lang>", "Language code (e.g. en, fr)")
  .option("--output <path>", "Custom output directory")
  .option("--bec-path <path>", "Override BEC repo path")
  .option("--blms-path <path>", "Override BLMS locales path")
  .action(async (opts) => {
    try {
      const config = resolveConfig({
        becPath: opts.becPath,
        blmsPath: opts.blmsPath,
        output: opts.output,
      });

      console.log(`\nGenerating course PDF: ${opts.code.toUpperCase()} (${opts.lang})`);
      const outputPath = await generateCoursePdf(opts.code, opts.lang, config);
      console.log(`\nDone! PDF saved to: ${outputPath}\n`);
    } catch (err) {
      console.error(`\nError: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command("quiz")
  .description("Generate a quiz PDF")
  .requiredOption("--code <code>", "Course code (e.g. btc101)")
  .requiredOption("--lang <lang>", "Language code (e.g. en, fr)")
  .option("--count <n>", "Number of random questions (default: all)", parseInt)
  .option("--answers", "Include answer key at end")
  .option("--output <path>", "Custom output directory")
  .option("--bec-path <path>", "Override BEC repo path")
  .option("--blms-path <path>", "Override BLMS locales path")
  .action(async (opts) => {
    try {
      const config = resolveConfig({
        becPath: opts.becPath,
        blmsPath: opts.blmsPath,
        output: opts.output,
      });

      console.log(`\nGenerating quiz PDF: ${opts.code.toUpperCase()} (${opts.lang})`);
      const outputPath = await generateQuizPdf(opts.code, opts.lang, config, {
        count: opts.count,
        answers: opts.answers || false,
      });
      console.log(`\nDone! PDF saved to: ${outputPath}\n`);
    } catch (err) {
      console.error(`\nError: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program.parse();
