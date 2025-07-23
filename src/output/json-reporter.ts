import { 
  AccessibilityReport, 
  ReportMetadata, 
  ExecutiveSummary, 
  PageReport, 
  SiteReport, 
  ReportIssue, 
  IssueCategory, 
  AffectedElement,
  ReportOptions,
  TechnicalDetails,
  SeverityBreakdown,
  WCAGLevelBreakdown,
  CrawlInfo,
  SiteStatistics,
  PageSummary,
  IssuesAnalysis,
  CommonIssue,
  IssuePattern,
  ComplianceAnalysis,
  ComplianceLevel,
  SuccessCriteriaAnalysis,
  DomainBreakdown,
  PageMetadata,
  PerformanceMetrics,
  ReportError,
  RuleExecutionInfo,
  ScoreDistribution,
  ResponseTimeStats
} from '../types/output';
import { ScanResult, AccessibilityIssue } from '../types';
import { CrawlSession } from '../types/crawler';
import { WCAGLevel } from '../types/wcag';
import { ErrorLogger, ErrorEntry, TechnicalIssue, ErrorStatistics } from './error-logger';

/**
 * JSON report generator for accessibility scan results
 * Converts scan results into comprehensive JSON reports with detailed analysis
 */
export class JsonReporter {
  private static readonly REPORT_VERSION = '1.0.0';
  private static readonly TOOL_NAME = 'a11yanalyze';
  private static readonly TOOL_VERSION = '1.0.0';

  /**
   * Generate a single page accessibility report
   */
  async generatePageReport(
    scanResult: ScanResult,
    options: Partial<ReportOptions> = {}
  ): Promise<AccessibilityReport> {
    const startTime = Date.now();
    const reportOptions = this.mergeDefaultOptions(options);
    
    try {
      const metadata = this.generateMetadata('page', scanResult.url, reportOptions);
      const summary = this.generateExecutiveSummary([scanResult], 'page');
      const pageReport = this.generatePageReportDetails(scanResult, reportOptions);
      const technical = this.generateTechnicalDetails(scanResult, [], reportOptions);

      const report: AccessibilityReport = {
        metadata: {
          ...metadata,
          generationTime: Date.now() - startTime,
        },
        summary,
        page: pageReport,
        technical,
        errors: [],
      };

      return this.validateAndEnhanceReport(report);

    } catch (error) {
      return this.generateErrorReport(error, 'page', scanResult?.url || '', startTime);
    }
  }

  /**
   * Generate a multi-page site accessibility report
   */
  async generateSiteReport(
    crawlSession: CrawlSession,
    scanResults: ScanResult[],
    options: Partial<ReportOptions> = {}
  ): Promise<AccessibilityReport> {
    const startTime = Date.now();
    const reportOptions = this.mergeDefaultOptions(options);
    
    try {
      const metadata = this.generateMetadata('site', crawlSession.startUrls, reportOptions);
      const summary = this.generateExecutiveSummary(scanResults, 'site');
      const siteReport = this.generateSiteReportDetails(crawlSession, scanResults, reportOptions);
      const technical = this.generateTechnicalDetails(scanResults[0] || {} as ScanResult, scanResults, reportOptions);

      const report: AccessibilityReport = {
        metadata: {
          ...metadata,
          generationTime: Date.now() - startTime,
        },
        summary,
        site: siteReport,
        technical,
        errors: this.extractReportErrors(crawlSession, scanResults),
      };

      return this.validateAndEnhanceReport(report);

    } catch (error) {
      return this.generateErrorReport(error, 'site', crawlSession.startUrls, startTime);
    }
  }

  /**
   * Generate report metadata
   * @private
   */
  private generateMetadata(
    type: 'page' | 'site',
    target: string | string[],
    options: ReportOptions
  ): ReportMetadata {
    return {
      version: JsonReporter.REPORT_VERSION,
      type,
      generatedAt: new Date().toISOString(),
      generationTime: 0, // Will be updated by caller
      target,
      title: options.title || this.generateDefaultTitle(type, target),
      description: options.description,
      tool: {
        name: JsonReporter.TOOL_NAME,
        version: JsonReporter.TOOL_VERSION,
        userAgent: `${JsonReporter.TOOL_NAME}/${JsonReporter.TOOL_VERSION}`,
      },
    };
  }

