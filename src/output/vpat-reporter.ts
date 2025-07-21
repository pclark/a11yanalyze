import { ScanResult, AccessibilityIssue } from '../types';
import Handlebars from 'handlebars';
// Register built-in Handlebars helpers for template customization
Handlebars.registerHelper('formatDate', function(date: string | Date, format?: string) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
});
Handlebars.registerHelper('ifEquals', function(this: any, a: any, b: any, options: Handlebars.HelperOptions) {
  return a === b ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper('toUpper', function(str: string) {
  return (str || '').toUpperCase();
});
Handlebars.registerHelper('toLower', function(str: string) {
  return (str || '').toLowerCase();
});
Handlebars.registerHelper('toTitle', function(str: string) {
  return (str || '').replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
});
Handlebars.registerHelper('pluralize', function(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural || singular + 's');
});
Handlebars.registerHelper('ifOdd', function(this: any, index: number, options: Handlebars.HelperOptions) {
  return index % 2 === 1 ? options.fn(this) : options.inverse(this);
});
// Export a function to allow user-defined helpers in the future
export function registerCustomHelpers(helpers: Record<string, Handlebars.HelperDelegate>) {
  Object.entries(helpers).forEach(([name, fn]) => Handlebars.registerHelper(name, fn));
}

export interface VpatCriterion {
  id: string;
  name: string;
  status: 'Supports' | 'Partially Supports' | 'Does Not Support' | 'Not Applicable' | 'Not Evaluated';
  remarks: string;
}

export interface VpatReport {
  component: string;
  vpatVersion: string;
  criteria: VpatCriterion[];
  summary: {
    supports: number;
    partiallySupports: number;
    doesNotSupport: number;
    notApplicable: number;
    notEvaluated: number;
  };
}

export class VpatReporter {
  static generateJsonReport(component: string, scanResult: any, vpatVersion = 'TastySoft Design System VPAT2 Form 2025'): VpatReport {
    // Map scan results to VPAT criteria (stub: real mapping would be more detailed)
    const criteria: VpatCriterion[] = scanResult.issues.map((issue: AccessibilityIssue) => ({
      id: issue.wcagReference || issue.id,
      name: issue.message || issue.id,
      status: VpatReporter.mapSeverityToStatus(issue.severity),
      remarks: (issue.remediation || '') + (issue.helpUrl ? ` [More info](${issue.helpUrl})` : ''),
    }));
    // Add Not Applicable/Not Evaluated for missing criteria (stub)
    // ...
    const keyboardNav = scanResult.keyboardNavigation;
    const screenReaderSim = scanResult.screenReaderSimulation;
    const cognitive = scanResult.cognitiveAccessibility;
    const summary = VpatReporter.summarize(criteria);
    const report: any = { component, vpatVersion, criteria, summary };
    if (keyboardNav) {
      report.keyboardNavigation = keyboardNav;
    }
    if (screenReaderSim) {
      report.screenReaderSimulation = screenReaderSim;
    }
    if (cognitive) {
      report.cognitiveAccessibility = cognitive;
    }
    return report;
  }

  static generateMarkdownReport(report: any): string {
    let md = `# ${report.vpatVersion} - ${report.component}\n\n`;
    md += '| Criterion | Name | Status | Remarks/Explanations |\n';
    md += '|-----------|------|--------|----------------------|\n';
    for (const c of report.criteria) {
      md += `| ${c.id} | ${c.name} | ${c.status} | ${c.remarks.replace(/\n/g, ' ')} |\n`;
    }
    md += '\n**Summary:**  \n';
    md += `- Supports: ${report.summary.supports}  \n`;
    md += `- Partially Supports: ${report.summary.partiallySupports}  \n`;
    md += `- Does Not Support: ${report.summary.doesNotSupport}  \n`;
    md += `- Not Applicable: ${report.summary.notApplicable}  \n`;
    md += `- Not Evaluated: ${report.summary.notEvaluated}  \n`;
    if (report.keyboardNavigation) {
      md += '\n**Keyboard Navigation Findings:**\n';
      md += `- Issues: ${report.keyboardNavigation.issues.length}\n`;
      md += `- Unreachable Elements: ${report.keyboardNavigation.unreachableElements.length}\n`;
      md += `- Focus Traps: ${report.keyboardNavigation.focusTraps.length}\n`;
      md += `- Missing Focus Indicators: ${report.keyboardNavigation.missingFocusIndicators.length}\n`;
      // Focus management details
      const focusRelated = report.keyboardNavigation.issues.filter((i: string) => i.includes('focus') || i.includes('indicator'));
      if (focusRelated.length > 0) {
        md += '\n  - Focus Management/Indicator Issues:';
        focusRelated.forEach((issue: string) => {
          md += `\n    - ${issue}`;
        });
      }
      if (report.keyboardNavigation.issues.length > 0) {
        md += '\n';
        report.keyboardNavigation.issues.forEach((issue: string) => {
          md += `  - ${issue}\n`;
        });
      }
    }
    if (report.screenReaderSimulation) {
      md += '\n**Screen Reader Simulation Findings:**\n';
      md += `- Findings: ${report.screenReaderSimulation.summary.length}\n`;
      md += `- Missing Names: ${report.screenReaderSimulation.missingNames.length}\n`;
      md += `- Ambiguous Roles: ${report.screenReaderSimulation.ambiguousRoles.length}\n`;
      md += `- Skipped Elements: ${report.screenReaderSimulation.skippedElements.length}\n`;
      if (report.screenReaderSimulation.summary.length > 0) {
        md += '\n';
        report.screenReaderSimulation.summary.forEach((issue: string) => {
          md += `  - ${issue}\n`;
        });
      }
    }
    if (report.cognitiveAccessibility) {
      md += '\n**Cognitive Accessibility Findings:**\n';
      report.cognitiveAccessibility.summary.forEach((line: string) => {
        md += `- ${line}\n`;
      });
    }
    return md;
  }

  static generateCustomReport(report: VpatReport, template: string): string {
    const compiled = Handlebars.compile(template);
    return compiled(report);
  }

  static mapSeverityToStatus(severity: string): VpatCriterion['status'] {
    switch (severity) {
      case 'critical':
      case 'serious':
        return 'Does Not Support';
      case 'moderate':
        return 'Partially Supports';
      case 'minor':
      case 'warning':
        return 'Supports';
      default:
        return 'Supports';
    }
  }

  static summarize(criteria: VpatCriterion[]): VpatReport['summary'] {
    const summary = {
      supports: 0,
      partiallySupports: 0,
      doesNotSupport: 0,
      notApplicable: 0,
      notEvaluated: 0,
    };
    for (const c of criteria) {
      switch (c.status) {
        case 'Supports': summary.supports++; break;
        case 'Partially Supports': summary.partiallySupports++; break;
        case 'Does Not Support': summary.doesNotSupport++; break;
        case 'Not Applicable': summary.notApplicable++; break;
        case 'Not Evaluated': summary.notEvaluated++; break;
      }
    }
    return summary;
  }
} 