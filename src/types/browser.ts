/**
 * Browser and Playwright-specific type definitions
 * Handles page management, navigation, and browser configuration
 */

import { Browser, Page, BrowserContext } from 'playwright';

export interface BrowserConfig {
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout: number;
  slowMo?: number;
  args?: string[];
}

export interface NavigationOptions {
  timeout: number;
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle';
  retries: number;
  retryDelay: number;
}

export interface PageLoadResult {
  success: boolean;
  url: string;
  finalUrl: string;
  statusCode?: number;
  loadTime: number;
  error?: PageError;
  resources: ResourceInfo[];
}

export interface PageError {
  type: 'timeout' | 'network' | 'navigation' | 'javascript' | 'security';
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

export interface ResourceInfo {
  url: string;
  type: string;
  status: number;
  size: number;
  loadTime: number;
}

export interface JavaScriptError {
  message: string;
  source: string;
  line: number;
  column: number;
  stack?: string;
}

export interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  text: string;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
}

export interface ScreenshotOptions {
  path?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BrowserManagerEvents {
  pageLoaded: (result: PageLoadResult) => void;
  pageError: (error: PageError) => void;
  javascriptError: (error: JavaScriptError) => void;
  consoleMessage: (message: ConsoleMessage) => void;
  resourceLoaded: (resource: ResourceInfo) => void;
}

// Re-export Playwright types for convenience
export type { Browser, Page, BrowserContext } from 'playwright'; 