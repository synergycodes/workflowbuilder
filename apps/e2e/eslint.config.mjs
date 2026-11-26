import rootConfig from '../../eslint.config.mjs';

export default [{ ignores: ['playwright-report/', 'test-results/'] }, ...rootConfig];
