import { expect, it } from 'vitest';
import App from '../App.jsx';

it('loads the application module', () => {
  expect(App).toBeTypeOf('function');
});
