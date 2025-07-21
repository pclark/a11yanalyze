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

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, or open an [issue](https://github.com/pclark/a11yanalyze/issues) for bugs, feature requests, or questions.

---

**Ready to get started?**  
Run your first scan, review the sample reports, and use the checklist to ensure your components and apps are accessible to all!