import { getInviteIllustrationSize } from './getInviteIllustrationSize';

describe('getInviteIllustrationSize', () => {
  it('uses 140pt on a normal phone and keeps the lottie aspect', () => {
    expect(getInviteIllustrationSize(844)).toEqual({
      height: 140,
      width: Math.round(140 * (786 / 446)),
    });
    expect(getInviteIllustrationSize(668).height).toBe(140);
  });

  it('drops to 100pt on SE-class windows', () => {
    expect(getInviteIllustrationSize(667)).toEqual({
      height: 100,
      width: Math.round(100 * (786 / 446)),
    });
    expect(getInviteIllustrationSize(0).height).toBe(100);
  });

  it('keeps the default height when the window size is unusable', () => {
    expect(getInviteIllustrationSize(Number.NaN).height).toBe(140);
  });
});
