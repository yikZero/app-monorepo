import { sortCommissionRateItems } from '@onekeyhq/kit/src/views/ReferFriends/utils';

export interface IInviteValueLineItem {
  subject: string;
  you: number;
  enabled: boolean;
}

export interface IInviteValueLineConfig {
  rebate: number;
  enabled?: boolean;
}

const VALUE_LINE_LABELS: Record<string, { zh: string; en: string }> = {
  HardwareSales: { zh: '硬件', en: 'hardware' },
  Perp: { zh: '合约', en: 'Perps fees' },
  Swap: { zh: 'Swap', en: 'Swap fees' },
  Earn: { zh: 'DeFi', en: 'DeFi fees' },
  Onchain: { zh: 'DeFi', en: 'DeFi fees' },
};

function isKnownSubject(subject: string) {
  return Object.prototype.hasOwnProperty.call(VALUE_LINE_LABELS, subject);
}

function formatRate(value: number): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function labelFor(subject: string, isZh: boolean) {
  const known = VALUE_LINE_LABELS[subject];
  if (!known) {
    return subject;
  }
  return isZh ? known.zh : known.en;
}

export function selectInviteValueLineItems({
  commissionRates,
  configs,
}: {
  commissionRates: readonly IInviteValueLineItem[];
  configs?: Record<string, IInviteValueLineConfig>;
}): IInviteValueLineItem[] {
  const hasKnownSubject = commissionRates.some((item) =>
    isKnownSubject(item.subject),
  );
  if ((commissionRates.length > 0 && hasKnownSubject) || !configs) {
    return [...commissionRates];
  }
  return Object.entries(configs).map(([subject, rate]) => ({
    subject,
    you: rate.rebate,
    enabled: rate.enabled === true,
  }));
}

export function getInviteValueLine(
  commissionRates: readonly IInviteValueLineItem[],
  locale: string,
): string | null {
  const isZh = locale.toLowerCase().startsWith('zh');
  const parts = sortCommissionRateItems([...commissionRates]).flatMap(
    (item) => {
      if (!item.enabled) {
        return [];
      }
      const rate = formatRate(item.you);
      if (rate === null) {
        return [];
      }
      return [{ label: labelFor(item.subject, isZh), rate }];
    },
  );

  const first = parts[0];
  if (!first) {
    return null;
  }

  if (isZh) {
    return parts.map((part) => `${part.label} ${part.rate}%`).join(' · ');
  }

  const rest = parts.slice(1);
  const head = `Earn ${first.rate}% on ${first.label}`;
  if (rest.length === 0) {
    return head;
  }
  return [head, ...rest.map((part) => `${part.rate}% on ${part.label}`)].join(
    ' · ',
  );
}
