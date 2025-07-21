/**
 * WCAG 2.2 Success Criteria Database
 * Comprehensive database of WCAG success criteria with remediation guidance
 */

import { WCAGLevel } from '../types/wcag';

/**
 * WCAG Success Criterion detailed information
 */
export interface WCAGCriterion {
  /** Criterion number (e.g., "1.1.1") */
  number: string;
  /** WCAG conformance level */
  level: WCAGLevel;
  /** Criterion title */
  title: string;
  /** Detailed description */
  description: string;
  /** Intent and purpose */
  intent: string;
  /** Who benefits from this criterion */
  benefits: string[];
  /** Common failure patterns */
  commonFailures: string[];
  /** Remediation guidance */
  remediation: RemediationGuidance;
  /** Testing instructions */
  testing: TestingGuidance;
  /** Code examples */
  examples: CodeExample[];
  /** Related success criteria */
  relatedCriteria: string[];
  /** Techniques and resources */
  techniques: {
    sufficient: string[];
    advisory: string[];
    failures: string[];
  };
  /** Official WCAG reference URL */
  wcagUrl: string;
}

/**
 * Remediation guidance structure
 */
export interface RemediationGuidance {
  /** Quick summary of how to fix */
  summary: string;
  /** Detailed steps to remediate */
  steps: string[];
  /** Implementation difficulty */
  difficulty: 'easy' | 'moderate' | 'complex';
  /** Estimated time to fix */
  estimatedTime: string;
  /** Tools that can help */
  tools: string[];
  /** Additional considerations */
  considerations: string[];
}

/**
 * Testing guidance structure
 */
export interface TestingGuidance {
  /** Manual testing steps */
  manual: string[];
  /** Automated testing tools */
  automated: string[];
  /** Screen reader testing */
  screenReader?: string[];
  /** Keyboard testing */
  keyboard?: string[];
  /** Visual testing */
  visual?: string[];
}

/**
 * Code example structure
 */
export interface CodeExample {
  /** Example type */
  type: 'good' | 'bad';
  /** Example title */
  title: string;
  /** Code snippet */
  code: string;
  /** Language */
  language: 'html' | 'css' | 'javascript' | 'jsx' | 'vue' | 'angular';
  /** Explanation */
  explanation: string;
}

/**
 * Comprehensive WCAG 2.2 Success Criteria Database
 */
