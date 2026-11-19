import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'prisma/**/*', 'infrastructure/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
