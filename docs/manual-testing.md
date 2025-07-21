# Manual Accessibility Testing Guide

Manual testing is essential to ensure real-world accessibility, especially for issues that cannot be fully detected by automated tools. Use this guide alongside the automated results from A11Y Analyze.

---

## 1. Manual Testing Workflow

1. **Run the CLI tool** on your target page/component/site.
2. **Review the automated report** for issues, warnings, and suggestions.
3. **Use the `manual-guide` command** to step through each WCAG 2.2 criterion interactively:
   - Mark each as Pass/Fail/N/A
   - Add notes and screenshots as needed
4. **Supplement with the checklist below** for areas not fully covered by automation.

---

## 2. Manual Testing Checklist

### A. Keyboard Accessibility
- [ ] Can all interactive elements be reached and operated using only the keyboard (Tab, Shift+Tab, Enter, Space, Arrow keys)?
- [ ] Is the tab order logical and intuitive?
- [ ] Are visible focus indicators present and easy to see?
- [ ] Can you skip to main content using a keyboard shortcut?

### B. Screen Reader Accessibility
- [ ] Use a screen reader (NVDA, JAWS, VoiceOver) to navigate the page/component.
- [ ] Are all controls and images announced with meaningful names/roles/states?
- [ ] Are dynamic changes (modals, alerts, live regions) announced?
- [ ] Is the reading order logical?

### C. Visual and Color Accessibility
- [ ] Is there sufficient color contrast for text and UI elements?
- [ ] Can all content be read without relying on color alone?
- [ ] Are focus indicators visible for all interactive elements?

### D. Cognitive Accessibility
- [ ] Is the language clear, concise, and free of jargon?
- [ ] Are instructions and error messages easy to understand?
- [ ] Is the reading level appropriate for your audience?
- [ ] Are abbreviations and acronyms explained?

### E. Other
- [ ] Does the page/component work at different zoom levels and on various devices?
- [ ] Are ARIA attributes used correctly and only when necessary?
- [ ] Are there any time limits or auto-updating content that could affect users?

---

## 3. Additional Resources
- [W3C Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
- [Deque University Manual Testing](https://dequeuniversity.com/manual-testing)
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [A11Y Project Checklist](https://www.a11yproject.com/checklist/)

---

**Tip:** Always supplement automated results with manual review and real user testing for best accessibility outcomes. 