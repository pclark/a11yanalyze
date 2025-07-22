/**
 * ConfigManager JS config file loading test (no fs/path mocks)
 */

import { ConfigManager } from './config-manager';
import fs from 'fs';
import path from 'path';

describe('ConfigManager (JS config file, real fs)', () => {
  it('should load JavaScript configuration file', async () => {
    const configManager = new ConfigManager();
    // (No need to clear loadedConfig directly; new instance is sufficient)
    // Write a real JS config file to disk so require can load it
    const configPath = path.join(process.cwd(), '.a11yanalyzerc.js');
    const configContent = `module.exports = { scanning: { wcagLevel: 'A' }, browser: { headless: false } };`;
    fs.writeFileSync(configPath, configContent, 'utf8');
    // Debug: print current working directory and files
    console.log('[TEST DEBUG] process.cwd():', process.cwd());
    console.log('[TEST DEBUG] Directory contents:', fs.readdirSync(process.cwd()));
    // Temporarily rename all possible config files that could be loaded before the .js config
    const configFiles = [
      '.a11yanalyzerc.json',
      'a11yanalyze.config.json',
      'a11yanalyze.config.js',
      'package.json',
    ];
    const renamedFiles: { orig: string; backup: string }[] = [];
    for (const file of configFiles) {
      const filePath = path.join(process.cwd(), file);
      const backupPath = filePath + '.bak';
      if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, backupPath);
        renamedFiles.push({ orig: filePath, backup: backupPath });
      }
    }
    try {
      const result = await configManager.loadConfig();
      expect(result.config.scanning.wcagLevel).toBe('A');
      expect(result.config.browser.headless).toBe(false);
    } finally {
      fs.unlinkSync(configPath);
      for (const { orig, backup } of renamedFiles) {
        if (fs.existsSync(backup)) {
          fs.renameSync(backup, orig);
        }
      }
    }
  });
}); 