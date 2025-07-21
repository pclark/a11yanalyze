/**
 * WCAG 2.2 specific type definitions
 * Covers guidelines, success criteria, and rule implementations
 */

export type WCAGLevel = 'A' | 'AA' | 'AAA';
export type WCAGPrinciple = 'perceivable' | 'operable' | 'understandable' | 'robust';

export interface WCAGGuideline {
  id: string;
  title: string;
  principle: WCAGPrinciple;
  level: WCAGLevel;
  successCriteria: WCAGSuccessCriterion[];
}

export interface WCAGSuccessCriterion {
  id: string;
  number: string; // e.g., "1.1.1"
  title: string;
  level: WCAGLevel;
  understanding: string;
  techniques: WCAGTechnique[];
}

export interface WCAGTechnique {
  id: string;
  title: string;
  type: 'sufficient' | 'advisory' | 'failure';
  url: string;
}

export interface WCAGRule {
  ruleId: string;
  wcagCriterion: string;
  level: WCAGLevel;
  enabled: boolean;
  tags: string[];
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  selector?: string;
  evaluate: string; // Function string or reference
}

export interface RuleEngineConfig {
  wcagLevel: WCAGLevel;
  includeAAA: boolean;
  includeARIA: boolean;
  customRules: WCAGRule[];
  disabledRules: string[];
  axeCoreConfig?: {
    tags: string[];
    rules: Record<string, { enabled: boolean }>;
  };
}

export interface RuleResult {
  ruleId: string;
  wcagReference: string;
  level: WCAGLevel;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  nodes: ViolationNode[];
  description: string;
  help: string;
  helpUrl: string;
}

export interface ViolationNode {
  target: string[];
  html: string;
  any: CheckResult[];
  all: CheckResult[];
  none: CheckResult[];
  failureSummary?: string;
}

export interface CheckResult {
  id: string;
  impact: string;
  message: string;
  data: any;
  relatedNodes: RelatedNode[];
}

export interface RelatedNode {
  target: string[];
  html: string;
} 