  /**
   * Generate executive summary
   * @private
   */
  private generateExecutiveSummary(
    scanResults: ScanResult[],
    type: 'page' | 'site'
  ): ExecutiveSummary {
    const totalIssues = scanResults.reduce((sum, result) => sum + result.issues.length, 0);
    const issuesBySeverity = this.calculateSeverityBreakdown(scanResults);
    const wcagLevelBreakdown = this.calculateWCAGLevelBreakdown(scanResults);
    const averageScore = this.calculateAverageScore(scanResults);
    const overallCompliant = this.determineOverallCompliance(scanResults);
    const achievedLevel = this.determineAchievedWCAGLevel(scanResults);

    return {
      overallScore: averageScore,
      compliant: overallCompliant,
      achievedLevel,
      pagesScanned: scanResults.length,
      totalIssues,
      issuesBySeverity,
      wcagLevelBreakdown,
      keyRecommendations: this.generateKeyRecommendations(scanResults, issuesBySeverity),
      status: scanResults.length > 0 ? 'completed' : 'failed',
    };
  }

  /**
   * Generate page report details
   * @private
   */
  private generatePageReportDetails(
    scanResult: ScanResult,
    options: ReportOptions
  ): PageReport {
    const filteredIssues = this.filterIssuesBySeverity(scanResult.issues, options.minSeverity);
    const reportIssues = this.convertToReportIssues(filteredIssues, options);

    return {
      url: scanResult.url,
      title: scanResult.metadata?.title || 'Unknown Title',
      score: scanResult.score,
      compliant: scanResult.compliance?.compliant || false,
      issues: reportIssues,
      metadata: this.convertPageMetadata(scanResult),
      performance: this.convertPerformanceMetrics(scanResult),
      screenshots: options.includeScreenshots ? this.extractScreenshots(scanResult) : undefined,
    };
  }

  /**
   * Generate site report details
   * @private
   */
  private generateSiteReportDetails(
    crawlSession: CrawlSession,
    scanResults: ScanResult[],
    options: ReportOptions
  ): SiteReport {
    const crawlInfo = this.convertCrawlInfo(crawlSession);
    const statistics = this.calculateSiteStatistics(crawlSession, scanResults);
    const pages = this.generatePageSummaries(scanResults, crawlSession);
    const issuesAnalysis = this.analyzeIssues(scanResults, options);
    const complianceAnalysis = this.analyzeCompliance(scanResults);
    const domainBreakdown = this.calculateDomainBreakdown(scanResults);

    return {
      baseUrl: crawlSession.startUrls[0] || '',
      crawlInfo,
      statistics,
      pages,
      issuesAnalysis,
      complianceAnalysis,
      domainBreakdown: domainBreakdown.length > 1 ? domainBreakdown : undefined,
    };
  }

  /**
   * Convert crawl session to crawl info
   * @private
   */
  private convertCrawlInfo(crawlSession: CrawlSession): CrawlInfo {
    return {
      sessionId: crawlSession.id,
      startUrls: crawlSession.startUrls,
      startTime: crawlSession.startTime.toISOString(),
      endTime: crawlSession.endTime?.toISOString() || new Date().toISOString(),
      duration: crawlSession.endTime 
        ? crawlSession.endTime.getTime() - crawlSession.startTime.getTime()
        : Date.now() - crawlSession.startTime.getTime(),
      config: {
        maxDepth: crawlSession.config.maxDepth,
        maxPages: crawlSession.config.maxPages,
        allowedDomains: crawlSession.config.allowedDomains,
        excludedPaths: crawlSession.config.excludedPaths,
      },
      status: this.mapCrawlStatus(crawlSession.status),
    };
  }

  /**
   * Calculate site statistics
   * @private
   */
  private calculateSiteStatistics(
    crawlSession: CrawlSession,
    scanResults: ScanResult[]
  ): SiteStatistics {
    const urls = Array.from(crawlSession.urls.values());
    const scoreDistribution = this.calculateScoreDistribution(scanResults);
    const responseTimeStats = this.calculateResponseTimeStats(scanResults);

    return {
      pagesDiscovered: urls.length,
      pagesScanned: scanResults.length,
      pagesFailed: urls.filter(u => u.status === 'failed').length,
      pagesSkipped: urls.filter(u => u.status === 'skipped').length,
      averageScore: this.calculateAverageScore(scanResults),
      scoreDistribution,
      responseTimeStats,
    };
  }

