import axios from 'axios'
import fs from 'fs-extra'
import config from './config.js'
import path from 'path'
import chalk from 'chalk'

// Helper to fetch directory listing from GitHub API
async function fetchList(type) {
  try {
    const url = `${config.GITHUB_API_BASE}/${type}`;
    const response = await axios.get(url);
    if (!Array.isArray(response.data)) return [];
    return response.data
      .filter(item => item.name.endsWith('.md'))
      .map(item => item.name.replace('.md', ''));
  } catch (error) {
    if (error.response && error.response.status === 404) return [];
    throw new Error(`GitHub API Error: ${error.message}`);
  }
}

// Helper to download raw content
async function downloadFile(type, name, destDir) {
  try {
    const url = `${config.GITHUB_RAW_BASE}/${type}/${name}.md`;
    const response = await axios.get(url);
    await fs.writeFile(path.join(destDir, `${name}.md`), response.data);
    return true;
  } catch (error) {
    return false;
  }
}

async function listRemoteTemplates() {
  console.log(chalk.gray(`Connecting to github.com/${config.REPO_OWNER}/${config.REPO_NAME}...\n`));
  
  const plans = await fetchList('plans');
  const skills = await fetchList('skills');

  console.log(chalk.hex(config.COLORS.info)('📦 Remote Templates Available:'));
  
  console.log(chalk.bold('\n  Plans:'));
  if(plans.length === 0) console.log(chalk.gray('    (No plans found or repo is empty)'));
  plans.forEach(p => console.log(`    - ${p}`));

  console.log(chalk.bold('\n  Skills:'));
  if(skills.length === 0) console.log(chalk.gray('    (No skills found or repo is empty)'));
  skills.forEach(s => console.log(`    - ${s}`));
  console.log('');
}

async function installTemplate(name) {
  const { PLANS, SKILLS } = config.GLOBAL_PATHS;

  if (name === 'all') {
    // Install everything
    const plans = await fetchList('plans');
    const skills = await fetchList('skills');
    console.log(chalk.blue(`Downloading ${plans.length + skills.length} templates...`));
    
    for (const p of plans) {
      await downloadFile('plans', p, PLANS);
      console.log(chalk.green(`  ✔ Installed Plan: ${p}`));
    }
    for (const s of skills) {
      await downloadFile('skills', s, SKILLS);
      console.log(chalk.green(`  ✔ Installed Skill: ${s}`));
    }
    return;
  }

  // Try to find it in skills first, then plans
  const isSkill = (await fetchList('skills')).includes(name);
  const isPlan = (await fetchList('plans')).includes(name);

  if (isSkill) {
    await downloadFile('skills', name, SKILLS);
    console.log(chalk.green(`  ✔ Installed Skill: ${name}`));
  } else if (isPlan) {
    await downloadFile('plans', name, PLANS);
    console.log(chalk.green(`  ✔ Installed Plan: ${name}`));
  } else {
    console.log(chalk.red(`  ✘ Template '${name}' not found in remote repo.`));
    console.log(chalk.gray(`    Run --templates to see available options.`));
  }
}

export default { listRemoteTemplates, installTemplate };
