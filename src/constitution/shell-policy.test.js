import { describe, it, expect, beforeAll } from 'vitest';

describe('Shell Permission Policy', () => {
  let checkCommand;

  beforeAll(async () => {
    const mod = await import('./shell-policy');
    checkCommand = mod.checkCommand;
  });

  it('cat 命令 → 默认返回 prompt（需确认）', () => {
    const result = checkCommand('cat file.txt', { fullAccess: false });
    expect(result.decision).toBe('prompt');
    expect(result.risk).toBe('low');
  });

  it('cat 命令在完全访问模式下 → 返回 allow（自动执行）', () => {
    const result = checkCommand('cat file.txt', {
      fullAccess: true,
      whitelist: ['cat'],
    });
    expect(result.decision).toBe('allow');
  });

  it('rm 命令 → 返回 forbidden（永禁）', () => {
    const result = checkCommand('rm -rf /tmp', { fullAccess: true });
    expect(result.decision).toBe('forbidden');
    expect(result.justification).toBeDefined();
  });

  it('sudo 命令 → forbidden', () => {
    const result = checkCommand('sudo ls', { fullAccess: true });
    expect(result.decision).toBe('forbidden');
  });

  it('git status → prompt', () => {
    const result = checkCommand('git status', { fullAccess: false });
    expect(result.decision).toBe('prompt');
    expect(result.risk).toBe('low');
  });

  it('git commit → prompt（即使完全访问）', () => {
    const result = checkCommand('git commit -m "fix"', {
      fullAccess: true,
      whitelist: ['git'],
    });
    // git commit is a write operation, always prompt
    expect(result.decision).toBe('prompt');
  });

  it('未识别的命令 → forbidden', () => {
    const result = checkCommand('unknown_command', { fullAccess: true });
    expect(result.decision).toBe('forbidden');
  });

  it('curl → prompt + 网络授权标志', () => {
    const result = checkCommand('curl https://example.com', { fullAccess: false });
    expect(result.decision).toBe('prompt');
    expect(result.requiresNetwork).toBe(true);
  });

  it('白名单命令不匹配 → 仍按默认策略', () => {
    const result = checkCommand('python script.py', {
      fullAccess: true,
      whitelist: ['cat', 'ls'],
    });
    expect(result.decision).toBe('prompt');
  });
});
