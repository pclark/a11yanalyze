import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, extname, basename } from 'path';
import yaml from 'js-yaml';
import { PageScanner } from '../scanner/page-scanner';
import { VpatReporter } from '../output/vpat-reporter';
import { ScanResult } from '../types';
import Handlebars from 'handlebars';
import { simulateKeyboardNavigation, simulateScreenReader } from '../scanner/page-scanner';

export interface HtmlBatchOptions {
  inputDir?: string;
  inputList?: string;
  inputConfig?: string;
  outputDir: string;
  format: 'json' | 'markdown' | 'both';
  wcagLevel?: string;
  timeout?: number;
  template?: string;
  keyboardNav?: boolean;
  screenReaderSim?: boolean;
}

export class HtmlBatchRunner {
  async run(options: HtmlBatchOptions): Promise<void> {
    let targets: { name: string; path: string; isUrl: boolean; meta?: any }[] = [];
    if (options.inputDir) {
      targets = this.findHtmlFiles(options.inputDir).map(f => ({ name: basename(f, '.html'), path: f, isUrl: false }));
    }
    if (options.inputList) {
      const urls = readFileSync(options.inputList, 'utf8').split(/\r?\n/).filter(Boolean);
      targets = targets.concat(urls.map(url => ({ name: this.sanitizeName(url), path: url, isUrl: true })));
    }
    if (options.inputConfig) {
      const config = this.loadConfigFile(options.inputConfig);
      if (Array.isArray(config)) {
        targets = targets.concat(config.map((entry: any) => ({
          name: entry.name || this.sanitizeName(entry.url || entry.file),
          path: entry.url || entry.file,
          isUrl: !!entry.url,
          meta: entry
        })));
      }
    }
    if (!targets.length) throw new Error('No HTML files, URLs, or config entries found.');
    if (!existsSync(options.outputDir)) mkdirSync(options.outputDir, { recursive: true });
    let customTemplate: string | undefined;
    if (options.template) {
      customTemplate = readFileSync(options.template, 'utf8');
    }
    const summary: any[] = [];
    const errors: any[] = [];
    for (const target of targets) {
      try {
        const scanResult = await this.scanTarget(target, options);
        const vpatReport = VpatReporter.generateJsonReport(target.name, scanResult);
        const baseName = this.sanitizeName(target.name);
        if (options.format === 'json' || options.format === 'both') {
          const jsonPath = join(options.outputDir, `${baseName}.vpat.json`);
          if (customTemplate && options.template?.endsWith('.json')) {
            writeFileSync(jsonPath, VpatReporter.generateCustomReport(vpatReport, customTemplate), 'utf8');
          } else {
            writeFileSync(jsonPath, JSON.stringify(vpatReport, null, 2), 'utf8');
          }
        }
        if (options.format === 'markdown' || options.format === 'both') {
          const mdPath = join(options.outputDir, `${baseName}.vpat.md`);
          if (customTemplate && options.template?.endsWith('.md')) {
            writeFileSync(mdPath, VpatReporter.generateCustomReport(vpatReport, customTemplate), 'utf8');
          } else {
            const md = VpatReporter.generateMarkdownReport(vpatReport);
            writeFileSync(mdPath, md, 'utf8');
          }
        }
        summary.push({
          name: target.name,
          path: target.path,
          meta: target.meta,
          status: 'success',
          supports: vpatReport.summary.supports,
          partiallySupports: vpatReport.summary.partiallySupports,
          doesNotSupport: vpatReport.summary.doesNotSupport,
          notApplicable: vpatReport.summary.notApplicable,
          notEvaluated: vpatReport.summary.notEvaluated,
        });
      } catch (error) {
        errors.push({
          name: target.name,
          path: target.path,
          meta: target.meta,
          error: error instanceof Error ? error.message : String(error),
        });
        summary.push({
          name: target.name,
          path: target.path,
          meta: target.meta,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
        console.warn(`Failed to scan ${target.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    writeFileSync(join(options.outputDir, 'vpat-index.json'), JSON.stringify(summary, null, 2), 'utf8');
    if (errors.length > 0) {
      writeFileSync(join(options.outputDir, 'vpat-errors.json'), JSON.stringify(errors, null, 2), 'utf8');
    }
  }

  loadConfigFile(path: string): any {
    const content = readFileSync(path, 'utf8');
    if (path.endsWith('.json')) {
      return JSON.parse(content);
    } else if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      return yaml.load(content);
    }
    throw new Error('Unsupported config file format: ' + path);
  }

  findHtmlFiles(dir: string): string[] {
    let results: string[] = [];
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(this.findHtmlFiles(fullPath));
      } else if (stat.isFile() && extname(fullPath).toLowerCase() === '.html') {
        results.push(fullPath);
      }
    }
    return results;
  }

  sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async scanTarget(target: { path: string; isUrl: boolean }, options: HtmlBatchOptions): Promise<ScanResult> {
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
    const scanResult = await pageScanner.scan(target.path, {
      wcagLevel: (options.wcagLevel as any) || 'AA',
      includeAAA: false,
      includeARIA: true,
      customRules: [],
      disabledRules: [],
    });
    if (options.keyboardNav !== false) {
      scanResult.keyboardNavigation = await simulateKeyboardNavigation(pageScanner['browserManager']['page']);
    }
    if (options.screenReaderSim !== false) {
      scanResult.screenReaderSimulation = await simulateScreenReader(pageScanner['browserManager']['page']);
    }
    return scanResult;
  }
} 