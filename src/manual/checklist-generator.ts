import { WCAG_DATABASE } from '../data/wcag-database';
import { writeFileSync } from 'fs';

export interface ChecklistOptions {
  output?: string;
  format?: 'markdown' | 'json';
  wcagLevel?: string;
  criteria?: string[];
}

export function generateChecklist(target: string, options: ChecklistOptions = {}) {
  const criteriaKeys = options.criteria || Object.keys(WCAG_DATABASE);
  const checklist = criteriaKeys
    .map(key => WCAG_DATABASE[key])
    .filter((c): c is NonNullable<typeof c> => !!c && (!options.wcagLevel || c.level === options.wcagLevel));

  if (options.format === 'json') {
    const json = checklist.map(c => ({
      number: c.number,
      title: c.title,
      description: c.description,
      manualSteps: c.testing?.manual || [],
      status: '',
      notes: ''
    }));
    const outputPath = options.output || `${target.replace(/[^a-z0-9]/gi, '_')}.checklist.json`;
    writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Checklist saved to ${outputPath}`);
    return;
  }

  // Markdown output
  let md = `# Manual Accessibility Testing Checklist for ${target}\n\n`;
  for (const c of checklist) {
    md += `## ${c.number}: ${c.title}\n`;
    md += `${c.description}\n\n`;
    md += `**Manual Steps:**\n`;
    for (const step of c.testing?.manual || []) {
      md += `- ${step}\n`;
    }
    md += `\n- [ ] Pass   - [ ] Fail   - [ ] N/A\n`;
    md += `**Notes:** ________________________________\n\n`;
  }
  // Add cognitive accessibility section
  md += `# Cognitive Accessibility Checklist\n\n`;
  md += `## Plain Language\n- Use short sentences and common words\n- Avoid jargon and abbreviations\n- Provide definitions for unusual terms\n\n`;
  md += `## Consistent Navigation (WCAG 3.2.3, 3.2.4)\n- Ensure navigation menus are consistent across pages\n- Use consistent labels for repeated elements\n\n`;
  md += `## Error Prevention (WCAG 3.3.7, 3.3.8)\n- Minimize required memory and redundant entry\n- Provide accessible authentication options\n- Offer clear error messages and suggestions\n\n`;
  md += `## Reading Level (WCAG 3.1.5)\n- Use language appropriate for the intended audience\n- Aim for 8th grade reading level or lower\n- Provide summaries for complex content\n\n`;
  md += `## Clear Instructions\n- Provide step-by-step instructions for complex tasks\n- Use visual cues and examples where possible\n\n`;
  const outputPath = options.output || `${target.replace(/[^a-z0-9]/gi, '_')}.checklist.md`;
  writeFileSync(outputPath, md, 'utf8');
  console.log(`Checklist saved to ${outputPath}`);
} 