import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';

export interface CashflowReport {
  currentBalance: number;
  monthlyBurn: number;
  runwayMonths: number;
  runwayWarning: 'safe' | 'caution' | 'critical' | 'danger';
  cashflowTrend: 'improving' | 'stable' | 'declining';
  transactions: CategorizedTransaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    topExpenseCategories: { category: string; amount: number; percent: number }[];
    recurringExpenses: { description: string; amount: number; frequency: string }[];
  };
  forecasts: CashflowForecast[];
  alerts: FinancialAlert[];
  recommendations: string[];
}

export interface CategorizedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  isRecurring: boolean;
  confidence: number;
}

export interface CashflowForecast {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  scenario: 'optimistic' | 'base' | 'pessimistic';
}

export interface FinancialAlert {
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  recommendation: string;
  deadline?: string;
}

export interface UnitEconomics {
  cac: number;           // Customer Acquisition Cost
  ltv: number;           // Lifetime Value
  ltvCacRatio: number;   // LTV:CAC ratio
  paybackPeriod: number; // months
  grossMargin: number;   // percentage
  burnMultiple: number;  // net burn / net new ARR
  magicNumber: number;   // net new ARR / prior quarter S&M spend
  healthScore: number;   // 0-100 composite score
}

@Injectable()
export class CashflowAnalysisEngine {
  private readonly logger = new Logger(CashflowAnalysisEngine.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
  ) {}

