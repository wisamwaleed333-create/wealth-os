import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme, toggleThemeMode } from './theme.ts';

test('resolveInitialTheme honors explicit stored preference over OS preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to OS preference when storage is unset or invalid', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(undefined, false), 'light');
  assert.equal(resolveInitialTheme('unexpected', true), 'dark');
});

test('toggleThemeMode switches cleanly between light and dark', () => {
  assert.equal(toggleThemeMode('light'), 'dark');
  assert.equal(toggleThemeMode('dark'), 'light');
});
