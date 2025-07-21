import inquirer from 'inquirer';
import { WCAG_DATABASE } from '../data/wcag-database';
import { writeFileSync } from 'fs';

export interface ManualGuideOptions {
  output?: string;
  criteria?: string[]; // Optional: restrict to certain WCAG criteria
}

export async function runManualGuide(target: string, options: ManualGuideOptions = {}) {
  const criteriaKeys = options.criteria || Object.keys(WCAG_DATABASE);
  const results: any[] = [];

  for (const key of criteriaKeys) {
    const criterion = WCAG_DATABASE[key];
    if (!criterion) continue;
    const steps = criterion.testing?.manual || [];
    const { status } = await inquirer.prompt([
      {
        type: 'list',
        name: 'status',
        message: `Criterion ${criterion.number}: ${criterion.title}\n${criterion.description}\nManual steps:\n- ${steps.join('\n- ')}\nResult?`,
        choices: [
          { name: 'Pass', value: 'Pass' },
          { name: 'Fail', value: 'Fail' },
          { name: 'N/A', value: 'N/A' },
          { name: 'Skip', value: 'Skip' }
        ],
        default: 'Pass',
      }
    ]);
    let notes = '';
    if (status !== 'Skip') {
      const notesAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'notes',
          message: 'Notes/comments (optional):',
        }
      ]);
      notes = notesAnswer.notes || '';
      results.push({
        criterion: criterion.number,
        title: criterion.title,
        status,
        notes,
      });
    }
  }

  const report = {
    target,
    date: new Date().toISOString(),
    results,
  };
  const outputPath = options.output || `${target.replace(/[^a-z0-9]/gi, '_')}.manual-audit.json`;
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Manual audit report saved to ${outputPath}`);
} 