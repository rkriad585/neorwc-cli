#!/usr/bin/env node

import { program } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

// Import Core Modules
import config from './src/core/config.js'
import scanner from './src/core/scanner.js'
import ai from './src/core/ai.js'
import writer from './src/core/writer.js'
import templates from './src/core/templates.js'
import state from './src/core/state.js'

program
  .version('3.3.0')
  .description('Neorwc: Documentation Suite')
  .option('-m, --model <type>', 'Ollama model', config.DEFAULT_MODEL)
  .option('-c, --ctx <number>', 'Override Context Window (default: auto-detect)')
  .option('-p, --plan <name>', 'Use a global plan (e.g., api-docs)')
  .option('-s, --skill <name>', 'Use a specific persona skill (e.g., technical-writer)')
  .option('-n, --init', 'Initialize ~/.neorwc folder with default templates')
  .option('-t, --templates', 'List available templates from GitHub')
  .option('-i, --install <name>', 'Install a template (use "all" for everything)')
  .option('-l, --list', 'List installed local resources, List available Global Plans and Skills')
  .option('-d, --dry-run', 'Scan and plan without writing files')
  .parse(process.argv);

const options = program.opts();

// --- UI Helpers ---
const logLogo = () => {
  console.log(chalk.hex(config.COLORS.primary)(`
  _   _  ____  ___  ____  __      __  ___ 
 | \\ | || ===|/ _ \\| ===| \\ \\ /\\ / / / _| 
 |_|\\_||____|\\___/|_|\\_\\  \\_/\\_/   \\__| 
 `));
  console.log(chalk.hex(config.COLORS.secondary)('  Neo Read Write Create // v3.0.0\n'));
};

