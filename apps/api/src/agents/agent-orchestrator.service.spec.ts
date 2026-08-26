import { AgentOrchestratorService, SpecialistAgent } from './agent-orchestrator.service';

const mockLlm = {
  complete: jest.fn().mockResolvedValue({ content: 'General response from Helm' }),
} as any;

const mockToolConnector = {
  getAvailableTools: jest.fn().mockResolvedValue([]),
} as any;

function makeAgent(name: string, layer: string, keywords: string[]): SpecialistAgent {
  return {
    name,
    layer,
    capabilities: [{ name, description: `Does ${name}`, examples: [] }],
    canHandle: (intent: string) => keywords.some((k) => intent.toLowerCase().includes(k)),
    execute: jest.fn().mockResolvedValue({ agentName: name, response: `Response from ${name}`, confidence: 0.9 }),
  };
}

describe('AgentOrchestratorService', () => {
  let orchestrator: AgentOrchestratorService;
  const writingAgent = makeAgent('Writing Agent', 'MARKETING', ['write', 'draft', 'blog', 'article']);
  const financeAgent = makeAgent('Finance Agent', 'FINANCE', ['cash flow', 'revenue', 'budget', 'tax']);
  const seoAgent = makeAgent('SEO Agent', 'RESEARCH', ['seo', 'serp', 'backlink', 'on-page']);
  const metaAdsAgent = makeAgent('Meta Ads Agent', 'MARKETING', ['meta ads', 'facebook ads']);

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new AgentOrchestratorService(mockLlm, mockToolConnector);
    orchestrator.register(writingAgent, financeAgent, seoAgent, metaAdsAgent);
  });

  describe('register', () => {
    it('should register multiple agents via spread', () => {
      expect(orchestrator.getAgents()).toHaveLength(4);
    });

    it('should register agents one at a time', () => {
      const o = new AgentOrchestratorService(mockLlm, mockToolConnector);
      o.register(writingAgent);
      o.register(financeAgent);
      expect(o.getAgents()).toHaveLength(2);
    });
  });

  describe('findAgent', () => {
    it('should find Writing Agent for "write a blog post"', () => {
      expect(orchestrator.findAgent('write a blog post about AI')?.name).toBe('Writing Agent');
    });

    it('should find Finance Agent for "cash flow analysis"', () => {
      expect(orchestrator.findAgent('analyze my cash flow')?.name).toBe('Finance Agent');
    });

    it('should find SEO Agent for "serp analysis"', () => {
      expect(orchestrator.findAgent('check my serp rankings')?.name).toBe('SEO Agent');
    });

    it('should find Meta Ads Agent for "facebook ads"', () => {
      expect(orchestrator.findAgent('create a facebook ads campaign')?.name).toBe('Meta Ads Agent');
    });

    it('should return null for unmatched intent', () => {
      expect(orchestrator.findAgent('hello how are you')).toBeNull();
    });

    it('should match first registered agent when keywords overlap', () => {
      // "draft ad copy" — writing has 'draft', meta-ads has 'meta ads' but not 'draft'
      expect(orchestrator.findAgent('draft ad copy')?.name).toBe('Writing Agent');
    });
  });

  describe('route', () => {
    it('should route to the matching specialist agent', async () => {
      const result = await orchestrator.route('f1', 'write a blog post');
      expect(result.agentName).toBe('Writing Agent');
      expect(result.response).toBe('Response from Writing Agent');
      expect(writingAgent.execute).toHaveBeenCalledWith('f1', 'write a blog post', {}, 'write a blog post');
    });

    it('should route using explicit intent parameter', async () => {
      const result = await orchestrator.route('f1', 'do something', 'cash flow report');
      expect(result.agentName).toBe('Finance Agent');
    });

    it('should fallback to general LLM when no agent matches', async () => {
      const result = await orchestrator.route('f1', 'hello how are you');
      expect(result.agentName).toBe('general');
      expect(result.response).toBe('General response from Helm');
      expect(mockLlm.complete).toHaveBeenCalled();
    });

    it('should fallback to general when agent execution fails', async () => {
      (writingAgent.execute as jest.Mock).mockRejectedValueOnce(new Error('LLM timeout'));
      const result = await orchestrator.route('f1', 'write a blog post');
      expect(result.agentName).toBe('general');
    });

    it('should include tool list in general response', async () => {
      mockToolConnector.getAvailableTools.mockResolvedValueOnce([
        { name: 'gmail', description: 'Send emails' },
        { name: 'slack', description: 'Send messages' },
      ]);
      const result = await orchestrator.route('f1', 'random question');
      expect(result.agentName).toBe('general');
      const systemMsg = mockLlm.complete.mock.calls[0][0][0].content;
      expect(systemMsg).toContain('gmail');
      expect(systemMsg).toContain('slack');
    });
  });

  describe('getAgents', () => {
    it('should return capabilities for each agent', () => {
      for (const agent of orchestrator.getAgents()) {
        expect(agent.capabilities.length).toBeGreaterThan(0);
        expect(agent.capabilities[0]).toHaveProperty('name');
        expect(agent.capabilities[0]).toHaveProperty('description');
      }
    });

    it('should include layer information', () => {
      const agents = orchestrator.getAgents();
      expect(agents.find((a) => a.name === 'Finance Agent')?.layer).toBe('FINANCE');
      expect(agents.find((a) => a.name === 'SEO Agent')?.layer).toBe('RESEARCH');
    });
  });
});
