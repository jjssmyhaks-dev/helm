import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class ProjectManagementAgent implements SpecialistAgent {
  name = 'Project Management Agent';
  layer = 'OPERATIONS';
  private readonly logger = new Logger(ProjectManagementAgent.name);

  capabilities = [
    { name: 'Task Planning', description: 'Break down projects into tasks', examples: ['Plan a product launch'] },
    { name: 'Sprint Planning', description: 'Plan sprints with priorities', examples: ['Plan next sprint'] },
    { name: 'OKR Setting', description: 'Set objectives and key results', examples: ['Set Q3 OKRs'] },
    { name: 'Status Reports', description: 'Generate project status reports', examples: ['Create a status report'] },
    { name: 'Process Design', description: 'Design workflows and SOPs', examples: ['Design our onboarding process'] },
  ];

  constructor(private llm: LLMService, private tools: AgentToolConnectorService) {}

  canHandle(intent: string): boolean {
    return ['project', 'task', 'sprint', 'okr', 'deadline', 'milestone', 'workflow', 'process', 'sop', 'status report', 'roadmap', 'backlog'].some(k => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, _intent: string, _params: Record<string, string>, message: string): Promise<AgentResult> {
    const toolCalls: AgentResult['toolCalls'] = [];
    try {
      const result = await this.tools.executeTool(founderId, 'TRELLO_CREATE_CARD', { name: 'Task from Helm', desc: message });
      if (result.success) toolCalls?.push({ tool: 'TRELLO_CREATE_CARD', input: {}, output: result.result });
    } catch { /* not connected */ }

    const response = await this.llm.complete([
      { role: 'system', content: 'You are a senior project manager. Provide structured plans with tasks, timelines, and priorities. Output JSON: {"plan":"<markdown>","tasks":[{"title":"","priority":"high/medium/low","estimate":"","assignee":""}],"timeline":[{"phase":"","duration":"","milestone":""}],"recommendations":[""]}' },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.4 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 📋 Project Plan\n\n${parsed.plan}\n\n`;
      if (parsed.tasks?.length > 0) { md += `### Tasks\n`; for (const t of parsed.tasks) { const icon = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'; md += `- ${icon} **${t.title}** — ${t.estimate} | ${t.assignee}\n`; } md += '\n'; }
      if (parsed.timeline?.length > 0) { md += `### Timeline\n`; for (const t of parsed.timeline) { md += `- **${t.phase}** (${t.duration}) — ${t.milestone}\n`; } }
      return { agentName: this.name, response: md, toolCalls, suggestions: parsed.recommendations || [], confidence: 0.85 };
    } catch { return { agentName: this.name, response: response.content, toolCalls, confidence: 0.7 }; }
  }
}