const drawUsageBar = (tokens, limit) => {
  const percent = Math.min((tokens / limit) * 100, 100);
  const barLength = 30;
  const filled = Math.round((percent / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  let color = chalk.green;
  if (percent > 70) color = chalk.yellow;
  if (percent > 90) color = chalk.red;

  console.log(`  Context Usage: [${color(bar)}] ${tokens}/${limit} tokens`);
};

// --- Helper: Initialize Global Config ---
async function handleInit() {
  const { ROOT, PLANS, SKILLS } = config.GLOBAL_PATHS;
  
  if (fs.existsSync(ROOT)) {
    console.log(chalk.yellow(`⚠  Configuration folder already exists at ${ROOT}`));
    return;
  }

  const spinner = ora('Initializing Neorwc with Neorwc-Style Profiles...').start();
  await fs.ensureDir(PLANS);
  await fs.ensureDir(SKILLS);

  // 1. Neorwc-Style Skill (Persona)
  const neorwcSkill = `# Skill: Neorwc Senior Architect
**Persona:** You are Neorwc, an AI documentation writer created by RK Riad Khan, acting as a Principal Software Architect.
**Tone:** Highly professional, concise, direct, and technical. No fluff.
**Philosophy:** 
- Prioritize "Helpful, Harmless, and Honest" documentation.
- Focus on Modularity, Scalability, and Security.
- Use MermaidJS diagrams where complex logic exists.
- Write for a Senior Developer audience.
**Format:**
- Use clear headings (e.g.. H1, H2, H3, H4 more).
- Use tables for property definitions.
- Use emoji to make it more beautiful, friendly and better reading experience.
- Explain how to use this project with examples
- Explain about features and functionality's
- Explain about project configuration's
- Explain the Project files/folders Structure with comments
- Explain how to install and use this project
- Always write in clean, descriptive, explainful, and human friendly.
- Always include a "Caveats" or "Edge Cases" section in technical docs.`;

  await fs.writeFile(path.join(SKILLS, 'neorwc-architect.md'), neorwcSkill);

  // 2. Comprehensive Plan (Strategy)
  const fullPlan = `# Plan: Comprehensive Architecture Breakdown
**Goal:** Create a full documentation suite suitable for enterprise handover.

**Required Files:**
1. \`docs/README.md\`: High-level overview, badges, quick start.
2. \`docs/architecture/system-design.md\`: 
   - Explain the folder structure.
   - Diagram the data flow.
3. \`docs/api/reference.md\` (if API exists): 
   - Endpoints, Methods, Payloads.
4. \`docs/guides/contribution.md\`:
   - Setup instructions.
   - Linting/Testing rules.
5. e.g.. mores (if need).

**Style:** Markdown with rigorous detail.`;

  await fs.writeFile(path.join(PLANS, 'full-suite.md'), fullPlan);

  spinner.succeed(`Initialized at ${chalk.bold(ROOT)}`);
  console.log(chalk.green(`  ✔ Created Skill: neorwc-architect`));
  console.log(chalk.green(`  ✔ Created Plan: full-suite`));
  process.exit(0);
}

// --- Helper: List Resources ---
async function handleList() {
  const { PLANS, SKILLS } = config.GLOBAL_PATHS;
  
  console.log(chalk.hex(config.COLORS.info)('\n📂 Available Global Resources:\n'));

  const printFiles = async (dir, type) => {
    if (!fs.existsSync(dir)) return console.log(chalk.gray(`  No ${type} folder found. Run --init`));
    const files = await fs.readdir(dir);
    console.log(chalk.bold(`  ${type}:`));
    files.filter(f => f.endsWith('.md')).forEach(f => {
      console.log(`    - ${f.replace('.md', '')}`);
    });
    console.log('');
  };

  await printFiles(PLANS, 'Plans');
  await printFiles(SKILLS, 'Skills');
  process.exit(0);
}

async function main() {
  // --- New Handlers ---
  if (options.templates) {
    await templates.listRemoteTemplates();
    process.exit(0);
  }

  if (options.install) {
    await templates.installTemplate(options.install);
    process.exit(0);
  }
  
  // Handle Special Flags first
  if (options.init) await handleInit();
  if (options.list) await handleList();

  const savedState = await state.loadState();
  
  // Priority: CLI Flag > Saved State > Default Config
  const selectedModel = options.model || savedState.model || config.DEFAULT_MODEL;
  
  // Note: We don't load Plan/Skill from state automatically to avoid accidental reuse 
  // of wrong plans, but we could if desired. We definitely save the model though.
  
  logLogo(); // (Keep your existing logLogo function)

  console.log(chalk.gray(`  Using Model: ${chalk.cyan(selectedModel)}`));

  // 1. Fetch Dynamic Model Capabilities
  const capsSpinner = ora(`Connecting to ${selectedModel}...`).start();
  const modelCaps = await ai.getModelCapabilities(selectedModel, 'ollama');
  
  if (!modelCaps.exists && !options.model) {
    capsSpinner.warn(`Model '${selectedModel}' not found. Make sure to pull it.`);
  }
  
  // Determine Context: Flag > State > Dynamic Max > Default
  let contextLimit = 65536;
  if (options.ctx) contextLimit = parseInt(options.ctx);
  else if (savedState.ctx) contextLimit = parseInt(savedState.ctx);
  else contextLimit = modelCaps.maxContext;
  
  capsSpinner.succeed(`Model loaded. Max Context: ${chalk.bold(contextLimit)} tokens.`);

  await state.saveState({
    model: selectedModel,
    ctx: contextLimit,
    lastRun: new Date().toISOString()
  });
  
  // 2. Resolve Instructions (Plan + Skill + Local)
  let combinedInstructions = "";
  const { PLANS, SKILLS } = config.GLOBAL_PATHS;

  // A. Load Skill (Persona)
  if (options.skill) {
    const skillPath = path.join(SKILLS, `${options.skill}.md`);
    if (fs.existsSync(skillPath)) {
      const skillContent = await fs.readFile(skillPath, 'utf8');
      combinedInstructions += `\n\n--- ADOPT THIS PERSONA (SKILL) ---\n${skillContent}`;
      console.log(chalk.hex(config.COLORS.info)(`  + Loaded Skill: ${options.skill}`));
    } else {
      console.log(chalk.red(`  x Skill '${options.skill}' not found in ~/.neorwc/skills`));
    }
  }

  // B. Load Plan (Global Strategy)
  if (options.plan) {
    const planPath = path.join(PLANS, `${options.plan}.md`);
    if (fs.existsSync(planPath)) {
      const planContent = await fs.readFile(planPath, 'utf8');
      combinedInstructions += `\n\n--- EXECUTE THIS PLAN ---\n${planContent}`;
      console.log(chalk.hex(config.COLORS.info)(`  + Loaded Plan: ${options.plan}`));
    } else {
      console.log(chalk.red(`  x Plan '${options.plan}' not found in ~/.neorwc/plans`));
    }
  }

  // C. Load Local Context (Project Specific overrides)
  if (fs.existsSync(config.CONTEXT_FILE)) {
    const localContent = await fs.readFile(config.CONTEXT_FILE, 'utf8');
    combinedInstructions += `\n\n--- PROJECT SPECIFIC INSTRUCTIONS ---\n${localContent}`;
    console.log(chalk.green(`  + Loaded Local: ${config.CONTEXT_FILE}`));
  }

  // If nothing loaded, ask for basic input
  let projectName = path.basename(process.cwd());
  if (!combinedInstructions) {
     const ans = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Project Name:', default: projectName },
      { type: 'input', name: 'desc', message: 'Brief Description / Instructions:' }
    ]);
    projectName = ans.name;
    combinedInstructions = ans.desc || "Generate standard documentation.";
  }

  // 3. Scanning & Token Check
  const spinScan = ora('Indexing codebase...').start();
  const scanResult = await scanner.scanProject(process.cwd());
  spinScan.succeed(`Indexed ${scanResult.fileCount} files.`);
  
  // Visual Token Bar using Dynamic Limit
  drawUsageBar(scanResult.tokenEstimate, contextLimit); // (Keep your existing drawUsageBar function)

  if (scanResult.tokenEstimate > contextLimit) {
    console.log(chalk.red(`  ⚠ Warning: Input exceeds model limit (${contextLimit}). Truncation will occur.`));
  }

  // 4. Confirmation
  const confirm = await inquirer.prompt([{
    type: 'confirm',
    name: 'proceed',
    message: options.dryRun ? 'Run dry-run analysis?' : 'Generate documentation now?',
    default: true
  }]);

  if (!confirm.proceed) return;

  // 5. Generation
  const spinGen = ora(`Thinking (${options.model})...`).start();
  
  try {
    const aiResponse = await ai.generateDocumentation({
      model: selectedModel,
      context: scanResult.context,
      instructions: combinedInstructions,
      projectName,
      ctxSize: contextLimit,
      providerName: 'ollama'
    });

    spinGen.succeed('Done.');

    if (options.dryRun) {
      console.log(chalk.yellow('\n-- DRY RUN OUTPUT --'));
      console.log(aiResponse.substring(0, 500));
    } else {
      const created = await writer.parseAndWrite(aiResponse, process.cwd());
      if (created.length > 0) {
        console.log(chalk.green(`\n✔ Created ${created.length} files.`));
        created.forEach(f => console.log(chalk.gray(` - ${f}`)));
        console.log(chalk.gray(`  (Settings saved to docs/.neorwc)`));
        console.log(chalk.green(`\n✔ Documentation updated.`));
      } else {
        console.log(chalk.red('⚠ No files parsed.'));
      }
    }
  } catch (error) {
    spinGen.fail('Error');
    console.error(chalk.red(error.message));
  }
}

main();