  /**
   * Generate page summaries
   * @private
   */
  private generatePageSummaries(
    scanResults: ScanResult[],
    crawlSession: CrawlSession
  ): PageSummary[] {
    return scanResults.map(result => {
      const urlEntry = crawlSession.urls.get(result.url);
      const issuesBySeverity = this.calculateSeverityBreakdown([result]);

      return {
        url: result.url,
        title: result.metadata?.title || 'Unknown Title',
        score: result.score,
        compliant: result.compliance?.compliant || false,
        issuesBySeverity,
        loadTime: result.metadata?.pageLoadTime || 0,
        scanTime: result.metadata?.scanDuration || 0,
        depth: urlEntry?.depth || 0,
        errors: result.errors?.map(e => e.message) || [],
      };
    });
  }

  /**
   * Analyze issues across the site
   * @private
   */
  private analyzeIssues(scanResults: ScanResult[], options: ReportOptions): IssuesAnalysis {
    const allIssues = scanResults.flatMap(result => result.issues);
    const filteredIssues = this.filterIssuesBySeverity(allIssues, options.minSeverity);
    
    const mostCommonIssues = this.findMostCommonIssues(filteredIssues, scanResults.length);
    const issuesByCategory = this.categorizeIssues(filteredIssues);
    const criticalIssues = this.convertToReportIssues(
      filteredIssues.filter(issue => issue.severity === 'critical'),
      options
    );
    const patterns = this.identifyIssuePatterns(scanResults);

    return {
      mostCommonIssues,
      issuesByCategory,
      criticalIssues,
      patterns,
    };
  }

  /**
   * Analyze WCAG compliance
   * @private
   */
  private analyzeCompliance(scanResults: ScanResult[]): ComplianceAnalysis {
    const levelCompliance = {
      A: this.calculateComplianceLevel(scanResults, 'A'),
      AA: this.calculateComplianceLevel(scanResults, 'AA'),
      AAA: this.calculateComplianceLevel(scanResults, 'AAA'),
    };

    const successCriteria = this.analyzeSuccessCriteria(scanResults);

    return {
      levelCompliance,
      successCriteria,
    };
  }

  /**
   * Calculate compliance level statistics
   * @private
   */
  private calculateComplianceLevel(
    scanResults: ScanResult[],
    level: WCAGLevel
  ): ComplianceLevel {
    const relevantResults = scanResults.filter(result => 
      result.compliance?.levelBreakdown[level] !== undefined
    );

    const passingPages = relevantResults.filter(result => {
      const levelIssues = result.issues.filter(issue => 
        issue.level === level && issue.severity !== 'warning'
      );
      return levelIssues.length === 0;
    }).length;

    const failingPages = relevantResults.length - passingPages;
    const compliant = failingPages === 0;
    const percentage = relevantResults.length > 0 ? (passingPages / relevantResults.length) * 100 : 0;

    const blockingIssues = this.findBlockingIssues(scanResults, level);

    return {
      compliant,
      percentage: Math.round(percentage),
      passingPages,
      failingPages,
      blockingIssues,
    };
  }

  /**
   * Convert scan result issues to report issues
   * @private
   */
  private convertToReportIssues(
    issues: AccessibilityIssue[],
    options: ReportOptions
  ): ReportIssue[] {
    const issueGroups = options.groupIssues 
      ? this.groupIssuesByType(issues)
      : issues.map(issue => [issue]);

    return issueGroups.map(group => {
      const primaryIssue = group[0];
      if (!primaryIssue) {
        throw new Error('Issue group is empty');
      }
      const elements = group.map(issue => this.convertToAffectedElement(issue));

      return {
        id: primaryIssue.id,
        wcagReference: primaryIssue.wcagReference,
        level: primaryIssue.level,
        severity: primaryIssue.severity,
        category: this.categorizeIssue(primaryIssue),
        title: this.generateIssueTitle(primaryIssue),
        description: primaryIssue.message,
        impact: primaryIssue.impact,
        remediation: options.includeRemediation ? primaryIssue.remediation : '',
        helpUrl: primaryIssue.helpUrl,
        occurrences: group.length,
        elements,
      };
    });
  }

  /**
   * Convert accessibility issue to affected element
   * @private
   */
  private convertToAffectedElement(issue: AccessibilityIssue): AffectedElement {
    return {
      selector: issue.selector,
      html: this.truncateHtml(issue.element),
      text: this.extractElementText(issue.element),
      context: `Issue: ${issue.message}`,
    };
  }

