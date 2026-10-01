import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// eslint-plugin-react doesn't support ESLint 10 yet; this is its jsx-uses-vars rule,
// so components that are only used as <Tags /> don't count as unused imports.
const jsx = {
  rules: {
    'uses-vars': {
      create(context) {
        return {
          JSXOpeningElement(node) {
            let name = node.name
            while (name.type === 'JSXMemberExpression') name = name.object
            if (name.type === 'JSXIdentifier') context.sourceCode.markVariableAsUsed(name.name, node)
          },
        }
      },
    },
  },
}

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { jsx, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      'jsx/uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
