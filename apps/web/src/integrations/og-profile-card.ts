import { type Locale, t } from '@/shared/i18n/index.ts';

import { type CardNode, cardRootStyle, palette, renderCardTree, rgba, text } from './og-card.ts';

export type ProfileCardContent = {
  domain: string;
  eyebrow: string;
  name: string;
  role: string;
  facts: string[];
  status?: { text: string; open: boolean };
  /** Square photo as a `data:` URI; the card has no photo when omitted. */
  avatar?: string;
};

/** The slice of the site config the profile card reads. */
export type ProfileSite = {
  url: string;
  identity: {
    name: string;
    role: Record<string, string>;
    location?: string | undefined;
    startedYear: number;
  };
  recruiter: {
    available: boolean;
    openToWork: boolean;
    status: Record<string, string>;
  };
};

/** Card text from the site config and the page locale (no photo: that is read from disk). */
export function profileCardContentFor(
  site: ProfileSite,
  locale: Locale,
  referenceYear = new Date().getUTCFullYear(),
): ProfileCardContent {
  const years = t(locale, 'recruiter.years', {
    years: Math.max(0, referenceYear - site.identity.startedYear),
  });
  const status = site.recruiter.status[locale];
  return {
    domain: `${new URL(site.url).host}/me`,
    eyebrow: t(locale, 'me.hello'),
    name: site.identity.name,
    role: site.identity.role[locale] ?? '',
    facts: [...(site.identity.location ? [site.identity.location] : []), years],
    ...(site.recruiter.available && status
      ? { status: { text: status, open: site.recruiter.openToWork } }
      : {}),
  };
}

const RING = 312;
const PHOTO = 300;

function photo(avatar: string): CardNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: RING,
        height: RING,
        borderRadius: RING / 2,
        padding: (RING - PHOTO) / 2,
        backgroundImage: `linear-gradient(135deg, ${palette['primary'] ?? '#a78bfa'}, ${palette['cyan'] ?? '#22d3ee'}, ${palette['pink'] ?? '#ec4899'})`,
      },
      children: {
        type: 'img',
        props: {
          src: avatar,
          width: PHOTO,
          height: PHOTO,
          style: { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2 },
        },
      },
    },
  };
}

function statusPill(status: NonNullable<ProfileCardContent['status']>): CardNode {
  const dot = status.open ? (palette['ok'] ?? '#34d399') : (palette['danger'] ?? '#fb7185');
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        alignSelf: 'flex-start',
        padding: '10px 22px',
        borderRadius: 999,
        backgroundColor: rgba(palette['primary'] ?? '#a78bfa', 0.14),
      },
      children: [
        {
          type: 'div',
          props: { style: { width: 16, height: 16, borderRadius: 8, backgroundColor: dot } },
        },
        text({ fontSize: 24, color: palette['text-secondary'] ?? '#c3c9d4' }, status.text),
      ],
    },
  };
}

/** The satori tree of the `/me` card: identity on the left, photo ringed in the brand gradient. */
export function buildProfileCardTree(content: ProfileCardContent): CardNode {
  return {
    type: 'div',
    props: {
      style: {
        ...cardRootStyle,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              maxWidth: content.avatar ? 640 : 1020,
            },
            children: [
              text(
                { fontSize: 28, color: palette['cyan'] ?? '#22d3ee', marginBottom: 26 },
                content.domain,
              ),
              text(
                {
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: palette['pink'] ?? '#ec4899',
                },
                content.eyebrow,
              ),
              text({ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }, content.name),
              text(
                { fontSize: 32, lineHeight: 1.3, color: palette['muted'] ?? '#8b949e' },
                content.role,
              ),
              text(
                { fontSize: 26, marginTop: 8, color: palette['text-secondary'] ?? '#c3c9d4' },
                content.facts.join('  ·  '),
              ),
              ...(content.status
                ? [
                    {
                      ...statusPill(content.status),
                      props: {
                        ...statusPill(content.status).props,
                        style: { ...statusPill(content.status).props.style, marginTop: 26 },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        ...(content.avatar ? [photo(content.avatar)] : []),
      ],
    },
  };
}

export const renderProfileCardPng = (content: ProfileCardContent): Promise<Buffer> =>
  renderCardTree(buildProfileCardTree(content));
