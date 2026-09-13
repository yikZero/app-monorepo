export function getReferralJobTabLabels(locale: string): {
  invite: string;
  benefits: string;
} {
  if (locale.toLowerCase().startsWith('zh')) {
    return {
      invite: '邀请',
      benefits: '福利',
    };
  }
  return {
    invite: 'Invite',
    benefits: 'Benefits',
  };
}
