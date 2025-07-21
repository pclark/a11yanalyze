import fetch from 'node-fetch';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { PageScanner } from '../scanner/page-scanner';
import { VpatReporter } from '../output/vpat-reporter';
import { ScanResult } from '../types';
import { simulateKeyboardNavigation } from '../scanner/page-scanner';
import { simulateScreenReader } from '../scanner/page-scanner';

export interface StorybookBatchOptions {
  storybookUrl: string;
  outputDir: string;
  format: 'json' | 'markdown' | 'both';
  wcagLevel?: string;
  timeout?: number;
  keyboardNav?: boolean;
  screenReaderSim?: boolean;
}

export class StorybookBatchRunner {
  async run(options: StorybookBatchOptions): Promise<void> {
    // 1. Discover stories
    const stories = await this.discoverStories(options.storybookUrl);
    if (!stories.length) {
      throw new Error('No stories found in Storybook instance.');
    }
    // 2. Ensure output directory exists
    if (!existsSync(options.outputDir)) {
      mkdirSync(options.outputDir, { recursive: true });
    }
    // 3. Scan each story and generate reports
    const summary: any[] = [];
    for (const story of stories) {
      const scanResult = await this.scanStory(story.url, options);
      const vpatReport = VpatReporter.generateJsonReport(story.name, scanResult);
      const baseName = story.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (options.format === 'json' || options.format === 'both') {
        const jsonPath = join(options.outputDir, `${baseName}.vpat.json`);
        writeFileSync(jsonPath, JSON.stringify(vpatReport, null, 2), 'utf8');
      }
      if (options.format === 'markdown' || options.format === 'both') {
        const mdPath = join(options.outputDir, `${baseName}.vpat.md`);
        const md = VpatReporter.generateMarkdownReport(vpatReport);
        writeFileSync(mdPath, md, 'utf8');
      }
      summary.push({
        name: story.name,
        url: story.url,
        supports: vpatReport.summary.supports,
        partiallySupports: vpatReport.summary.partiallySupports,
        doesNotSupport: vpatReport.summary.doesNotSupport,
        notApplicable: vpatReport.summary.notApplicable,
        notEvaluated: vpatReport.summary.notEvaluated,
      });
    }
    // 4. Write summary index
    writeFileSync(join(options.outputDir, 'vpat-index.json'), JSON.stringify(summary, null, 2), 'utf8');
  }

  async discoverStories(storybookUrl: string): Promise<{ name: string; url: string }[]> {
    // Try to fetch /stories.json (Storybook 6+)
    try {
      const res = await fetch(`${storybookUrl.replace(/\/$/, '')}/stories.json`);
      if (res.ok) {
        const data = await res.json();
        // Type guard for 'data' before accessing data.stories
        if (typeof data === 'object' && data !== null && 'stories' in data) {
          // Now safe to access data.stories
          return Object.values((data as any).stories).map((story: any) => ({
            name: story.name || story.id,
            url: `${storybookUrl.replace(/\/$/, '')}/iframe.html?id=${story.id}`,
          }));
        }
      }
    } catch (e) {
      // Fallback to crawling sidebar or other methods in future
    }
    // If not found, return empty for now
    return [];
  }

  async scanStory(url: string, options: StorybookBatchOptions): Promise<ScanResult> {
    // Use the PageScanner with minimal config for now
    const pageScanner = new PageScanner(
      {
        headless: true,
        viewport: { width: 1280, height: 720 },
        timeout: options.timeout || 30000,
      },
      {
        wcagLevel: (options.wcagLevel as any) || 'AA',
        includeAAA: false,
        includeARIA: true,
        customRules: [],
        disabledRules: [],
      }
    );
    await pageScanner.initialize();
    // Run the scan and get results
    const scanResult = await pageScanner.scan(url);

    // Use keyboardNavigation and screenReaderSimulation from scanResult
    // (No need to call simulateKeyboardNavigation or simulateScreenReader here)

    return scanResult;
  }
} 