export const WCAG_DATABASE: Record<string, WCAGCriterion> = {
  '1.1.1': {
    number: '1.1.1',
    level: 'A',
    title: 'Non-text Content',
    description: 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.',
    intent: 'To ensure that all non-text content is also available in text form so that it can be changed into other forms people need, such as large print, braille, speech, symbols or simpler language.',
    benefits: [
      'People who are blind and use screen readers',
      'People with cognitive disabilities who need simple language',
      'People who are deaf-blind and use braille displays'
    ],
    commonFailures: [
      'Images without alt attributes',
      'Decorative images with unnecessary alt text',
      'Complex images without adequate text alternatives',
      'CAPTCHAs without text alternatives'
    ],
    remediation: {
      summary: 'Provide appropriate text alternatives for all non-text content',
      steps: [
        'Add alt attributes to all images',
        'Use empty alt="" for decorative images',
        'Provide long descriptions for complex images',
        'Ensure form controls have accessible names',
        'Provide text alternatives for audio and video content'
      ],
      difficulty: 'easy',
      estimatedTime: '5-15 minutes per image',
      tools: ['Screen readers', 'Browser developer tools', 'axe-core'],
      considerations: [
        'Alt text should convey the same information as the image',
        'Avoid redundant phrases like "image of" or "picture of"',
        'Consider the context and purpose of the image'
      ]
    },
    testing: {
      manual: [
        'Turn off images and check if content is still understandable',
        'Use a screen reader to navigate through content',
        'Check that form controls have accessible names'
      ],
      automated: ['axe-core', 'Lighthouse accessibility audit', 'WAVE'],
      screenReader: [
        'Navigate with screen reader and ensure all content is announced',
        'Check that image descriptions are meaningful'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Image without alt text',
        code: '<img src="chart.png">',
        language: 'html',
        explanation: 'Screen readers cannot convey any information about this image'
      },
      {
        type: 'good',
        title: 'Informative image with alt text',
        code: '<img src="chart.png" alt="Sales increased 25% from Q1 to Q2 2024">',
        language: 'html',
        explanation: 'Alt text conveys the essential information from the chart'
      },
      {
        type: 'good',
        title: 'Decorative image',
        code: '<img src="decoration.png" alt="" role="presentation">',
        language: 'html',
        explanation: 'Decorative images should have empty alt text'
      }
    ],
    relatedCriteria: ['1.4.5', '1.4.9'],
    techniques: {
      sufficient: ['H37', 'H53', 'H86', 'G94', 'G95'],
      advisory: ['C9', 'H46'],
      failures: ['F3', 'F13', 'F20', 'F30', 'F67']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html'
  },

  '1.3.1': {
    number: '1.3.1',
    level: 'A',
    title: 'Info and Relationships',
    description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
    intent: 'To ensure that information and relationships that are implied by visual or auditory formatting are preserved when the presentation format changes.',
    benefits: [
      'Screen reader users can understand document structure',
      'Users with cognitive disabilities benefit from clear structure',
      'Users who customize presentation can maintain semantic meaning'
    ],
    commonFailures: [
      'Using visual formatting instead of semantic markup',
      'Missing heading structure',
      'Tables without proper markup',
      'Forms without proper labeling'
    ],
    remediation: {
      summary: 'Use semantic HTML elements and proper markup for structure and relationships',
      steps: [
        'Use heading elements (h1-h6) for document structure',
        'Mark up lists with ul, ol, and li elements',
        'Use table headers and captions for data tables',
        'Associate form labels with controls',
        'Use semantic elements like nav, main, article, section'
      ],
      difficulty: 'moderate',
      estimatedTime: '15-30 minutes per section',
      tools: ['HTML validator', 'Screen readers', 'Accessibility tree inspector'],
      considerations: [
        'Visual presentation should match semantic structure',
        'Heading levels should be logical and sequential',
        'Table headers should describe their data'
      ]
    },
    testing: {
      manual: [
        'Check heading structure in document outline',
        'Verify table headers are properly associated',
        'Test form label associations'
      ],
      automated: ['axe-core', 'HTML validator', 'Lighthouse'],
      screenReader: [
        'Navigate by headings and check logical structure',
        'Navigate tables and verify header announcements'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Visual heading without semantic markup',
        code: '<div class="title-large">Page Title</div>',
        language: 'html',
        explanation: 'Visual styling alone does not convey heading semantics'
      },
      {
        type: 'good',
        title: 'Proper semantic heading',
        code: '<h1>Page Title</h1>',
        language: 'html',
        explanation: 'Semantic heading element conveys document structure'
      },
      {
        type: 'good',
        title: 'Data table with headers',
        code: `<table>
  <caption>Sales Data Q1 2024</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Sales</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>January</td>
      <td>$10,000</td>
    </tr>
  </tbody>
</table>`,
        language: 'html',
        explanation: 'Proper table structure with headers and caption'
      }
    ],
    relatedCriteria: ['1.3.2', '2.4.6', '4.1.1'],
    techniques: {
      sufficient: ['G115', 'H42', 'H43', 'H44', 'H51', 'H63', 'H71', 'H85'],
      advisory: ['H73', 'H97'],
      failures: ['F2', 'F17', 'F43', 'F46', 'F68', 'F87', 'F90', 'F91', 'F92']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html'
  },

  '1.4.3': {
    number: '1.4.3',
    level: 'AA',
    title: 'Contrast (Minimum)',
    description: 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for large text which has a contrast ratio of at least 3:1.',
    intent: 'To provide enough contrast between text and its background so that it can be read by people with moderately low vision.',
    benefits: [
      'People with low vision or color vision deficiencies',
      'People using devices in bright sunlight',
      'Everyone benefits from improved readability'
    ],
    commonFailures: [
      'Insufficient contrast between text and background',
      'Color-only differentiation',
      'Light gray text on white backgrounds',
      'Overlay text on images without sufficient contrast'
    ],
    remediation: {
      summary: 'Ensure text has sufficient contrast against its background',
      steps: [
        'Measure contrast ratios using color contrast tools',
        'Adjust text or background colors to meet minimum ratios',
        'Use 4.5:1 ratio for normal text, 3:1 for large text',
        'Test all text including links, buttons, and form controls',
        'Consider adding text shadows or outlines for text over images'
      ],
      difficulty: 'easy',
      estimatedTime: '10-20 minutes per color combination',
      tools: ['WebAIM Contrast Checker', 'Colour Contrast Analyser', 'Browser DevTools'],
      considerations: [
        'Large text is 18pt+ or 14pt+ bold',
        'Interactive elements need sufficient contrast in all states',
        'Brand colors may need adjustment for accessibility'
      ]
    },
    testing: {
      manual: [
        'Use contrast checking tools on all text',
        'Test in different lighting conditions',
        'Check text over background images'
      ],
      automated: ['axe-core', 'Lighthouse', 'WAVE'],
      visual: [
        'View site in grayscale mode',
        'Test with color vision deficiency simulators'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Insufficient contrast',
        code: `<p style="color: #999; background: #fff;">
  Light gray text on white background (2.8:1 ratio)
</p>`,
        language: 'html',
        explanation: 'This color combination does not meet the 4.5:1 minimum ratio'
      },
      {
        type: 'good',
        title: 'Sufficient contrast',
        code: `<p style="color: #333; background: #fff;">
  Dark gray text on white background (12.6:1 ratio)
</p>`,
        language: 'html',
        explanation: 'This combination exceeds the minimum contrast requirement'
      },
      {
        type: 'good',
        title: 'Large text with lower contrast',
        code: `<h1 style="color: #666; background: #fff; font-size: 24px;">
  Large heading with 5.7:1 contrast
</h1>`,
        language: 'html',
        explanation: 'Large text only needs 3:1 ratio, this exceeds that requirement'
      }
    ],
    relatedCriteria: ['1.4.6', '1.4.11'],
    techniques: {
      sufficient: ['G18', 'G145'],
      advisory: ['G156', 'C23', 'C25'],
      failures: ['F24', 'F83']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'
  },

  '2.1.1': {
    number: '2.1.1',
    level: 'A',
    title: 'Keyboard',
    description: 'All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes.',
    intent: 'To ensure that all functionality is available from the keyboard so that users who rely on keyboards or keyboard alternatives can access and use web content.',
    benefits: [
      'Users who are blind and cannot use pointing devices',
      'Users with motor disabilities who cannot accurately use pointing devices',
      'Users who prefer keyboard navigation for efficiency'
    ],
    commonFailures: [
      'Custom controls without keyboard support',
      'Mouse-only event handlers',
      'Drag-and-drop without keyboard alternatives',
      'Missing focus indicators'
    ],
    remediation: {
      summary: 'Ensure all interactive elements are keyboard accessible',
      steps: [
        'Add keyboard event handlers alongside mouse events',
        'Ensure all custom controls respond to appropriate keys',
        'Provide keyboard alternatives for drag-and-drop',
        'Use semantic HTML elements when possible',
        'Test tab navigation through all interactive elements'
      ],
      difficulty: 'moderate',
      estimatedTime: '20-45 minutes per interactive component',
      tools: ['Keyboard only', 'Screen readers', 'Browser developer tools'],
      considerations: [
        'Follow platform keyboard conventions',
        'Provide clear focus indicators',
        'Consider keyboard shortcuts for complex interactions'
      ]
    },
    testing: {
      manual: [
        'Navigate the entire site using only the keyboard',
        'Test all interactive elements with Tab, Enter, Space, Arrow keys',
        'Verify focus order is logical'
      ],
      automated: ['axe-core', 'Lighthouse'],
      keyboard: [
        'Tab through all interactive elements',
        'Test Enter and Space activation',
        'Test Escape to close modals/menus',
        'Test Arrow keys for navigation within components'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Mouse-only button',
        code: `<div onclick="doSomething()" class="button">
  Click me
</div>`,
        language: 'html',
        explanation: 'This element is not focusable and only responds to mouse clicks'
      },
      {
        type: 'good',
        title: 'Keyboard accessible button',
        code: `<button onclick="doSomething()">
  Click me
</button>`,
        language: 'html',
        explanation: 'Native button element is keyboard accessible by default'
      },
      {
        type: 'good',
        title: 'Custom keyboard accessible element',
        code: `<div 
  role="button" 
  tabindex="0"
  onclick="doSomething()"
  onkeypress="handleKeyPress(event)"
  class="button">
  Click me
</div>

<script>
function handleKeyPress(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    doSomething();
  }
}
</script>`,
        language: 'html',
        explanation: 'Custom element with proper ARIA roles and keyboard handling'
      }
    ],
    relatedCriteria: ['2.1.2', '2.4.3', '2.4.7'],
    techniques: {
      sufficient: ['G202', 'H91', 'SCR20', 'SCR35'],
      advisory: ['G90'],
      failures: ['F54', 'F55', 'F42']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html'
  },

  '2.4.6': {
    number: '2.4.6',
    level: 'AA',
    title: 'Headings and Labels',
    description: 'Headings and labels describe topic or purpose.',
    intent: 'To help users understand what information is contained in Web pages and how that information is organized.',
    benefits: [
      'Screen reader users can navigate by headings',
      'Users with cognitive disabilities benefit from clear organization',
      'All users can scan content more effectively'
    ],
    commonFailures: [
      'Generic or non-descriptive headings',
      'Form labels that don\'t describe the purpose',
      'Missing headings for content sections',
      'Headings that are purely decorative'
    ],
    remediation: {
      summary: 'Write clear, descriptive headings and labels that explain their purpose',
      steps: [
        'Review all headings and make them descriptive',
        'Ensure form labels clearly describe what input is expected',
        'Use heading hierarchy to organize content logically',
        'Write headings that make sense out of context',
        'Ensure button text describes the action'
      ],
      difficulty: 'easy',
      estimatedTime: '10-15 minutes per heading/label',
      tools: ['Screen readers', 'Heading outline tools', 'Content audit'],
      considerations: [
        'Headings should be unique and descriptive',
        'Labels should be concise but complete',
        'Consider how content sounds when read aloud'
      ]
    },
    testing: {
      manual: [
        'Read headings out of context and verify they make sense',
        'Check that labels clearly indicate required information',
        'Review heading outline for logical structure'
      ],
      automated: ['axe-core', 'Lighthouse'],
      screenReader: [
        'Navigate by headings and verify they describe content sections',
        'Test form completion using only labels'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Generic heading',
        code: '<h2>More Information</h2>',
        language: 'html',
        explanation: 'This heading doesn\'t specify what kind of information'
      },
      {
        type: 'good',
        title: 'Descriptive heading',
        code: '<h2>Product Specifications and Technical Details</h2>',
        language: 'html',
        explanation: 'Clear description of the content that follows'
      },
      {
        type: 'bad',
        title: 'Vague form label',
        code: '<label for="field1">Name</label>',
        language: 'html',
        explanation: 'Unclear what type of name is required'
      },
      {
        type: 'good',
        title: 'Specific form label',
        code: '<label for="field1">Company Name</label>',
        language: 'html',
        explanation: 'Clearly indicates what information is needed'
      }
    ],
    relatedCriteria: ['1.3.1', '2.4.10', '3.3.2'],
    techniques: {
      sufficient: ['G130', 'G131'],
      advisory: ['H97'],
      failures: ['F43']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html'
  },

  '3.3.2': {
    number: '3.3.2',
    level: 'A',
    title: 'Labels or Instructions',
    description: 'Labels or instructions are provided when content requires user input.',
    intent: 'To help users avoid and correct mistakes by providing clear instructions and labels for form controls.',
    benefits: [
      'Users with cognitive disabilities understand what input is expected',
      'Screen reader users receive clear instructions',
      'All users can complete forms more successfully'
    ],
    commonFailures: [
      'Form controls without labels',
      'Missing instructions for complex fields',
      'Placeholder text used as the only label',
      'Required field indicators that are not accessible'
    ],
    remediation: {
      summary: 'Provide clear labels and instructions for all form controls',
      steps: [
        'Add explicit labels for all form controls',
        'Provide instructions for complex or required fields',
        'Use fieldsets and legends for related controls',
        'Indicate required fields in an accessible way',
        'Explain input formats and constraints'
      ],
      difficulty: 'easy',
      estimatedTime: '5-10 minutes per form field',
      tools: ['Screen readers', 'Form validation tools', 'Accessibility tree'],
      considerations: [
        'Labels should be persistent, not just placeholder text',
        'Instructions should be available before users interact with fields',
        'Required field indicators should be programmatically available'
      ]
    },
    testing: {
      manual: [
        'Check that every form control has a label',
        'Verify instructions are provided for complex fields',
        'Test form completion with a screen reader'
      ],
      automated: ['axe-core', 'Lighthouse', 'WAVE'],
      screenReader: [
        'Navigate through forms and verify all controls are properly labeled',
        'Check that instructions are announced with form fields'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Input without label',
        code: '<input type="email" placeholder="Enter email">',
        language: 'html',
        explanation: 'Placeholder text is not accessible to all screen readers'
      },
      {
        type: 'good',
        title: 'Input with proper label',
        code: `<label for="email">Email Address (required)</label>
<input type="email" id="email" required aria-describedby="email-help">
<div id="email-help">We'll use this to send you updates about your order</div>`,
        language: 'html',
        explanation: 'Clear label with additional instructions and requirement indicator'
      },
      {
        type: 'good',
        title: 'Grouped form fields',
        code: `<fieldset>
  <legend>Shipping Address</legend>
  <label for="street">Street Address</label>
  <input type="text" id="street" required>
  
  <label for="city">City</label>
  <input type="text" id="city" required>
  
  <label for="zip">ZIP Code</label>
  <input type="text" id="zip" required pattern="[0-9]{5}">
</fieldset>`,
        language: 'html',
        explanation: 'Related fields grouped with fieldset and legend'
      }
    ],
    relatedCriteria: ['1.3.1', '2.4.6', '3.3.1'],
    techniques: {
      sufficient: ['G131', 'H44', 'H65', 'H71', 'G167'],
      advisory: ['G184', 'H90'],
      failures: ['F82']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html'
  },

  '4.1.2': {
    number: '4.1.2',
    level: 'A',
    title: 'Name, Role, Value',
    description: 'For all user interface components, the name and role can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set; and notification of changes to these items is available to user agents, including assistive technologies.',
    intent: 'To ensure that assistive technologies can gather information about, activate, and keep up to date on the status of user interface controls in the content.',
    benefits: [
      'Screen reader users can understand and interact with custom controls',
      'Voice control users can operate interface elements',
      'Switch device users can navigate and activate controls'
    ],
    commonFailures: [
      'Custom controls without proper ARIA attributes',
      'Missing accessible names for controls',
      'Dynamic content changes not announced',
      'Form controls without proper state information'
    ],
    remediation: {
      summary: 'Ensure all UI components have accessible names, roles, and state information',
      steps: [
        'Add proper ARIA roles to custom components',
        'Provide accessible names using aria-label or aria-labelledby',
        'Use aria-describedby for additional descriptions',
        'Implement proper state management with ARIA attributes',
        'Ensure live regions announce dynamic changes'
      ],
      difficulty: 'complex',
      estimatedTime: '30-60 minutes per custom component',
      tools: ['Screen readers', 'Accessibility tree inspector', 'ARIA authoring practices'],
      considerations: [
        'Follow established ARIA design patterns',
        'Test with multiple assistive technologies',
        'Ensure names and descriptions are meaningful'
      ]
    },
    testing: {
      manual: [
        'Use accessibility tree to verify names and roles',
        'Test all states and properties with screen readers',
        'Verify dynamic changes are announced'
      ],
      automated: ['axe-core', 'Lighthouse'],
      screenReader: [
        'Navigate to each control and verify proper announcements',
        'Test state changes and verify they are announced',
        'Check custom components follow expected interaction patterns'
      ]
    },
    examples: [
      {
        type: 'bad',
        title: 'Div acting as button without accessibility',
        code: `<div onclick="toggleMenu()" class="menu-button">
  ☰ Menu
</div>`,
        language: 'html',
        explanation: 'No role, not focusable, no keyboard support'
      },
      {
        type: 'good',
        title: 'Proper custom button',
        code: `<div 
  role="button" 
  tabindex="0"
  aria-label="Toggle navigation menu"
  aria-expanded="false"
  onclick="toggleMenu()"
  onkeydown="handleKeydown(event)"
  class="menu-button">
  ☰ Menu
</div>`,
        language: 'html',
        explanation: 'Proper role, focusable, accessible name, and state information'
      },
      {
        type: 'good',
        title: 'Custom checkbox with ARIA',
        code: `<div 
  role="checkbox" 
  tabindex="0"
  aria-checked="false"
  aria-labelledby="checkbox-label"
  onclick="toggleCheckbox()"
  onkeydown="handleCheckboxKeydown(event)"
  class="custom-checkbox">
</div>
<div id="checkbox-label">Receive email notifications</div>`,
        language: 'html',
        explanation: 'Custom checkbox with proper role, state, and labeling'
      }
    ],
    relatedCriteria: ['1.3.1', '2.1.1', '4.1.1'],
    techniques: {
      sufficient: ['ARIA4', 'ARIA5', 'ARIA16', 'G108', 'H91'],
      advisory: ['ARIA1', 'ARIA9', 'ARIA17', 'ARIA18'],
      failures: ['F15', 'F20', 'F68', 'F79', 'F86', 'F89']
    },
    wcagUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html'
  }
};

/**
 * Get WCAG criterion by number
 */
export function getWCAGCriterion(number: string): WCAGCriterion | undefined {
  return WCAG_DATABASE[number];
}

/**
 * Get all criteria for a specific WCAG level
 */
export function getCriteriaByLevel(level: WCAGLevel): WCAGCriterion[] {
  return Object.values(WCAG_DATABASE).filter(criterion => criterion.level === level);
}

/**
 * Search criteria by keyword
 */
export function searchCriteria(keyword: string): WCAGCriterion[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(WCAG_DATABASE).filter(criterion =>
    criterion.title.toLowerCase().includes(lowerKeyword) ||
    criterion.description.toLowerCase().includes(lowerKeyword) ||
    criterion.intent.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get related criteria
 */
export function getRelatedCriteria(number: string): WCAGCriterion[] {
  const criterion = getWCAGCriterion(number);
  if (!criterion) return [];
  
  return criterion.relatedCriteria
    .map(getWCAGCriterion)
    .filter((c): c is WCAGCriterion => c !== undefined);
}

/**
 * Get common issue patterns and their remediation
 */
export const COMMON_ISSUE_PATTERNS = {
  'missing-alt-text': {
    criteria: ['1.1.1'],
    severity: 'serious',
    category: 'images',
    title: 'Images missing alternative text',
    quickFix: 'Add descriptive alt attributes to images',
    codeExample: '<img src="chart.jpg" alt="Sales increased 25% from Q1 to Q2">'
  },
  'low-contrast': {
    criteria: ['1.4.3'],
    severity: 'serious', 
    category: 'color',
    title: 'Insufficient color contrast',
    quickFix: 'Increase contrast between text and background colors',
    codeExample: 'color: #333; /* Use darker colors for better contrast */'
  },
  'missing-labels': {
    criteria: ['3.3.2', '4.1.2'],
    severity: 'serious',
    category: 'forms',
    title: 'Form controls without labels',
    quickFix: 'Add descriptive labels to all form controls',
    codeExample: '<label for="email">Email Address</label><input type="email" id="email">'
  },
  'keyboard-inaccessible': {
    criteria: ['2.1.1'],
    severity: 'critical',
    category: 'keyboard',
    title: 'Elements not keyboard accessible',
    quickFix: 'Ensure all interactive elements can be reached and activated with keyboard',
    codeExample: '<button onclick="action()">Click me</button> <!-- Use button instead of div -->'
  },
  'missing-headings': {
    criteria: ['1.3.1', '2.4.6'],
    severity: 'moderate',
    category: 'structure',
    title: 'Poor heading structure',
    quickFix: 'Use proper heading hierarchy (h1, h2, h3) to organize content',
    codeExample: '<h1>Main Title</h1><h2>Section Title</h2><h3>Subsection</h3>'
  }
} as const; 