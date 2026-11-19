import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Firestore Security Rules & Blueprint Integrity', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const draftRulesPath = path.resolve(process.cwd(), 'DRAFT_firestore.rules');
  const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

  const getRules = () => {
    if (fs.existsSync(rulesPath)) return fs.readFileSync(rulesPath, 'utf-8');
    return fs.readFileSync(draftRulesPath, 'utf-8');
  };

  it('enforces rules_version = 2 and global default-deny catch-all', () => {
    const rules = getRules();
    expect(rules).toContain("rules_version = '2';");
    expect(rules).toContain('match /{document=**}');
    expect(rules).toContain('allow read, write: if false;');
  });

  it('covers all collections defined in firebase-blueprint.json', () => {
    const rules = getRules();
    const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
    const collections = Object.keys(blueprint.firestore || {});
    expect(collections.length).toBeGreaterThanOrEqual(15);
    for (const colPath of collections) {
      const segment = colPath.split('/').filter((s) => !s.startsWith('{')).pop()!;
      expect(rules).toContain(segment);
    }
  });

  it('never places get() or exists() inside allow list blocks', () => {
    const rules = getRules();
    const listLines = rules
      .split('\n')
      .filter((line) => line.trim().startsWith('allow list:'));
    expect(listLines.length).toBeGreaterThan(10);
    for (const line of listLines) {
      expect(line).not.toContain('get(');
      expect(line).not.toContain('exists(');
    }
  });

  it('requires email_verified == true and validates IDs against ID poisoning', () => {
    const rules = getRules();
    expect(rules).toContain('request.auth.token.email_verified == true');
    expect(rules).toContain('function isValidId(id)');
    expect(rules).toContain("id.matches('^[a-zA-Z0-9_\\\\-]+$')");
  });

  it('enforces Master Gate on subcollections and terminal state locking', () => {
    const rules = getRules();
    expect(rules).toContain("existing().status != 'COMPLETED'");
    expect(rules).toContain("existing().status != 'ARCHIVED'");
    expect(rules).toContain('exists(/databases/$(database)/documents/customers/$(customerId))');
    expect(rules).toContain('exists(/databases/$(database)/documents/conversations/$(conversationId))');
  });
});
