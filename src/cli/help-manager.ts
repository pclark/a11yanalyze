/**
 * Comprehensive Help System
 * Provides detailed guidance, examples, use cases, and interactive help
 * for the accessibility analysis tool
 */

import { program } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './config-manager';

/**
 * Help topic categories
 */
export type HelpCategory = 
  | 'getting-started'
  | 'scanning'
  | 'crawling'
  | 'configuration'
  | 'scoring'
  | 'reporting'
  | 'troubleshooting'
  | 'best-practices'
  | 'examples'
  | 'api';

/**
 * Help content structure
 */
export interface HelpContent {
  title: string;
  description: string;
  sections: HelpSection[];
  examples?: Example[];
  seeAlso?: string[];
}

/**
 * Help section structure
 */
export interface HelpSection {
  title: string;
  content: string;
  codeBlocks?: CodeBlock[];
  tips?: string[];
  warnings?: string[];
}

/**
 * Code example structure
 */
export interface CodeBlock {
  title: string;
  language: 'bash' | 'json' | 'javascript' | 'yaml';
  code: string;
  description?: string;
}

/**
 * Usage example structure
 */
export interface Example {
  title: string;
  description: string;
  command: string;
  explanation: string;
  expectedOutput?: string;
}

/**
 * Comprehensive Help Manager
 */
