# A11Y Analyze – Accessibility Testing & VPAT Automation

A11Y Analyze is a comprehensive CLI tool for automated and manual accessibility testing, VPAT/Section 508 reporting, and design system/component audits.

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

---

## 💡 Best Practices

- Test early and often.
- Combine automated and manual testing.
- Use VPAT/Section 508 reports for compliance and procurement.
- Act on “Does Not Support” and “Partially Supports” findings.

---

## 🔗 Integration

- **CI/CD:** Add to your pipeline for automated checks.
- **Design System:** Use batch audits for all components.
- **Product Teams:** Use for web apps, static sites, and new features.

---

## 🆘 Troubleshooting & FAQ

- See the [Testing Guide](#) and [FAQ](#) for help.
- For bugs or support, contact the accessibility team or open an issue.

---

## 📚 Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Section 508 Guidelines](https://www.section508.gov/manage/laws-and-policies/)
- [A11Y Project](https://www.a11yproject.com/)

---

**Ready to get started?**  
Run your first scan, review the sample reports, and use the checklist to ensure your components and apps are accessible to all!