# WCAG & Section 508 Coverage Details

This document provides a detailed mapping of which accessibility criteria are covered by automated scanning, which are partially covered, and which require manual review.

## Methodology
- **Automated:** Fully testable by axe-core or custom rules.
- **Partially Automated:** Some aspects are testable, but human judgment is needed for full compliance.
- **Manual Review:** Cannot be reliably tested by automation; flagged for human review in reports.

## WCAG 2.1/2.2 Coverage Table
| Success Criterion | Level | Automated | Partial | Manual |
|-------------------|-------|-----------|---------|--------|
| 1.1.1 Non-text Content | A | ✓ |   |   |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A |   |   | ✓ |
| 1.3.1 Info and Relationships | A | ✓ |   |   |
| 1.3.2 Meaningful Sequence | A | ✓ |   |   |
| 1.3.3 Sensory Characteristics | A |   | ✓ |   |
| ... | ... | ... | ... | ... |
| 2.4.7 Focus Visible | AA | ✓ |   |   |
| 2.5.7 Dragging Movements (2.2) | AA |   |   | ✓ |
| 3.1.5 Reading Level | AAA |   |   | ✓ |
| ... | ... | ... | ... | ... |

*Note: This is a sample. For a full list, see the [W3C Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/).*

## Section 508 Mapping
Section 508 criteria are mapped to WCAG 2.0/2.1 AA. Automated coverage is equivalent to the above table.

## VPAT Reporting
- Automated scan results are mapped to the appropriate VPAT sections.
- Manual review items are flagged in the VPAT report for human input.

## See Also
- [README.md](../README.md)
- [W3C WCAG Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Section 508 Guidelines](https://www.section508.gov/manage/laws-and-policies/) 