export class HelpManager {
  private static readonly HELP_CONTENT: Record<HelpCategory, HelpContent> = {
    'getting-started': {
      title: '🚀 Getting Started with A11Y Analyze',
      description: 'Learn the basics of accessibility testing with our comprehensive tool. This quick start guide will help you run your first scan and interpret results.',
      sections: [
        {
          title: 'Quick Start',
          content: 'Get up and running with accessibility testing in minutes. Run a basic scan, review the output, and explore further options.',
          codeBlocks: [
            {
              title: 'Basic Page Scan',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com',
              description: 'Scan a single page with default settings'
            },
            {
              title: 'Verbose Output',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --verbose',
              description: 'Get detailed progress information'
            },
            {
              title: 'Quick Start Example',
              language: 'bash',
              code: 'a11yanalyze scan https://ecommerce.example.com --format both',
              description: 'Scan an e-commerce site and output both console and JSON reports'
            }
          ],
          tips: [
            'Start with a single page scan to understand the tool',
            'Use --verbose to see detailed progress information',
            'Check the exit code: 0 = success, 1 = issues found',
            'See practical examples: a11yanalyze help examples',
            'For troubleshooting, see: a11yanalyze help troubleshooting'
          ]
        },
        {
          title: 'Understanding Results',
          content: 'Learn how to interpret accessibility scan results. The tool provides a score, issue breakdown, and remediation tips.',
          tips: [
            'Issues are categorized by WCAG level (A, AA, AAA)',
            'Severity levels: critical, serious, moderate, minor, warning',
            'Scores range from 0-100, with 80+ considered good',
            'Each issue includes remediation guidance and help URLs',
            'See also: a11yanalyze help reporting'
          ]
        }
      ],
      examples: [
        {
          title: 'First Scan',
          description: 'Perform your first accessibility scan',
          command: 'a11yanalyze scan https://example.com --format both',
          explanation: 'Scans a page and shows results both in console and JSON format',
          expectedOutput: 'Console output with score and JSON report'
        },
        {
          title: 'E-commerce Quick Start',
          description: 'Scan an e-commerce product page for accessibility',
          command: 'a11yanalyze scan https://shop.example.com/product/123 --include-aaa --screenshot',
          explanation: 'Comprehensive scan including AAA guidelines with screenshot capture',
          expectedOutput: 'Accessibility issues, warnings, and screenshot saved'
        }
      ],
      seeAlso: ['scanning', 'configuration', 'examples', 'troubleshooting']
    },

    'scanning': {
      title: '🔍 Single Page Scanning',
      description: 'Comprehensive guide to scanning individual pages for accessibility issues',
      sections: [
        {
          title: 'Basic Scanning',
          content: 'Essential options for page scanning',
          codeBlocks: [
            {
              title: 'Standard Scan',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com',
              description: 'WCAG 2.2 AA compliance scan with default settings'
            },
            {
              title: 'Comprehensive Scan',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --wcag-level AAA --include-aaa',
              description: 'Include AAA level guidelines for comprehensive testing'
            }
          ]
        },
        {
          title: 'Output Options',
          content: 'Control how results are displayed and saved',
          codeBlocks: [
            {
              title: 'Save JSON Report',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --output report.json',
              description: 'Save detailed results to a JSON file'
            },
            {
              title: 'Multiple Formats',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --format both --output report.json',
              description: 'Show console output and save JSON report'
            }
          ],
          tips: [
            'Use --quiet for minimal output in CI/CD pipelines',
            'JSON reports contain more detailed information than console output',
            'Screenshots can be captured with --screenshot flag'
          ]
        },
        {
          title: 'Advanced Options',
          content: 'Fine-tune scanning behavior for specific needs',
          codeBlocks: [
            {
              title: 'Custom Viewport',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --viewport 1920x1080 --timeout 60000',
              description: 'Test with specific viewport size and extended timeout'
            },
            {
              title: 'Strict Scoring',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --profile strict --min-severity serious',
              description: 'Use strict scoring and only report serious+ issues'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'E-commerce Site Scan',
          description: 'Scan an e-commerce product page',
          command: 'a11yanalyze scan https://shop.example.com/product/123 --include-aaa --screenshot',
          explanation: 'Comprehensive scan including AAA guidelines with screenshot capture'
        },
        {
          title: 'Mobile Testing',
          description: 'Test mobile responsiveness',
          command: 'a11yanalyze scan https://example.com --viewport 375x667',
          explanation: 'Scan with mobile viewport (iPhone SE dimensions)'
        }
      ],
      seeAlso: ['crawling', 'configuration', 'scoring']
    },

    'crawling': {
      title: '🕷️ Website Crawling',
      description: 'Comprehensive site-wide accessibility analysis',
      sections: [
        {
          title: 'Basic Crawling',
          content: 'Start crawling websites for comprehensive accessibility analysis',
          codeBlocks: [
            {
              title: 'Simple Site Crawl',
              language: 'bash',
              code: 'a11yanalyze crawl https://example.com',
              description: 'Crawl up to 2 levels deep, maximum 50 pages'
            },
            {
              title: 'Deep Crawl',
              language: 'bash',
              code: 'a11yanalyze crawl https://example.com --depth 4 --max-pages 200',
              description: 'Deeper crawl with higher page limit'
            }
          ]
        },
        {
          title: 'Crawl Control',
          content: 'Control which pages are crawled and how',
          codeBlocks: [
            {
              title: 'Domain Restrictions',
              language: 'bash',
              code: 'a11yanalyze crawl https://example.com --allowed-domains example.com,blog.example.com',
              description: 'Only crawl specific domains'
            },
            {
              title: 'Path Filtering',
              language: 'bash',
              code: 'a11yanalyze crawl https://example.com --exclude-paths /admin,/api --include-paths /products',
              description: 'Exclude admin/API paths, focus on product pages'
            }
          ],
          tips: [
            'Use --respect-robots to honor robots.txt directives',
            'Adjust --concurrency based on server capacity',
            'Use --delay to be respectful of server resources'
          ]
        },
        {
          title: 'Performance Tuning',
          content: 'Optimize crawling performance and resource usage',
          codeBlocks: [
            {
              title: 'High Performance',
              language: 'bash',
              code: 'a11yanalyze crawl https://example.com --concurrency 5 --delay 500',
              description: 'Faster crawling with higher concurrency'
            },
            {
              title: 'Conservative Crawling',
              language: 'bash',
              code: 'a11yanalyze crawl https://example.com --concurrency 1 --delay 2000 --respect-robots',
              description: 'Gentle crawling that respects server resources'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'Corporate Website Audit',
          description: 'Comprehensive audit of a corporate website',
          command: 'a11yanalyze crawl https://company.com --depth 3 --max-pages 100 --output audit-report.json',
          explanation: 'Deep crawl for comprehensive accessibility audit with detailed reporting'
        },
        {
          title: 'Blog Analysis',
          description: 'Analyze a blog while respecting resources',
          command: 'a11yanalyze crawl https://blog.example.com --include-paths /posts --delay 1000 --respect-robots',
          explanation: 'Focus on blog posts with respectful crawling behavior'
        }
      ],
      seeAlso: ['scanning', 'configuration', 'best-practices']
    },

    'configuration': {
      title: '⚙️ Configuration Guide',
      description: 'Complete guide to configuring A11Y Analyze for your needs',
      sections: [
        {
          title: 'Configuration Sources',
          content: 'Multiple ways to configure the tool, in priority order',
          codeBlocks: [
            {
              title: 'CLI Arguments (Highest Priority)',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --wcag-level AAA --timeout 45000',
              description: 'Command-line arguments override all other settings'
            },
            {
              title: 'Environment Variables',
              language: 'bash',
              code: 'export A11Y_WCAG_LEVEL=AAA\nexport A11Y_TIMEOUT=45000\na11yanalyze scan https://example.com',
              description: 'Environment variables for deployment configuration'
            },
            {
              title: 'Configuration File',
              language: 'json',
              code: '{\n  "scanning": {\n    "wcagLevel": "AAA",\n    "timeout": 45000\n  },\n  "output": {\n    "format": "json",\n    "verbose": true\n  }\n}',
              description: 'Save as .a11yanalyzerc.json for project configuration'
            }
          ]
        },
        {
          title: 'Configuration Files',
          content: 'Different configuration file formats and locations',
          codeBlocks: [
            {
              title: 'JSON Configuration',
              language: 'bash',
              code: '# Create configuration file\necho \'{"scanning": {"wcagLevel": "AAA"}}\' > .a11yanalyzerc.json',
              description: 'JSON format configuration file'
            },
            {
              title: 'JavaScript Configuration',
              language: 'javascript',
              code: 'module.exports = {\n  scanning: {\n    wcagLevel: "AAA",\n    includeAAA: true\n  },\n  browser: {\n    viewport: { width: 1920, height: 1080 }\n  }\n};',
              description: 'Save as .a11yanalyzerc.js or a11yanalyze.config.js'
            },
            {
              title: 'Package.json Integration',
              language: 'json',
              code: '{\n  "name": "my-project",\n  "a11yanalyze": {\n    "scanning": {\n      "wcagLevel": "AAA"\n    }\n  }\n}',
              description: 'Add configuration to existing package.json'
            }
          ]
        },
        {
          title: 'Generate Configuration',
          content: 'Create sample configuration files',
          codeBlocks: [
            {
              title: 'Generate Sample Config',
              language: 'bash',
              code: 'a11yanalyze config --generate --format json > .a11yanalyzerc.json',
              description: 'Generate a sample configuration file (future feature)'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'Team Configuration',
          description: 'Set up consistent configuration for a development team',
          command: 'echo \'{"scanning": {"wcagLevel": "AA", "includeAAA": true}, "scoring": {"profile": "balanced"}}\' > .a11yanalyzerc.json',
          explanation: 'Create team configuration with AA compliance plus AAA warnings'
        }
      ],
      seeAlso: ['getting-started', 'best-practices']
    },

    'scoring': {
      title: '📊 Scoring System',
      description: 'Understanding and customizing accessibility scoring',
      sections: [
        {
          title: 'Scoring Profiles',
          content: 'Pre-configured scoring approaches for different use cases',
          codeBlocks: [
            {
              title: 'Balanced Profile (Default)',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --profile balanced',
              description: 'Fair scoring suitable for most projects'
            },
            {
              title: 'Strict Profile',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --profile strict',
              description: 'Strict scoring for compliance-critical applications'
            },
            {
              title: 'Lenient Profile',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --profile lenient',
              description: 'More forgiving scoring for development environments'
            }
          ]
        },
        {
          title: 'Score Interpretation',
          content: 'Understanding what accessibility scores mean',
          tips: [
            '90-100: Excellent accessibility (few or no issues)',
            '80-89: Good accessibility (minor issues to address)',
            '70-79: Fair accessibility (several issues need attention)',
            '60-69: Poor accessibility (significant issues present)',
            '0-59: Critical accessibility problems (immediate attention needed)'
          ]
        },
        {
          title: 'Customizing Scoring',
          content: 'Fine-tune scoring for your specific needs',
          codeBlocks: [
            {
              title: 'Severity Filtering',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --min-severity serious',
              description: 'Only consider serious and critical issues in scoring'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'Government Compliance',
          description: 'Strict scoring for government accessibility compliance',
          command: 'a11yanalyze scan https://gov-site.example.com --profile strict --wcag-level AAA',
          explanation: 'Use strict scoring with AAA compliance for government standards'
        }
      ],
      seeAlso: ['scanning', 'configuration']
    },

    'reporting': {
      title: '📋 Reports and Output',
      description: 'Generate and customize accessibility reports',
      sections: [
        {
          title: 'Output Formats',
          content: 'Choose the right output format for your needs',
          codeBlocks: [
            {
              title: 'Console Output',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --format console',
              description: 'Human-readable output in terminal'
            },
            {
              title: 'JSON Report',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --format json --output report.json',
              description: 'Machine-readable JSON format for integration'
            },
            {
              title: 'Both Formats',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --format both --output report.json',
              description: 'Show console output and save JSON report'
            }
          ]
        },
        {
          title: 'Report Contents',
          content: 'Understanding what\'s included in reports',
          tips: [
            'Executive summary with overall score and issue counts',
            'Detailed issue listings with WCAG references',
            'Remediation guidance and help URLs',
            'Performance metrics and scan metadata',
            'Compliance breakdown by WCAG level'
          ]
        },
        {
          title: 'Error Logging',
          content: 'Track and debug scanning issues',
          codeBlocks: [
            {
              title: 'Export Error Log',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --export-errors errors.log',
              description: 'Save technical errors and warnings to file'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'CI/CD Integration',
          description: 'Generate reports suitable for continuous integration',
          command: 'a11yanalyze scan https://staging.example.com --format json --quiet --output ci-report.json',
          explanation: 'Quiet mode with JSON output perfect for automated pipelines'
        }
      ],
      seeAlso: ['scanning', 'troubleshooting']
    },

    'troubleshooting': {
      title: '🔧 Troubleshooting',
      description: 'Solve common issues and get help when things go wrong. Includes timeout, error, and debug guidance.',
      sections: [
        {
          title: 'Common Issues',
          content: 'Solutions to frequently encountered problems. Includes timeout, error, and debug tips.',
          tips: [
            'Timeout errors: Increase --timeout value for slow pages',
            'Network errors: Check internet connection and URL accessibility',
            'Permission errors: Ensure proper file write permissions for output',
            'Memory issues: Reduce --concurrency or --max-pages for large sites',
            'For API and integration help, see: a11yanalyze help api'
          ],
          warnings: [
            'Some sites block automated tools - check robots.txt',
            'CAPTCHA or login requirements may prevent scanning',
            'Heavy JavaScript sites may need longer timeouts',
            'If you see ambiguous roles in screen reader simulation, review the Known Limitations section in the README.'
          ]
        },
        {
          title: 'Debugging Options',
          content: 'Get more information when things go wrong. Use debug and verbose output, and export error logs.',
          codeBlocks: [
            {
              title: 'Debug Mode',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --debug',
              description: 'Enable detailed debug logging'
            },
            {
              title: 'Verbose Output',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --verbose --export-errors debug.log',
              description: 'Verbose mode with error log export'
            },
            {
              title: 'Timeout Example',
              language: 'bash',
              code: 'a11yanalyze scan https://slow-site.com --timeout 120000',
              description: 'Increase timeout for slow-loading sites'
            }
          ]
        },
        {
          title: 'Getting Help',
          content: 'When you need additional support. See the README or use the API help topic.',
          tips: [
            'Use --help for command-specific guidance',
            'Check error logs for detailed error information',
            'Verify URL accessibility in a regular browser first',
            'Test with simpler pages to isolate issues',
            'See also: a11yanalyze help api'
          ]
        }
      ],
      examples: [
        {
          title: 'Debug Failed Scan',
          description: 'Diagnose why a scan is failing',
          command: 'a11yanalyze scan https://problematic-site.com --debug --timeout 60000 --export-errors debug.log',
          explanation: 'Enable debug mode with extended timeout and error logging'
        }
      ],
      seeAlso: ['configuration', 'best-practices', 'api']
    },

    'best-practices': {
      title: '✨ Best Practices',
      description: 'Expert tips for effective accessibility testing',
      sections: [
        {
          title: 'Testing Strategy',
          content: 'Develop an effective accessibility testing approach',
          tips: [
            'Start with key user journeys and critical pages',
            'Test both desktop and mobile viewports',
            'Include AAA guidelines for comprehensive coverage',
            'Regular testing throughout development, not just at the end',
            'Combine automated testing with manual accessibility review'
          ]
        },
        {
          title: 'Performance Tips',
          content: 'Optimize scanning for speed and efficiency',
          tips: [
            'Use appropriate concurrency levels (3-5 for most sites)',
            'Respect server resources with reasonable delays',
            'Filter paths to focus on important content',
            'Use caching and incremental scanning for large sites'
          ]
        },
        {
          title: 'CI/CD Integration',
          content: 'Integrate accessibility testing into your development workflow',
          codeBlocks: [
            {
              title: 'GitHub Actions Example',
              language: 'yaml',
              code: 'name: Accessibility Test\non: [push, pull_request]\njobs:\n  a11y-test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Test Accessibility\n        run: |\n          npx a11yanalyze scan ${{ env.SITE_URL }} \\\n            --format json \\\n            --output a11y-report.json \\\n            --quiet',
              description: 'Example GitHub Actions workflow'
            }
          ]
        },
        {
          title: 'Team Collaboration',
          content: 'Share accessibility testing across your team',
          tips: [
            'Create shared configuration files in your repository',
            'Document accessibility standards and expectations',
            'Set up automated reporting and notifications',
            'Train team members on interpreting results',
            'Integrate with existing bug tracking systems'
          ]
        }
      ],
      examples: [
        {
          title: 'Comprehensive Site Audit',
          description: 'Complete accessibility audit process',
          command: 'a11yanalyze crawl https://example.com --depth 3 --include-aaa --format both --output full-audit.json --export-errors audit-errors.log',
          explanation: 'Thorough site audit with comprehensive reporting'
        }
      ],
      seeAlso: ['configuration', 'crawling', 'reporting']
    },

    'examples': {
      title: '💡 Practical Examples',
      description: 'Real-world usage examples and common scenarios. Includes e-commerce, mobile, government, and troubleshooting.',
      sections: [
        {
          title: 'E-commerce Testing',
          content: 'Test online shopping experiences for accessibility. Example: scan a product page or checkout flow.',
          codeBlocks: [
            {
              title: 'Product Page Test',
              language: 'bash',
              code: 'a11yanalyze scan https://shop.example.com/product/laptop-123 --viewport 1920x1080 --screenshot',
              description: 'Test product page with desktop viewport and screenshots'
            },
            {
              title: 'Checkout Flow Test',
              language: 'bash',
              code: 'a11yanalyze crawl https://shop.example.com --include-paths /cart,/checkout --depth 2',
              description: 'Focus on critical checkout user journey'
            }
          ]
        },
        {
          title: 'Content Management',
          content: 'Test CMS-generated content for accessibility. Example: scan a blog or documentation site.',
          codeBlocks: [
            {
              title: 'Blog Analysis',
              language: 'bash',
              code: 'a11yanalyze crawl https://blog.example.com --include-paths /posts --max-pages 20',
              description: 'Sample blog posts for content accessibility'
            },
            {
              title: 'Documentation Site',
              language: 'bash',
              code: 'a11yanalyze crawl https://docs.example.com --exclude-paths /api --depth 4',
              description: 'Comprehensive documentation accessibility audit'
            }
          ]
        },
        {
          title: 'Mobile-First Testing',
          content: 'Test responsive and mobile experiences. Example: scan with mobile viewport.',
          codeBlocks: [
            {
              title: 'Mobile Viewport Test',
              language: 'bash',
              code: 'a11yanalyze scan https://example.com --viewport 375x667 --profile strict',
              description: 'Test mobile experience with strict accessibility standards'
            },
            {
              title: 'Responsive Breakpoints',
              language: 'bash',
              code: 'for size in "375x667" "768x1024" "1920x1080"; do\n  a11yanalyze scan https://example.com --viewport $size --output "report-${size}.json"\ndone',
              description: 'Test multiple responsive breakpoints'
            }
          ]
        },
        {
          title: 'Troubleshooting Example',
          content: 'Diagnose and resolve scan issues. Example: scan with debug and extended timeout.',
          codeBlocks: [
            {
              title: 'Debug Failed Scan',
              language: 'bash',
              code: 'a11yanalyze scan https://problematic-site.com --debug --timeout 60000 --export-errors debug.log',
              description: 'Enable debug mode with extended timeout and error logging'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'Government Website Compliance',
          description: 'Ensure government site meets accessibility standards',
          command: 'a11yanalyze crawl https://gov.example.com --wcag-level AAA --profile strict --respect-robots --output compliance-report.json',
          explanation: 'Comprehensive compliance testing with strict standards'
        },
        {
          title: 'Educational Platform Testing',
          description: 'Test learning management system accessibility',
          command: 'a11yanalyze crawl https://lms.example.com --include-paths /courses,/assignments --exclude-paths /admin --max-pages 100',
          explanation: 'Focus on student-facing content while excluding admin areas'
        }
      ],
      seeAlso: ['scanning', 'crawling', 'best-practices', 'troubleshooting']
    },

    'api': {
      title: '🔌 Integration & API',
      description: 'Integrate A11Y Analyze with other tools and workflows. Includes exit code, JSON, and environment variable documentation.',
      sections: [
        {
          title: 'Exit Codes',
          content: 'Understanding exit codes for automation. Use exit codes in CI/CD pipelines to fail builds on issues.',
          tips: [
            'Exit code 0: Scan completed successfully, no critical issues',
            'Exit code 1: Scan completed but found accessibility issues',
            'Exit code 2: Scan failed due to configuration or technical errors',
            'Use exit codes in CI/CD pipelines to fail builds on issues',
            'See also: a11yanalyze help troubleshooting'
          ]
        },
        {
          title: 'JSON Output Format',
          content: 'Structure of JSON reports for programmatic use. See the README for a full schema.',
          codeBlocks: [
            {
              title: 'Basic JSON Structure',
              language: 'json',
              code: '{\n  "summary": {\n    "score": 85,\n    "totalIssues": 12,\n    "criticalIssues": 0\n  },\n  "issues": [\n    {\n      "id": "color-contrast",\n      "wcagReference": "1.4.3",\n      "severity": "serious",\n      "description": "Text has insufficient color contrast"\n    }\n  ]\n}',
              description: 'Simplified JSON report structure'
            }
          ]
        },
        {
          title: 'Environment Variables',
          content: 'Complete list of supported environment variables. See the README for more.',
          codeBlocks: [
            {
              title: 'Common Environment Variables',
              language: 'bash',
              code: '# Core settings\nexport A11Y_WCAG_LEVEL=AA\nexport A11Y_TIMEOUT=30000\nexport A11Y_OUTPUT_FORMAT=json\n\n# Browser settings\nexport A11Y_HEADLESS=true\nexport A11Y_VIEWPORT_WIDTH=1280\nexport A11Y_VIEWPORT_HEIGHT=720\n\n# Crawling settings\nexport A11Y_MAX_DEPTH=2\nexport A11Y_MAX_PAGES=50\nexport A11Y_CONCURRENCY=3',
              description: 'Environment variables for deployment configuration'
            }
          ]
        }
      ],
      examples: [
        {
          title: 'Jenkins Pipeline Integration',
          description: 'Use in Jenkins CI/CD pipeline',
          command: 'a11yanalyze scan $BUILD_URL --format json --output accessibility-report.json && archive accessibility-report.json',
          explanation: 'Scan build deployment and archive results as build artifact'
        },
        {
          title: 'API/JSON Output Example',
          description: 'Use JSON output for integration with other tools',
          command: 'a11yanalyze scan https://example.com --format json --output api-report.json',
          explanation: 'Generates a machine-readable JSON report for API consumption'
        }
      ],
      seeAlso: ['configuration', 'reporting', 'best-practices', 'troubleshooting']
    }
  };

  /**
   * Display comprehensive help for a specific topic
   */
  static showHelp(category: HelpCategory): void {
    const content = this.HELP_CONTENT[category];
    if (!content) {
      console.error(chalk.red(`Help topic '${category}' not found`));
      return;
    }

    console.log('\n' + chalk.bold.cyan(content.title));
    console.log(chalk.gray('─'.repeat(process.stdout.columns || 80)));
    console.log(chalk.white(content.description) + '\n');

    content.sections.forEach(section => {
      console.log(chalk.bold.yellow(`📍 ${section.title}`));
      console.log(chalk.white(section.content) + '\n');

      // Display code blocks
      if (section.codeBlocks && section.codeBlocks.length > 0) {
        section.codeBlocks.forEach(block => {
          console.log(chalk.bold(`  ${block.title}:`));
          if (block.description) {
            console.log(chalk.gray(`  ${block.description}`));
          }
          
          const formattedCode = this.formatCodeBlock(block.code, block.language);
          console.log(formattedCode + '\n');
        });
      }

      // Display tips
      if (section.tips && section.tips.length > 0) {
        console.log(chalk.bold.green('💡 Tips:'));
        section.tips.forEach(tip => {
          console.log(chalk.green(`  • ${tip}`));
        });
        console.log('');
      }

      // Display warnings
      if (section.warnings && section.warnings.length > 0) {
        console.log(chalk.bold.yellow('⚠️  Warnings:'));
        section.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
        console.log('');
      }
    });

    // Display examples
    if (content.examples && content.examples.length > 0) {
      console.log(chalk.bold.magenta('📚 Examples:'));
      content.examples.forEach(example => {
        console.log(chalk.bold(`  ${example.title}:`));
        console.log(chalk.white(`  ${example.description}`));
        console.log(chalk.cyan(`  $ ${example.command}`));
        console.log(chalk.gray(`  ${example.explanation}`));
        if (example.expectedOutput) {
          console.log(chalk.dim(`  Expected: ${example.expectedOutput}`));
        }
        console.log('');
      });
    }

    // Display see also
    if (content.seeAlso && content.seeAlso.length > 0) {
      console.log(chalk.bold.blue('🔗 See Also:'));
      const seeAlsoText = content.seeAlso.map(topic => `a11yanalyze help ${topic}`).join(', ');
      console.log(chalk.blue(`  ${seeAlsoText}\n`));
    }
  }

  /**
   * Display help topic menu
   */
  static showTopicMenu(): void {
    console.log('\n' + chalk.bold.cyan('📚 A11Y Analyze Help Topics'));
    console.log(chalk.gray('─'.repeat(process.stdout.columns || 80)));
    console.log(chalk.white('Choose a topic to learn more:\n'));

    const topics: Array<{ category: HelpCategory; emoji: string; description: string }> = [
      { category: 'getting-started', emoji: '🚀', description: 'Quick start guide and basic concepts' },
      { category: 'scanning', emoji: '🔍', description: 'Single page accessibility scanning' },
      { category: 'crawling', emoji: '🕷️', description: 'Site-wide accessibility analysis' },
      { category: 'configuration', emoji: '⚙️', description: 'Configuration files and options' },
      { category: 'scoring', emoji: '📊', description: 'Understanding accessibility scores' },
      { category: 'reporting', emoji: '📋', description: 'Reports and output formats' },
      { category: 'troubleshooting', emoji: '🔧', description: 'Common issues and solutions' },
      { category: 'best-practices', emoji: '✨', description: 'Expert tips and recommendations' },
      { category: 'examples', emoji: '💡', description: 'Real-world usage examples' },
      { category: 'api', emoji: '🔌', description: 'Integration and automation' }
    ];

    topics.forEach(topic => {
      console.log(chalk.cyan(`  ${topic.emoji} ${topic.category.padEnd(16)} ${chalk.gray(topic.description)}`));
    });

    console.log('\n' + chalk.bold('Usage:'));
    console.log(chalk.white('  a11yanalyze help <topic>                 Show detailed help for a topic'));
    console.log(chalk.white('  a11yanalyze scan --help                  Show scan command help'));
    console.log(chalk.white('  a11yanalyze crawl --help                 Show crawl command help'));
    console.log('\n' + chalk.bold('Examples:'));
    console.log(chalk.cyan('  a11yanalyze help getting-started         Learn the basics'));
    console.log(chalk.cyan('  a11yanalyze help examples                See practical examples'));
    console.log(chalk.cyan('  a11yanalyze help configuration           Configure the tool\n'));
  }

  /**
   * Show quick tips based on command context
   */
  static showQuickTips(command?: string): void {
    const tips: Record<string, string[]> = {
      scan: [
        'Start with: a11yanalyze scan https://your-site.com',
        'Use --verbose for detailed progress information',
        'Save results: --output report.json',
        'Test mobile: --viewport 375x667'
      ],
      crawl: [
        'Basic crawl: a11yanalyze crawl https://your-site.com',
        'Control depth: --depth 3 --max-pages 100',
        'Filter paths: --include-paths /products --exclude-paths /admin',
        'Be respectful: --delay 1000 --respect-robots'
      ],
      default: [
        'Get started: a11yanalyze help getting-started',
        'See examples: a11yanalyze help examples',
        'Quick scan: a11yanalyze scan https://example.com',
        'Full help: a11yanalyze help'
      ]
    };

    const tipList = tips[command || 'default'];
    
    if (!tipList) {
      console.log('\n' + chalk.yellow('No tips available for this command.'));
      console.log(chalk.gray('Use: a11yanalyze tips (without arguments) for general tips'));
      return;
    }
    
    console.log('\n' + chalk.bold.green('💡 Quick Tips:'));
    tipList.forEach(tip => {
      console.log(chalk.green(`  • ${tip}`));
    });
    console.log('');
  }

  /**
   * Generate configuration file with comments
   */
  static generateConfigTemplate(format: 'json' | 'js' = 'json'): string {
    const configManager = new ConfigManager();
    
    if (format === 'js') {
      return `// A11Y Analyze Configuration
// Save as .a11yanalyzerc.js or a11yanalyze.config.js

module.exports = ${JSON.stringify(ConfigManager.getDefaultConfig(), null, 2)};

// Configuration options:
// - scanning: WCAG levels, timeouts, rules
// - browser: Headless mode, viewport, user agent
// - crawling: Depth limits, concurrency, domain restrictions
// - output: Formats, verbosity, colors
// - scoring: Profiles, penalties, bonuses
// - issues: Processing options, remediation
// - performance: Circuit breakers, retries, memory limits
// - advanced: Experimental features, caching`;
    }

    return JSON.stringify({
      $schema: "https://schemas.a11yanalyze.dev/config.json",
      ...ConfigManager.getDefaultConfig()
    }, null, 2);
  }

  /**
   * Format code blocks with syntax highlighting
   * @private
   */
  private static formatCodeBlock(code: string, language: string): string {
    const indent = '  ';
    const formattedCode = code.split('\n').map(line => indent + line).join('\n');
    
    switch (language) {
      case 'bash':
        return chalk.green(formattedCode);
      case 'json':
        return chalk.blue(formattedCode);
      case 'javascript':
        return chalk.yellow(formattedCode);
      case 'yaml':
        return chalk.magenta(formattedCode);
      default:
        return chalk.white(formattedCode);
    }
  }

  /**
   * Search help content for keywords
   */
  static searchHelp(query: string): void {
    const results: Array<{ category: HelpCategory; matches: string[] }> = [];
    const queryLower = query.toLowerCase();

    Object.entries(this.HELP_CONTENT).forEach(([category, content]) => {
      const matches: string[] = [];
      
      // Search title and description
      if (content.title.toLowerCase().includes(queryLower)) {
        matches.push(`Title: ${content.title}`);
      }
      if (content.description.toLowerCase().includes(queryLower)) {
        matches.push(`Description: ${content.description}`);
      }
      
      // Search sections
      content.sections.forEach(section => {
        if (section.title.toLowerCase().includes(queryLower)) {
          matches.push(`Section: ${section.title}`);
        }
        if (section.content.toLowerCase().includes(queryLower)) {
          matches.push(`Content: ${section.title}`);
        }
      });

      // Search examples
      if (content.examples) {
        content.examples.forEach(example => {
          if (example.title.toLowerCase().includes(queryLower) ||
              example.description.toLowerCase().includes(queryLower) ||
              example.command.toLowerCase().includes(queryLower)) {
            matches.push(`Example: ${example.title}`);
          }
        });
      }

      if (matches.length > 0) {
        results.push({ category: category as HelpCategory, matches });
      }
    });

    if (results.length === 0) {
      console.log(chalk.yellow(`No help topics found for "${query}"`));
      console.log(chalk.gray('Try: a11yanalyze help'));
      return;
    }

    console.log('\n' + chalk.bold.cyan(`🔍 Search Results for "${query}"`));
    console.log(chalk.gray('─'.repeat(process.stdout.columns || 80)));

    results.forEach(result => {
      console.log(chalk.bold.white(`📖 ${result.category}`));
      result.matches.forEach(match => {
        console.log(chalk.gray(`  • ${match}`));
      });
      console.log(chalk.dim(`  View: a11yanalyze help ${result.category}\n`));
    });
  }
} 