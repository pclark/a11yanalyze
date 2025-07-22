# Design System VPAT2 Form 2025 - Button Component

| Criterion | Name | Status | Remarks/Explanations |
|-----------|------|--------|----------------------|
| 1.1.1 | Image missing alt text | Supports | Add descriptive alt text to the image [More info](https://help.example.com/alt-text) |
| 2.1.1 | Keyboard navigation issue | Does Not Support | Button not reachable by Tab key [More info](https://help.example.com/keyboard) |

**Summary:**  
- Supports: 1  
- Partially Supports: 0  
- Does Not Support: 1  
- Not Applicable: 0  
- Not Evaluated: 0  

**Keyboard Navigation Findings:**
- Issues: 2
- Unreachable Elements: 1
- Focus Traps: 0
- Missing Focus Indicators: 1
  - Focus Management/Indicator Issues:
    - Missing visible focus indicator on button#submit
    - Focusable but not interactable: <button id="submit" ...>

**Screen Reader Simulation Findings:**
- Findings: 2
- Missing Names: 1
- Ambiguous Roles: 0
- Skipped Elements: 0
  - Element with role 'button' missing accessible name at document > button

**Cognitive Accessibility Findings:**
- Flesch-Kincaid reading level: 9.2 (average)
- Jargon terms detected: None
- Abbreviations detected: 0 