  /**
   * Generate a comprehensive cashflow report from raw transactions.
   */
  async analyzeCashflow(
    founderId: string,
    transactions: {
      date: string;
      description: string;
      amount: number;
      type: 'income' | 'expense';
    }[],
    currentBalance: number,
    businessType?: string,
  ): Promise<CashflowReport> {
    this.logger.log(`Analyzing ${transactions.length} transactions for founder ${founderId}`);

    // Step 1: Categorize all transactions using LLM
    const categorized = await this.categorizeTransactions(transactions);

    // Step 2: Calculate summary metrics
    const totalIncome = categorized
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = categorized
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netCashflow = totalIncome - totalExpenses;

    // Step 3: Calculate monthly burn rate
    const dateRange = this.getDateRange(transactions);
    const months = Math.max(1, dateRange.months);
    const monthlyBurn = totalExpenses / months;

    // Step 4: Runway calculation
    const runwayMonths = monthlyBurn > 0 ? currentBalance / monthlyBurn : Infinity;

    // Step 5: Generate forecasts
    const forecasts = this.generateForecasts(currentBalance, monthlyBurn, totalIncome / months, 6);

    // Step 6: Identify alerts
    const alerts = this.generateAlerts(runwayMonths, monthlyBurn, netCashflow, currentBalance);

    // Step 7: Generate recommendations using LLM
    const recommendations = await this.generateRecommendations(
      monthlyBurn, runwayMonths, totalIncome, totalExpenses,
      categorized, businessType,
    );

    const topCategories = this.getTopExpenseCategories(categorized);
    const recurringExpenses = this.getRecurringExpenses(categorized);

    const report: CashflowReport = {
      currentBalance,
      monthlyBurn,
      runwayMonths: Math.round(runwayMonths * 10) / 10,
      runwayWarning: this.getRunwayWarning(runwayMonths),
      cashflowTrend: this.getCashflowTrend(categorized),
      transactions: categorized,
      summary: {
        totalIncome,
        totalExpenses,
        netCashflow,
        topExpenseCategories: topCategories,
        recurringExpenses,
      },
      forecasts,
      alerts,
      recommendations,
    };

    // Log analysis
    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: '',
        action: 'cashflow_analysis_completed',
        details: {
          transactionCount: transactions.length,
          monthlyBurn,
          runwayMonths: report.runwayMonths,
          alertCount: alerts.length,
        } as any,
        riskTier: 'AUTO_EXECUTE',
      },
    });

    return report;
  }

  /**
   * Calculate unit economics for SaaS/subscription businesses.
   */
  async calculateUnitEconomics(
    founderId: string,
    data: {
      totalSpend: number;       // Marketing spend
      newCustomers: number;     // New customers acquired
      mrr: number;              // Monthly recurring revenue
      arr: number;              // Annual recurring revenue
      previousArr?: number;     // Last quarter ARR
      previousQuarterMarketingSpend?: number;
      grossRevenue?: number;
      cogsCosts?: number;       // Cost of goods sold
      customerLifetime?: number; // Average months
      customerChurnRate?: number; // Monthly churn %
    },
  ): Promise<UnitEconomics> {
    const cac = data.newCustomers > 0 ? data.totalSpend / data.newCustomers : 0;
    const ltv = (data.customerLifetime || 24) * (data.mrr / Math.max(data.newCustomers, 1));
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const paybackPeriod = data.mrr > 0 ? cac / (data.mrr / Math.max(data.newCustomers, 1)) : 0;
    const grossMargin = data.grossRevenue
      ? ((data.grossRevenue - (data.cogsCosts || 0)) / data.grossRevenue) * 100
      : 0;
    
    const netNewArr = (data.arr || 0) - (data.previousArr || 0);
    const burnMultiple = netNewArr > 0 ? (data.totalSpend - (data.mrr * 3)) / netNewArr : 0;
    
    const magicNumber = data.previousQuarterMarketingSpend
      ? netNewArr / data.previousQuarterMarketingSpend
      : 0;

    // Composite health score (0-100)
    const healthScore = this.calculateHealthScore({
      ltvCacRatio,
      grossMargin,
      burnMultiple,
      magicNumber,
      runway: data.mrr > 0 ? data.totalSpend / data.mrr : 0,
    });

    const economics: UnitEconomics = {
      cac,
      ltv,
      ltvCacRatio,
      paybackPeriod,
      grossMargin,
      burnMultiple,
      magicNumber,
      healthScore,
    };

    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: '',
        action: 'unit_economics_calculated',
        details: economics as any,
        riskTier: 'AUTO_EXECUTE',
      },
    });

    return economics;
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private async categorizeTransactions(
    transactions: { date: string; description: string; amount: number; type: string }[],
  ): Promise<CategorizedTransaction[]> {
    if (transactions.length === 0) return [];

    // Batch categorize for efficiency (max 20 at a time)
    const batches: typeof transactions[] = [];
    for (let i = 0; i < transactions.length; i += 20) {
      batches.push(transactions.slice(i, i + 20));
    }

    const allCategorized: CategorizedTransaction[] = [];

    for (const batch of batches) {
      const descriptions = batch.map((t, i) => `${i + 1}. "${t.description}" (${t.type}, ₹${Math.abs(t.amount)})`).join('\n');

      const response = await this.llm.complete([
        {
          role: 'system',
          content: `Categorize these business transactions. Output valid JSON array:
[{"index": 1, "category": "Main category", "subcategory": "Sub category", "isRecurring": false, "confidence": 0.9}]

Categories: Revenue, Payroll, Marketing, Software/SaaS, Office/Rent, Travel, Professional Services, Cloud/Infrastructure, Legal, Taxes, Office Supplies, Utilities, Insurance, Equipment, Freelancer, Banking/Fees, Customer Refund, Other

Confidence: 0.0 to 1.0 based on description clarity.`,
        },
        {
          role: 'user',
          content: `Categorize these transactions:\n${descriptions}`,
        },
      ], { maxTokens: 2048, temperature: 0.1 });

      try {
        const parsed = JSON.parse(response.content) as any[];
        batch.forEach((t, i) => {
          const cat = parsed.find((p: any) => p.index === i + 1);
          allCategorized.push({
            id: `txn_${Date.now()}_${i}`,
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: cat?.category || 'Other',
            subcategory: cat?.subcategory || 'Uncategorized',
            isRecurring: cat?.isRecurring || false,
            confidence: cat?.confidence || 0.5,
          });
        });
      } catch {
        batch.forEach((t, i) => {
          allCategorized.push({
            id: `txn_${Date.now()}_${i}`,
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: 'Other',
            subcategory: 'Uncategorized',
            isRecurring: false,
            confidence: 0.3,
          });
        });
      }
    }

    return allCategorized;
  }

  private generateForecasts(
    balance: number,
    monthlyBurn: number,
    monthlyIncome: number,
    months: number,
  ): CashflowForecast[] {
    const forecasts: CashflowForecast[] = [];
    let optBalance = balance;
    let baseBalance = balance;
    let pessBalance = balance;
    const now = new Date();

    for (let i = 1; i <= months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const incomeVariance = 0.15;
      const expenseVariance = 0.10;

      const optIncome = monthlyIncome * (1 + incomeVariance);
      const pessIncome = monthlyIncome * (1 - incomeVariance);
      const baseIncome = monthlyIncome;

      const optExpense = monthlyBurn * (1 - expenseVariance);
      const pessExpense = monthlyBurn * (1 + expenseVariance);
      const baseExpense = monthlyBurn;

      optBalance += optIncome - optExpense;
      baseBalance += baseIncome - baseExpense;
      pessBalance += pessIncome - pessExpense;

      forecasts.push({
        month: monthStr,
        projectedIncome: Math.round(baseIncome),
        projectedExpenses: Math.round(baseExpense),
        projectedBalance: Math.round(baseBalance),
        scenario: 'base',
      });
      forecasts.push({
        month: monthStr,
        projectedIncome: Math.round(optIncome),
        projectedExpenses: Math.round(optExpense),
        projectedBalance: Math.round(optBalance),
        scenario: 'optimistic',
      });
      forecasts.push({
        month: monthStr,
        projectedIncome: Math.round(pessIncome),
        projectedExpenses: Math.round(pessExpense),
        projectedBalance: Math.round(pessBalance),
        scenario: 'pessimistic',
      });
    }

    return forecasts;
  }

  private generateAlerts(
    runwayMonths: number,
    monthlyBurn: number,
    netCashflow: number,
    balance: number,
  ): FinancialAlert[] {
    const alerts: FinancialAlert[] = [];

    if (runwayMonths < 1) {
      alerts.push({
        severity: 'emergency',
        title: '🚨 CRITICAL: Runway less than 1 month',
        description: `At current burn rate (₹${Math.round(monthlyBurn).toLocaleString('en-IN')}/month), funds will run out within 30 days.`,
        recommendation: 'Immediately cut non-essential expenses, accelerate revenue collection, and explore emergency funding options.',
      });
    } else if (runwayMonths < 3) {
      alerts.push({
        severity: 'critical',
        title: '⚠️ CRITICAL: Runway under 3 months',
        description: `Only ${runwayMonths.toFixed(1)} months of runway remaining at ₹${Math.round(monthlyBurn).toLocaleString('en-IN')}/month burn rate.`,
        recommendation: 'Begin fundraising process NOW. Reduce burn by cutting discretionary spending. Focus on revenue-generating activities.',
      });
    } else if (runwayMonths < 6) {
      alerts.push({
        severity: 'warning',
        title: '⚡ CAUTION: Runway under 6 months',
        description: `${runwayMonths.toFixed(1)} months runway. Start preparing for next funding round.`,
        recommendation: 'Prepare investor deck, clean up financials, and start building relationships with potential investors.',
      });
    }

    if (netCashflow < 0) {
      alerts.push({
        severity: runwayMonths < 6 ? 'warning' : 'info',
        title: '📉 Negative cashflow',
        description: `Spending ₹${Math.abs(Math.round(netCashflow)).toLocaleString('en-IN')} more than earning each month.`,
        recommendation: 'Review top expense categories and identify reduction opportunities. Consider pricing adjustments.',
      });
    }

    if (balance < monthlyBurn) {
      alerts.push({
        severity: 'critical',
        title: '💰 Balance below monthly burn',
        description: `Current balance (₹${balance.toLocaleString('en-IN')}) is less than one month of expenses.`,
        recommendation: 'Immediate cost reduction needed. Defer all non-essential payments.',
      });
    }

    return alerts;
  }

  private async generateRecommendations(
    monthlyBurn: number,
    runway: number,
    totalIncome: number,
    totalExpenses: number,
    transactions: CategorizedTransaction[],
    businessType?: string,
  ): Promise<string[]> {
    const topExpenses = transactions
      .filter(t => t.amount < 0)
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

    const response = await this.llm.complete([
      {
        role: 'system',
        content: `You are a startup financial advisor. Based on the financial data, provide 5-7 specific, actionable recommendations. Output a JSON array of strings: ["recommendation 1", "recommendation 2", ...]

Focus on:
1. Quick wins to reduce burn
2. Revenue acceleration strategies
3. Fundraising timing and preparation
4. Operational efficiency improvements
5. Risk mitigation

Be specific with numbers where possible.`,
      },
      {
        role: 'user',
        content: `Financial snapshot:
- Monthly burn: ₹${Math.round(monthlyBurn).toLocaleString('en-IN')}
- Runway: ${runway.toFixed(1)} months
- Total income (period): ₹${totalIncome.toLocaleString('en-IN')}
- Total expenses (period): ₹${totalExpenses.toLocaleString('en-IN')}
- Top expense categories: ${JSON.stringify(topExpenses)}
- Business type: ${businessType || 'Startup'}
- Net cashflow: ₹${Math.round(totalIncome - totalExpenses).toLocaleString('en-IN')}`,
      },
    ], { maxTokens: 1024, temperature: 0.5 });

    try {
      return JSON.parse(response.content);
    } catch {
      return response.content.split('\n').filter(l => l.trim().length > 5);
    }
  }

  private getTopExpenseCategories(transactions: CategorizedTransaction[]) {
    const categoryTotals = transactions
      .filter(t => t.amount < 0)
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

    const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }));
  }

  private getRecurringExpenses(transactions: CategorizedTransaction[]) {
    return transactions
      .filter(t => t.isRecurring && t.amount < 0)
      .map(t => ({
        description: t.description,
        amount: Math.abs(t.amount),
        frequency: 'monthly',
      }));
  }

  private getDateRange(transactions: { date: string }[]) {
    if (transactions.length === 0) return { months: 1 };
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const months = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (30 * 24 * 60 * 60 * 1000);
    return { months: Math.max(1, months) };
  }

  private getRunwayWarning(months: number): 'safe' | 'caution' | 'critical' | 'danger' {
    if (months >= 12) return 'safe';
    if (months >= 6) return 'caution';
    if (months >= 3) return 'critical';
    return 'danger';
  }

  private getCashflowTrend(transactions: CategorizedTransaction[]): 'improving' | 'stable' | 'declining' {
    if (transactions.length < 4) return 'stable';
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid).reduce((sum, t) => sum + t.amount, 0);
    const secondHalf = sorted.slice(mid).reduce((sum, t) => sum + t.amount, 0);
    if (secondHalf > firstHalf * 1.1) return 'improving';
    if (secondHalf < firstHalf * 0.9) return 'declining';
    return 'stable';
  }

  private calculateHealthScore(data: {
    ltvCacRatio: number;
    grossMargin: number;
    burnMultiple: number;
    magicNumber: number;
    runway: number;
  }): number {
    let score = 50; // baseline

    // LTV:CAC (30 points max)
    if (data.ltvCacRatio >= 3) score += 30;
    else if (data.ltvCacRatio >= 2) score += 20;
    else if (data.ltvCacRatio >= 1) score += 10;
    else score -= 10;

    // Gross margin (20 points max)
    if (data.grossMargin >= 80) score += 20;
    else if (data.grossMargin >= 60) score += 15;
    else if (data.grossMargin >= 40) score += 5;
    else score -= 10;

    // Burn multiple (20 points max)
    if (data.burnMultiple < 1) score += 20;
    else if (data.burnMultiple < 2) score += 10;
    else if (data.burnMultiple > 3) score -= 10;

    // Magic number (15 points max)
    if (data.magicNumber >= 1) score += 15;
    else if (data.magicNumber >= 0.75) score += 10;
    else if (data.magicNumber >= 0.5) score += 5;

    // Runway (15 points max)
    if (data.runway >= 18) score += 15;
    else if (data.runway >= 12) score += 10;
    else if (data.runway >= 6) score += 5;
    else score -= 15;

    return Math.max(0, Math.min(100, score));
  }
}
