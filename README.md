# A11Y Analyze – Accessibility Testing & VPAT Automation

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pclark/a11yanalyze/actions)
[![Coverage Status](https://img.shields.io/badge/coverage-80%25%2B-brightgreen)](./coverage)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/badge/npm-latest-orange)](https://www.npmjs.com/package/a11yanalyze)

---

## 📑 Table of Contents
- [Quickstart](#-quickstart)
- [CLI Reference](#️-cli-reference)
- [Common Workflows](#-common-workflows)
- [Sample Reports](#-sample-reports)
- [Testing Guide](#-testing-guide)
- [Best Practices](#-best-practices)
- [Integration](#-integration)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [Resources](#-resources)
- [Contributing](#contributing)

---

## 🚀 Quickstart

1. **Install**
   ```bash
   npm install -g a11yanalyze
   ```

2. **Scan a Page**
   ```bash
   a11yanalyze scan https://example.com --output report.json --format both
   ```

3. **Batch Scan Storybook**
   ```bash
   a11yanalyze storybook-batch --storybook-url http://localhost:6006 --output-dir ./vpat-reports --format both
   ```

4. **Manual Audit**
   ```bash
   a11yanalyze manual-guide "Button Component"
   ```
   > **Tip:** After your first scan, use the [Manual Testing Guide](docs/manual-testing.md) to ensure real-world accessibility.

5. **Generate Checklist**
   ```bash
   a11yanalyze generate-checklist "Button Component" --format markdown
   ```

---

## 🛠️ CLI Reference

- `scan <url>`: Scan a single page
- `storybook-batch`: Batch scan all Storybook stories
- `html-batch`: Batch scan HTML files or URLs
- `manual-guide <target>`: Interactive manual audit
- `generate-checklist <target>`: Output manual testing checklist

See `a11yanalyze <command> --help` for all options.

> **See also:** [Testing Strategy](docs/testing.md) and [Manual Testing Guide](docs/manual-testing.md) for full testing instructions.

---

## 📋 Common Workflows

- **Storybook batch audit:**  
  `a11yanalyze storybook-batch --storybook-url ...`
- **Static HTML batch:**  
  `a11yanalyze html-batch --input-dir ...`
- **Manual VPAT audit:**  
  `a11yanalyze manual-guide ...`
- **Custom templates:**  
  `--template ./my-template.md`
- **Checklist generation:**  
  `a11yanalyze generate-checklist ...`
- **Manual review:**  
  After any automated scan, review the [Manual Testing Guide](docs/manual-testing.md) for additional checks.

---

## 📑 Sample Reports

- [VPAT/Section 508 Markdown Example](docs/sample-vpat.md)
- [VPAT/Section 508 JSON Example](docs/sample-vpat.json)
- [Manual Checklist Example](docs/sample-checklist.md)
- [Keyboard Navigation, Screen Reader, Cognitive Findings](docs/sample-vpat.md)

---

## 🧪 Testing Guide

- Run automated and manual tests as part of your workflow.
- Review “Findings” sections for actionable issues.
- Use the manual checklist for cognitive, focus, and content clarity checks.
- **See the full [Testing Strategy](docs/testing.md) and [Manual Testing Guide](docs/manual-testing.md) for details.**

### Example Test Output
```sh
$ npm test

> a11yanalyze@0.1.0 test
> jest

 PASS  src/scanner/page-scanner.test.ts
 PASS  src/output/json-reporter.test.ts
 PASS  src/cli/config-manager.test.ts
 ...
Test Suites: 25 passed, 25 total
Tests:       350 passed, 350 total
Snapshots:   0 total
Time:        12.345s
Ran all test suites.
```

---

## 💡 Best Practices

- Test early and often.
- Combine automated and manual testing.
- Use VPAT/Section 508 reports for compliance and procurement.
- Act on “Does Not Support” and “Partially Supports” findings.
- **Encourage real user testing:** Always supplement automated/manual checks with feedback from people with disabilities.

---

## 🔗 Integration

- **CI/CD:** Add to your pipeline for automated checks.
- **Design System:** Use batch audits for all components.
- **Product Teams:** Use for web apps, static sites, and new features.

---

## 🆘 Troubleshooting & FAQ

- See the [Testing Guide](docs/testing.md) and [FAQ](#) for help.
- For bugs or support, contact the accessibility team or open an [issue](https://github.com/pclark/a11yanalyze/issues).

---

## 📚 Resources

- [Testing Strategy for A11Y Analyze](docs/testing.md)
- [Manual Accessibility Testing Guide](docs/manual-testing.md)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Section 508 Guidelines](https://www.section508.gov/manage/laws-and-policies/)
- [A11Y Project](https://www.a11yproject.com/)

---

## WCAG & Section 508 Coverage

- **Automated Scanning:** This tool uses axe-core and custom rules to cover all testable criteria for:
  - **WCAG 2.1** (A, AA, AAA)
  - **WCAG 2.2** (including new 2.2 criteria)
  - **Section 508** (mapped to WCAG 2.0/2.1 AA)
- **VPAT Reporting:** Generates VPAT-style reports suitable for internal audits and procurement.
- **Manual Review Required:** Some criteria (e.g., color use, cognitive accessibility, content clarity) require human judgment and are flagged for manual review in the report.
- **Limitations:** Automated tools cannot fully assess all accessibility requirements. See the “Known Limitations” section for details.

For a full mapping of automated vs. manual checks, see [docs/wcag-coverage.md](docs/wcag-coverage.md).

---

## How This Tool Compares to Other Accessibility Scanners

This tool is built on the industry-standard **axe-core** engine, just like the most popular accessibility tools (axe DevTools, Pa11y, Accessibility Insights, Storybook a11y, etc.), ensuring high accuracy and coverage.

| Feature/Tool         | This Tool       | axe DevTools | Pa11y | Lighthouse | Accessibility Insights | Storybook a11y |
|----------------------|-----------------|--------------|-------|------------|-----------------------|----------------|
| **axe-core engine**  | ✅              | ✅           | ✅    | Partial*   | ✅                    | ✅             |
| **WCAG 2.1/2.2**     | ✅ (2.2)        | ✅ (2.2)     | ✅    | 2.1        | 2.1                   | 2.1            |
| **Section 508**      | ✅ (mapped)     | ✅           | ✅    | ❌         | ✅                    | ❌             |
| **VPAT reporting**   | ✅ (unique)     | ❌           | ❌    | ❌         | ❌                    | ❌             |
| **Storybook batch**  | ✅ (unique)     | ❌           | ❌    | ❌         | ❌                    | Partial        |
| **Component-level**  | ✅              | ❌           | ❌    | ❌         | ❌                    | ✅             |
| **CLI/CI support**   | ✅              | Enterprise   | ✅    | ✅         | ✅                    | Partial        |
| **Custom scoring**   | ✅              | ❌           | ❌    | Partial    | ❌                    | ❌             |
| **Manual workflow**  | ✅ (checklists) | Partial      | ❌    | ❌         | Partial               | ❌             |
| **Open source**      | ✅              | ❌           | ✅    | ✅         | ✅                    | ✅             |

> *Lighthouse uses a subset of axe-core rules, not the full engine.

### Unique Advantages
- **VPAT/Section 508/508+ Reporting:** Out-of-the-box, human-friendly, and machine-readable reports for compliance and procurement.
- **Storybook/Component Batch:** Scan all stories/components in a design system or library, not just pages.
- **Custom Scoring & Profiles:** Weighted scoring, warnings, and compliance breakdowns.
- **Manual/Hybrid Workflows:** Checklist generation, cognitive accessibility, and screen reader simulation.
- **Modern CLI & Output:** Markdown, JSON, and console output with remediation tips and grouping.

### What This Tool Reuses
- **axe-core**: For all automated rules and WCAG mapping.
- **Playwright**: For browser automation.
- **Handlebars**: For templated, customizable reports.

### What This Tool Adds
- **VPAT/Section 508 mapping and reporting**
- **Storybook integration and batch scanning**
- **Advanced scoring and compliance summaries**
- **Manual/interactive audit support**
- **Comprehensive output formats and onboarding docs**

---

## ⚠️ Known Limitations

- **Screen Reader Simulation:**
  - The tool may report many elements with ambiguous or missing roles, especially on complex or highly dynamic sites. This is a known limitation of automated accessibility tree analysis and does not always indicate a real-world screen reader problem. Review these findings in context and supplement with manual testing.
- **Crawling Edge Cases:**
  - Some sites with heavy client-side routing, authentication, or non-standard navigation may not be fully crawled or analyzed. Adjust crawl depth, concurrency, and filtering options as needed.
  - Pages requiring login, CAPTCHA, or special headers may not be accessible to the scanner.
- **Experimental Features:**
  - Some advanced features (e.g., cognitive accessibility analysis, keyboard simulation, custom rule integration) are experimental and may not cover all edge cases.
- **Error Handling:**
  - The tool aims to provide clear error messages and logs, but some rare network or browser errors may require manual investigation.
- **VPAT/Section 508 Output:**
  - Automated VPAT reports are a starting point. Always supplement with manual review and expert judgment for procurement or compliance.

For more details or to report issues, see the [Troubleshooting & FAQ](#-troubleshooting--faq) or open an [issue](https://github.com/pclark/a11yanalyze/issues).

---

## Scanning Authenticated Pages

Some web pages require login before they can be scanned for accessibility. This tool supports scanning authenticated pages by automating the login flow using Playwright.

### How It Works
- Use the CLI options `--login-url`, `--username`, and `--password` to provide login credentials.
- The tool will:
  1. Launch a browser and navigate to the login page.
  2. Fill in the username and password fields.
  3. Submit the login form and wait for navigation.
  4. Use the authenticated session to scan the target page(s).

### Example Usage
```sh
a11yanalyze scan --login-url https://example.com/login --username myuser --password mypass https://example.com/dashboard
```

- For more complex login flows (e.g., SSO, MFA), see the documentation for cookie/session injection or custom Playwright scripts.

> This is the recommended approach for most teams. If you encounter issues with login, please consult the troubleshooting section or contact support.

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, or open an [issue](https://github.com/pclark/a11yanalyze/issues) for bugs, feature requests, or questions.

---

**Ready to get started?**  
Run your first scan, review the sample reports, and use the checklist to ensure your components and apps are accessible to all!