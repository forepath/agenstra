import * as fs from 'fs';
import * as path from 'path';
import { readContext } from './context-reader';

describe('readContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(process.cwd(), 'tmp-reader-test-' + Date.now());
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should throw when directory does not exist', () => {
    expect(() => readContext(path.join(tmpDir, '.agenstra'))).toThrow(/Not a directory/);
  });

  it('should throw when metadata.json is missing or invalid', () => {
    fs.mkdirSync(path.join(tmpDir, '.agenstra'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agenstra', 'metadata.json'), '{}', 'utf-8');
    expect(() => readContext(path.join(tmpDir, '.agenstra'))).toThrow(/version and appName/);
  });

  it('should read valid .agenstra and return context', () => {
    const agenstraDir = path.join(tmpDir, '.agenstra');
    fs.mkdirSync(agenstraDir, { recursive: true });
    fs.mkdirSync(path.join(agenstraDir, 'rules'), { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
      'utf-8',
    );
    fs.writeFileSync(path.join(agenstraDir, 'rules', 'coding.mdc'), '---\n---\n\n# Coding\n', 'utf-8');

    const context = readContext(agenstraDir);
    expect(context.metadata.appName).toBe('test-app');
    const codingRule = context.rules['coding'];
    expect(typeof codingRule === 'string' ? codingRule : codingRule.content).toContain('# Coding');
    expect(Object.keys(context.commands)).toEqual([]);
    expect(Object.keys(context.skills)).toEqual([]);
    expect(Object.keys(context.agents)).toEqual([]);
    expect(Object.keys(context.subagents)).toEqual([]);
  });

  it('should read agents and subagents from .agent.mdc and .subagent.mdc', () => {
    const agenstraDir = path.join(tmpDir, '.agenstra');
    fs.mkdirSync(agenstraDir, { recursive: true });
    fs.mkdirSync(path.join(agenstraDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(agenstraDir, 'subagents'), { recursive: true });
    fs.writeFileSync(
      path.join(agenstraDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', appName: 'test-app' }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(agenstraDir, 'agents', 'architect.agent.mdc'),
      `---
name: Code Architect Agent
description: Designs architecture
mode: primary
temperature: 0.2
tools:
  write: false
  edit: false
  bash: false
---
Execute tasks according to the agent configuration.
`,
      'utf-8',
    );
    fs.writeFileSync(
      path.join(agenstraDir, 'subagents', 'general.subagent.mdc'),
      `---
name: General Agent
description: General-purpose agent
mode: subagent
---
General instructions here.
`,
      'utf-8',
    );

    const context = readContext(agenstraDir);
    expect(context.agents['architect']).toBeDefined();
    expect(context.agents['architect'].name).toBe('Code Architect Agent');
    expect(context.agents['architect'].description).toBe('Designs architecture');
    expect(context.agents['architect'].mode).toBe('primary');
    expect(context.agents['architect'].temperature).toBe(0.2);
    expect(context.agents['architect'].tools).toEqual({
      write: false,
      edit: false,
      bash: false,
    });
    expect(context.agents['architect'].body).toContain('Execute tasks according to');

    expect(context.subagents['general']).toBeDefined();
    expect(context.subagents['general'].name).toBe('General Agent');
    expect(context.subagents['general'].mode).toBe('subagent');
    expect(context.subagents['general'].body).toContain('General instructions here');
  });
});
