#!/usr/bin/env node

import { program } from 'commander';
import { version } from '../package.json';

/**
 * Main CLI entry point for a11yanalyze
 * WCAG 2.2 AA accessibility testing tool
 */
async function main(): Promise<void> {
  program
    .name('a11yanalyze')
    .description('CLI tool for WCAG 2.2 AA accessibility testing')
    .version(version);

  // TODO: Add commands for scan and crawl functionality
  program
    .command('scan')
    .description('Scan a single page for accessibility issues')
    .argument('<url>', 'URL to scan')
    .action(async (url: string) => {
      console.log(`🔍 Scanning: ${url}`);
      console.log('⚠️  Scan functionality not yet implemented');
    });

  program
    .command('crawl')
    .description('Crawl a website for accessibility issues')
    .argument('<url>', 'URL to crawl')
    .option('-d, --depth <number>', 'crawl depth', '2')
    .action(async (url: string, options: { depth: string }) => {
      console.log(`🕷️  Crawling: ${url} (depth: ${options.depth})`);
      console.log('⚠️  Crawl functionality not yet implemented');
    });

  await program.parseAsync();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main().catch((error: Error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { main }; 