  /**
   * Calculate severity breakdown
   * @private
   */
  private calculateSeverityBreakdown(scanResults: ScanResult[]): SeverityBreakdown {
    const allIssues = scanResults.flatMap(result => result.issues);
    
    return {
      critical: allIssues.filter(issue => issue.severity === 'critical').length,
      serious: allIssues.filter(issue => issue.severity === 'serious').length,
      moderate: allIssues.filter(issue => issue.severity === 'moderate').length,
      minor: allIssues.filter(issue => issue.severity === 'minor').length,
      warning: allIssues.filter(issue => issue.severity === 'warning').length,
    };
  }

  /**
   * Calculate WCAG level breakdown
   * @private
   */
  private calculateWCAGLevelBreakdown(scanResults: ScanResult[]): WCAGLevelBreakdown {
    const allIssues = scanResults.flatMap(result => result.issues);
    
    return {
      A: allIssues.filter(issue => issue.level === 'A').length,
      AA: allIssues.filter(issue => issue.level === 'AA').length,
      AAA: allIssues.filter(issue => issue.level === 'AAA').length,
      ARIA: allIssues.filter(issue => issue.level === 'ARIA').length,
    };
  }

  /**
   * Calculate average accessibility score
   * @private
   */
  private calculateAverageScore(scanResults: ScanResult[]): number {
    if (scanResults.length === 0) return 0;
    
    const totalScore = scanResults.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / scanResults.length);
  }

  /**
   * Determine overall compliance status
   * @private
   */
  private determineOverallCompliance(scanResults: ScanResult[]): boolean {
    return scanResults.every(result => result.compliance?.compliant || false);
  }

  /**
   * Determine achieved WCAG level
   * @private
   */
  private determineAchievedWCAGLevel(scanResults: ScanResult[]): WCAGLevel | 'None' {
    const hasA = scanResults.every(result => 
      result.issues.filter(issue => issue.level === 'A' && issue.severity !== 'warning').length === 0
    );
    const hasAA = hasA && scanResults.every(result => 
      result.issues.filter(issue => issue.level === 'AA' && issue.severity !== 'warning').length === 0
    );
    // Only return AAA if there are no issues at all (not even warnings)
    const hasStrictAAA = hasAA && scanResults.every(result => 
      result.issues.filter(issue => issue.level === 'AAA').length === 0
    );

    if (hasStrictAAA) return 'AAA';
    if (hasAA) return 'AA';
    if (hasA) return 'A';
    return 'None';
  }

  /**
   * Generate key recommendations
   * @private
   */
  private generateKeyRecommendations(
    scanResults: ScanResult[],
    issuesBySeverity: SeverityBreakdown
  ): string[] {
    const recommendations: string[] = [];

    if (issuesBySeverity.critical > 0) {
      recommendations.push(`Address ${issuesBySeverity.critical} critical accessibility issues immediately`);
    }

    if (issuesBySeverity.serious > 0) {
      recommendations.push(`Fix ${issuesBySeverity.serious} serious issues to improve compliance`);
    }

    const averageScore = this.calculateAverageScore(scanResults);
    if (averageScore < 80) {
      recommendations.push('Implement systematic accessibility testing in development workflow');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring and maintaining current accessibility standards');
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Helper methods for data processing
   * @private
   */
  private mergeDefaultOptions(options: Partial<ReportOptions>): ReportOptions {
    return {
      includeScreenshots: false,
      includeRawData: false,
      includeTrends: false,
      minSeverity: 'warning',
      groupIssues: true,
      includeRemediation: true,
      version: JsonReporter.REPORT_VERSION,
      ...options,
    };
  }

  private generateDefaultTitle(type: 'page' | 'site', target: string | string[]): string {
    const targetStr = Array.isArray(target) ? target[0] : target;
    return type === 'page' 
      ? `Accessibility Report - ${targetStr}`
      : `Site Accessibility Report - ${targetStr}`;
  }

  private filterIssuesBySeverity(
    issues: AccessibilityIssue[],
    minSeverity: ReportOptions['minSeverity']
  ): AccessibilityIssue[] {
    const severityOrder = ['warning', 'minor', 'moderate', 'serious', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    
    return issues.filter(issue => 
      severityOrder.indexOf(issue.severity) >= minIndex
    );
  }

  private categorizeIssue(issue: AccessibilityIssue): IssueCategory {
    // Simple categorization based on WCAG reference or tags
    if (issue.wcagReference.startsWith('1.1')) return 'images';
    if (issue.wcagReference.startsWith('1.3')) return 'structure';
    if (issue.wcagReference.startsWith('1.4')) return 'color';
    if (issue.wcagReference.startsWith('2.1')) return 'keyboard';
    if (issue.wcagReference.startsWith('2.4')) return 'navigation';
    if (issue.wcagReference.startsWith('3.1')) return 'content';
    if (issue.wcagReference.startsWith('3.2')) return 'navigation';
    if (issue.wcagReference.startsWith('3.3')) return 'forms';
    if (issue.wcagReference.startsWith('4.1')) return 'aria';
    return 'other';
  }

  private generateIssueTitle(issue: AccessibilityIssue): string {
    // Generate a concise title from the issue message
    const messagePart = issue.message?.split('.')[0];
    return messagePart?.trim() || 'Accessibility Issue';
  }

  private truncateHtml(html: string, maxLength = 200): string {
    return html.length > maxLength ? html.substring(0, maxLength) + '...' : html;
  }

  private extractElementText(html: string): string | undefined {
    // Simple text extraction from HTML
    const textMatch = html.match(/>([^<]+)</);
    return textMatch && textMatch[1] ? textMatch[1].trim() : undefined;
  }

  // Additional helper methods would be implemented here...
  private convertPageMetadata(scanResult: ScanResult): PageMetadata {
    return {
      title: scanResult.metadata?.title || 'Unknown',
      language: scanResult.metadata?.language || 'en',
      viewport: scanResult.metadata?.viewport ? `${scanResult.metadata.viewport.width}x${scanResult.metadata.viewport.height}` : '1280x720',
      charset: 'UTF-8', // Default, should be extracted
      size: {
        totalElements: scanResult.metadata?.totalElements || 0,
        interactiveElements: scanResult.metadata?.testedElements || 0,
        images: 0, // Should be extracted from scan
        links: 0, // Should be extracted from scan
        formControls: 0, // Should be extracted from scan
        headings: 0, // Should be extracted from scan
      },
      accessibilityFeatures: [], // Should be detected during scan
    };
  }

  private convertPerformanceMetrics(scanResult: ScanResult): PerformanceMetrics {
    return {
      loadTime: scanResult.metadata?.pageLoadTime || 0,
      scanTime: scanResult.metadata?.scanDuration || 0,
      totalTime: (scanResult.metadata?.pageLoadTime || 0) + (scanResult.metadata?.scanDuration || 0),
      resources: {
        total: 0, // Should come from browser manager
        failed: 0,
        totalSize: 0,
      },
    };
  }

  private extractScreenshots(scanResult: ScanResult): any[] {
    // Screenshots would be extracted from scan result if available
    return [];
  }

  private mapCrawlStatus(status: any): 'completed' | 'partial' | 'failed' | 'cancelled' {
    // Map internal crawl status to report status
    return status === 'completed' ? 'completed' : 'partial';
  }

  // Placeholder implementations for complex analysis methods
  private calculateScoreDistribution(scanResults: ScanResult[]): ScoreDistribution {
    const scores = scanResults.map(r => r.score);
    return {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 80 && s < 90).length,
      fair: scores.filter(s => s >= 70 && s < 80).length,
      poor: scores.filter(s => s >= 60 && s < 70).length,
      critical: scores.filter(s => s < 60).length,
    };
  }

  private calculateResponseTimeStats(scanResults: ScanResult[]): ResponseTimeStats {
    const loadTimes = scanResults.map(r => r.metadata?.pageLoadTime || 0);
    const scanTimes = scanResults.map(r => r.metadata?.scanDuration || 0);
    
    return {
      averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
      fastestLoadTime: Math.min(...loadTimes),
      slowestLoadTime: Math.max(...loadTimes),
      averageScanTime: scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length,
    };
  }

  private findMostCommonIssues(issues: AccessibilityIssue[], totalPages: number): CommonIssue[] {
    // Group issues by WCAG reference and count occurrences
    const issueGroups = new Map<string, AccessibilityIssue[]>();
    
    issues.forEach(issue => {
      const key = issue.wcagReference;
      if (!issueGroups.has(key)) {
        issueGroups.set(key, []);
      }
      issueGroups.get(key)!.push(issue);
    });

    return Array.from(issueGroups.entries())
      .filter(([, groupIssues]) => groupIssues.length > 0)
      .map(([wcagRef, groupIssues]) => ({
        id: groupIssues[0]!.id,
        title: this.generateIssueTitle(groupIssues[0]!),
        wcagReference: wcagRef,
        occurrences: groupIssues.length,
        affectedPages: 1, // Simplified - would need page tracking
        affectedPercentage: Math.round((1 / totalPages) * 100),
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);
  }

  private categorizeIssues(issues: AccessibilityIssue[]): Record<IssueCategory, number> {
    const categories: Record<IssueCategory, number> = {
      images: 0, forms: 0, navigation: 0, content: 0, color: 0,
      keyboard: 0, focus: 0, aria: 0, structure: 0, multimedia: 0,
      timing: 0, input: 0, error: 0, other: 0
    };

    issues.forEach(issue => {
      const category = this.categorizeIssue(issue);
      categories[category]++;
    });

    return categories;
  }

  private identifyIssuePatterns(scanResults: ScanResult[]): IssuePattern[] {
    // Simplified pattern detection
    return [];
  }

  private analyzeSuccessCriteria(scanResults: ScanResult[]): SuccessCriteriaAnalysis[] {
    // Simplified success criteria analysis
    return [];
  }

  private calculateDomainBreakdown(scanResults: ScanResult[]): DomainBreakdown[] {
    // Group by domain and calculate statistics
    return [];
  }

  private findBlockingIssues(scanResults: ScanResult[], level: WCAGLevel): string[] {
    // Find issues that block compliance at this level
    return [];
  }

  private groupIssuesByType(issues: AccessibilityIssue[]): AccessibilityIssue[][] {
    // Group similar issues together
    const groups = new Map<string, AccessibilityIssue[]>();
    
    issues.forEach(issue => {
      const key = `${issue.wcagReference}-${issue.severity}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(issue);
    });

    return Array.from(groups.values());
  }

  private generateTechnicalDetails(
    primaryResult: ScanResult,
    allResults: ScanResult[],
    options: ReportOptions
  ): TechnicalDetails {
    return {
      scanConfig: {
        wcagLevel: 'AA', // Should come from actual config
        includeAAA: true,
        includeARIA: true,
        browser: {
          name: 'chromium',
          version: '1.0.0',
          headless: true,
          viewport: { width: 1280, height: 720 },
        },
      },
      rulesExecuted: [], // Should be populated from actual rule execution
      environment: {
        toolVersion: JsonReporter.TOOL_VERSION,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      processing: {
        totalRules: 0,
        rulesPassed: 0,
        rulesFailed: 0,
        customRules: 0,
      },
    };
  }

  private extractReportErrors(crawlSession: CrawlSession, scanResults: ScanResult[]): ReportError[] {
    const errors: ReportError[] = [];

    // Extract errors from scan results
    scanResults.forEach(result => {
      if (result.errors) {
        result.errors.forEach(error => {
          errors.push({
            type: 'scan',
            severity: error.type === 'timeout' ? 'error' : 'warning',
            message: error.message,
            details: error.details,
            url: result.url,
            timestamp: new Date().toISOString(),
          });
        });
      }
    });

    return errors;
  }

  private validateAndEnhanceReport(report: AccessibilityReport): AccessibilityReport {
    // Validate report structure and enhance with additional data
    return report;
  }

  private generateErrorReport(
    error: any,
    type: 'page' | 'site',
    target: string | string[],
    startTime: number
  ): AccessibilityReport {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      metadata: this.generateMetadata(type, target, this.mergeDefaultOptions({})),
      summary: {
        overallScore: 0,
        compliant: false,
        achievedLevel: 'None',
        pagesScanned: 0,
        totalIssues: 0,
        issuesBySeverity: { critical: 0, serious: 0, moderate: 0, minor: 0, warning: 0 },
        wcagLevelBreakdown: { A: 0, AA: 0, AAA: 0, ARIA: 0 },
        keyRecommendations: ['Report generation failed - please try again'],
        status: 'failed',
      },
      technical: this.generateTechnicalDetails({} as ScanResult, [], this.mergeDefaultOptions({})),
      errors: [{
        type: 'generation',
        severity: 'critical',
        message: `Report generation failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      }],
    };
  }
} 