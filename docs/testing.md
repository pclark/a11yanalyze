# Testing Strategy for A11Y Analyze

## Overview

A11Y Analyze is tested using a combination of automated unit/integration tests and manual accessibility/UX review. This ensures both the reliability of the codebase and the real-world effectiveness of accessibility features.

---

## 1. Automated Testing

### Test Framework
- **Jest** is used for all automated tests, with TypeScript support and a custom setup file.
- Test files are named with `.test.ts` and are located alongside their respective modules.

### Coverage
- **Test coverage is enforced at 80%+** for branches, functions, lines, and statements (see `jest.config.js`).
- There are hundreds of test cases covering:
  - Core scanning engine (page-scanner, rule-engine)
  - Site crawler
  - Output/reporting (JSON, console, scoring, error logger, issue processor)
  - CLI utilities (config manager, URL validator, help manager)
  - Integrations (Storybook, design system, pattern tester)
  - Manual testing workflows (guided/manual, keyboard automation)
  - Standards (WCAG 2.2, Section 508)

### Running Tests
- Run all tests:
  ```sh
  npm test
  ```
- Run with coverage:
  ```sh
  npm run test:coverage
  ```
- Watch mode:
  ```sh
  npm run test:watch
  ```

### What’s Covered
| Area                        | Automated? | Manual Needed? | Notes                                                      |
|-----------------------------|:----------:|:--------------:|------------------------------------------------------------|
| Core scanning engine        |    Yes     |      No        | Fully covered by unit/integration tests                    |
| Site crawling               |    Yes     |      No        | Most logic covered, but real-world crawling may vary       |
| Output/reporting            |    Yes     |      No        | JSON, console, scoring, error logging all tested           |
| CLI/config                  |    Yes     |      No        | Argument parsing, config merging, validation tested        |
| Storybook/HTML batch        |    Yes     |   Sometimes    | Batch logic tested, but real component rendering may vary  |
| Keyboard navigation sim     |    Yes     |   Sometimes    | Simulated, but not a full substitute for real user testing |
| Screen reader simulation    |    Yes     |   Sometimes    | Simulated, not a full AT replacement                      |
| Cognitive accessibility     | Partial    |     Yes        | Reading level/jargon detected, but human review needed     |
| Visual focus/contrast       | Partial    |     Yes        | Some checks, but visual review recommended                 |
| Jira/PR/CI integrations     | Partial    |     Yes        | May require environment-specific/manual testing            |

---

## 2. Manual Testing

Some aspects of accessibility and integration require manual or environment-specific testing and cannot be fully automated:

- **End-to-end browser behavior:**
  - Some real-world browser/assistive tech interactions (e.g., actual screen reader output, OS-level focus indicators) can only be partially simulated.
- **Manual accessibility checks:**
  - Guided/manual workflows and checklists are provided, but actual human judgment (e.g., “Is this alt text meaningful?”) is required.
- **Cognitive accessibility:**
  - Automated checks for reading level, jargon, and abbreviations are included, but true cognitive accessibility requires human review.
- **Integration with external systems:**
  - Integrations with Jira, PR comments, or custom CI/CD pipelines may require manual or environment-specific testing.
- **Visual regressions:**
  - The tool does not include screenshot-based visual regression testing for color contrast or focus indicators, which may require additional tools or manual review.
- **Real user assistive technology:**
  - No automated test can fully replicate the experience of users with screen readers, switch devices, or other AT.

### Manual Testing Checklist
- [ ] Run the CLI on a variety of real web pages and applications
- [ ] Review output for clarity, accuracy, and actionable guidance
- [ ] Use the manual audit workflow (`manual-guide` command) to step through WCAG criteria
- [ ] Test keyboard navigation and focus indicators visually
- [ ] Use a real screen reader (NVDA, JAWS, VoiceOver) to verify accessibility tree and announcements
- [ ] Review cognitive accessibility findings and supplement with human judgment
- [ ] Test integration with Jira, PR comments, and CI/CD in your environment

---

## 3. Limitations of Automated Testing

- Some accessibility issues require human judgment and cannot be fully automated.
- Always supplement automated results with manual review and real user testing for best results.

---

## 4. References
- See `src/__tests__/`, `src/scanner/*.test.ts`, `src/output/*.test.ts`, and other test files for examples.
- For more on manual accessibility testing, see:
  - [W3C Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
  - [Deque University Manual Testing](https://dequeuniversity.com/manual-testing) 