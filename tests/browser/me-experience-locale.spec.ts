import { expect, type Page, test } from '@playwright/test';

import { text } from './helpers/site';

/**
 * The `/me` experience timeline follows the page language: role and summary come from the
 * per-locale entries of `content/experience.json`, so `/en/me/` shows no Spanish experience text.
 * Companies are proper nouns and stay the same in both languages.
 */
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'locale content is viewport independent');
});

const ES = {
  path: '/me/',
  heading: text('es', 'me.experience'),
  roles: ['Ingeniero de software', 'Desarrollador de software', 'Desarrollador full-stack'],
  summaries: [
    'Entrega de extremo a extremo en un SaaS de recursos humanos',
    'Flujos ETL desde Excel hacia AWS S3',
    'Análisis de requisitos y desarrollo con .NET Framework y React',
    'Liderazgo del desarrollo con el stack MERN',
  ],
  contributions: ['Integro IA en el producto', 'Automaticé el ETL de Excel a AWS S3'],
};

const EN = {
  path: '/en/me/',
  heading: text('en', 'me.experience'),
  roles: ['Software Engineer', 'Software Developer', 'Full-stack Developer'],
  summaries: [
    'End-to-end delivery on an HR SaaS',
    'ETL flows from Excel to AWS S3',
    'Requirements analysis and development with .NET Framework and React',
    'Led development with the MERN stack',
  ],
  contributions: ['I integrate AI into the product', 'Automated the Excel-to-AWS-S3 ETL'],
};

const COMPANIES = [
  'Buo',
  'Blue Zone Consulting Partners',
  'CNET Technology Systems',
  'Hacienda el Orosi',
];

const experienceText = async (page: Page, path: string, heading: string): Promise<string> => {
  await page.goto(path);
  const section = page.locator('main section', {
    has: page.getByRole('heading', { name: heading, exact: true }),
  });
  await expect(section).toHaveCount(1);
  return section.innerText();
};

test.describe('the experience timeline', () => {
  test('shows the Spanish roles and summaries on /me/ and none of the English ones', async ({
    page,
  }) => {
    const text = await experienceText(page, ES.path, ES.heading);
    for (const fragment of [...ES.roles, ...ES.summaries, ...ES.contributions, ...COMPANIES]) {
      expect(text, fragment).toContain(fragment);
    }
    for (const fragment of EN.summaries) expect(text, fragment).not.toContain(fragment);
    for (const fragment of EN.contributions) expect(text, fragment).not.toContain(fragment);
    for (const role of ['Software Engineer', 'Software Developer', 'Full-stack Developer']) {
      expect(text, role).not.toContain(role);
    }
  });

  test('shows the English roles and summaries on /en/me/ and none of the Spanish ones', async ({
    page,
  }) => {
    const text = await experienceText(page, EN.path, EN.heading);
    for (const fragment of [...EN.roles, ...EN.summaries, ...EN.contributions, ...COMPANIES]) {
      expect(text, fragment).toContain(fragment);
    }
    for (const fragment of [...ES.roles.slice(0, 2), ...ES.summaries, ...ES.contributions]) {
      expect(text, fragment).not.toContain(fragment);
    }
    expect(text).not.toContain('Desarrollador full-stack');
  });
});
