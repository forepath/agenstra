import type { AgenstraContext } from '../types';
import { CursorTransformer } from './cursor.transformer';

describe('CursorTransformer', () => {
  const transformer = new CursorTransformer();

  it('should output rules as .mdc with frontmatter, commands as .md, skills as folder/SKILL.md, agents as .md, mcp as .json', () => {
    const context: AgenstraContext = {
      metadata: { version: '1.0', appName: 'test' },
      rules: { 'coding-standards': '# Coding Standards\n' },
      commands: { refactor: { id: 'refactor', name: 'Refactor', prompt: 'Refactor this' } },
      skills: { 'design-patterns': '# Design Patterns\n' },
      agents: {
        architect: {
          id: 'architect',
          name: 'Architect',
          mode: 'primary',
        } as import('../types').AgenstraAgent,
      },
      subagents: {
        general: {
          id: 'general',
          name: 'General',
          mode: 'subagent',
        } as import('../types').AgenstraSubagent,
      },
      mcpDefinitions: { 'file-system': { id: 'file-system' } },
    };

    const out = transformer.transform(context);

    const ruleContent = out.get('.cursor/rules/coding-standards.mdc') as string;
    expect(ruleContent).toContain('description:');
    expect(ruleContent).toContain('globs: []');
    expect(ruleContent).toContain('alwaysApply: false');
    expect(ruleContent).toContain('# Coding Standards');

    expect(out.get('.cursor/commands/refactor.md')).toBeDefined();
    expect(out.get('.cursor/commands/refactor.md') as string).toContain('Refactor this');

    const skillContent = out.get('.cursor/skills/design-patterns/SKILL.md') as string;
    expect(skillContent).toContain('name:');
    expect(skillContent).toContain('# Design Patterns');

    expect(out.get('.cursor/agents/architect.md')).toBeDefined();
    expect(out.get('.cursor/agents/general.md')).toBeDefined();
    const mcpContent = out.get('.cursor/mcp.json') as string;
    expect(mcpContent).toBeDefined();
    expect(JSON.parse(mcpContent)).toHaveProperty('mcpServers');
    expect(out.size).toBe(6);
  });
});
