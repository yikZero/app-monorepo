const INVITE_ILLUSTRATION_ASPECT = 786 / 446;

export function getInviteIllustrationSize(windowHeight: number): {
  width: number;
  height: number;
} {
  const height =
    Number.isFinite(windowHeight) && windowHeight <= 667 ? 100 : 140;
  return {
    height,
    width: Math.round(height * INVITE_ILLUSTRATION_ASPECT),
  };
}
