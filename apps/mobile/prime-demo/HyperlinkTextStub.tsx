import { SizableText } from '@onekeyhq/components/src/primitives/SizeableText';
import type { HyperlinkText } from '@onekeyhq/kit/src/components/HyperlinkText';

export const HyperlinkTextStub: typeof HyperlinkText = ({
  children,
  translationId,
  defaultMessage,
  onAction: _onAction,
  messages: _messages,
  values: _values,
  autoExecuteParsedAction: _autoExecuteParsedAction,
  urlTextProps: _urlTextProps,
  actionTextProps: _actionTextProps,
  underlineTextProps: _underlineTextProps,
  boldTextProps: _boldTextProps,
  textProps: _textProps,
  subscriptsTextProps: _subscriptsTextProps,
  scoped: _scoped,
  ...textStyleProps
}) => (
  <SizableText {...textStyleProps}>
    {children ?? defaultMessage ?? translationId}
  </SizableText>
);
