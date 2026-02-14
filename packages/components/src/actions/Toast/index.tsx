import type { RefObject } from 'react';
import { createRef, useEffect, useMemo, useRef } from 'react';

import { ToastProvider } from '@onekeyhq/components/src/shared/tamagui';
import { OneKeyLocalError } from '@onekeyhq/shared/src/errors/errors/localError';
import { dismissKeyboard } from '@onekeyhq/shared/src/keyboard';
import type { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { Portal } from '../../hocs';
import { useSettingConfig } from '../../hocs/Provider/hooks/useProviderValue';
import { useMedia } from '../../hooks/useStyle';
import {
  Icon,
  Image,
  SizableText,
  View,
  XStack,
  YStack,
} from '../../primitives';
import { Spinner } from '../../primitives/Spinner/Spinner';

import { ShowCustom, ShowToasterClose } from './ShowCustom';
import { showMessage } from './showMessage';

import type { IShowToasterInstance, IShowToasterProps } from './ShowCustom';
import type { IToastMessageOptions } from './type';
import type { IPortalManager } from '../../hocs';
import type { IKeyOfIcons, ISizableTextProps } from '../../primitives';
import { usePageWidth } from '../../hooks/usePage';
import { useWindowDimensions } from 'react-native';

export interface IToastProps {
  toastId?: string;
  title: string;
  message?: string;
  icon?: IKeyOfIcons;
  imageUri?: string;
  duration?: number;
  actionsAlign?: 'left' | 'right';
  actions?: JSX.Element | JSX.Element[];
  onClose?: () => void;
  dedupe?: boolean;
}

export interface IToastBaseProps extends IToastProps {
  title: string;
  message?: string;
  duration?: number;
  haptic?: 'success' | 'warning' | 'info' | 'error' | 'loading' | 'none';
  preset?: 'done' | 'error' | 'none' | 'custom';
  /**
   * Change the position of the toast.
   * Only works on web platform.
   * @platform web
   */
  position?: IToastMessageOptions['position'];
}

export interface IToastNotificationProps extends IToastBaseProps {
  onPress?: () => void;
  iconImageUri?: string;
}

const iconMap = {
  success: <Icon name="CheckRadioSolid" color="$iconSuccess" size="$5" />,
  error: <Icon name="ErrorSolid" color="$iconCritical" size="$5" />,
  info: <Icon name="InfoCircleSolid" color="$iconInfo" size="$5" />,
  warning: <Icon name="ErrorSolid" color="$iconCaution" size="$5" />,
  loading: <Spinner size="small" />,
};

function RenderLines({
  size,
  children: text,
  color,
}: {
  children?: string;
  size: ISizableTextProps['size'];
  color: ISizableTextProps['color'];
}) {
  const { HyperlinkText } = useSettingConfig();
  if (!text) {
    return null;
  }
  const lines = text?.split('\n') || [];

  if (lines.length === 0) {
    return null;
  }

  return (
    <YStack>
      {lines.map((line, index) => (
        <HyperlinkText
          key={index}
          color={color}
          textTransform="none"
          userSelect="none"
          underlineTextProps={{
            color: '$textSubdued',
          }}
          size={size}
          wordWrap="break-word"
          translationId={line as ETranslations}
          defaultMessage={line}
        />
      ))}
    </YStack>
  );
}

export function ToastContent({
  title,
  message,
  icon,
  maxWidth,
  actions,
  onClose,
  actionsAlign = 'right',
}: {
  title: string;
  message?: string;
  maxWidth?: number;
  icon?: JSX.Element;
  onClose?: () => void;
  actions?: IToastProps['actions'];
  actionsAlign?: 'left' | 'right';
}) {
  const { height } = useWindowDimensions();
  const pageWidth = usePageWidth();
  const media = useMedia();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(
    () => () => {
      onCloseRef.current?.();
    },
    [],
  );
  return (
    <YStack
      flex={1}
      maxWidth={maxWidth}
      maxHeight={height - 100}
      $platform-native={{
        maxHeight: height - 200,
        width: Math.min(pageWidth, 640) - 64,
      }}
      $platform-web={{
        overflow: 'hidden',
      }}
    >
      <XStack gap={icon ? '$2' : 0}>
        {icon ? (
          <View
            $platform-android={{
              paddingTop: '$0.5',
            }}
            width="$5.5"
            height="$5.5"
          >
            {icon}
          </View>
        ) : null}

        <YStack flex={1} gap="$1">
          {title ? (
            <RenderLines color="$text" size="$headingSm">
              {title}
            </RenderLines>
          ) : null}

          {message ? (
            <RenderLines
              color="$textSubdued"
              size={media.gtMd ? '$bodyMd' : '$bodySm'}
            >
              {message}
            </RenderLines>
          ) : null}

          {actions ? (
            <XStack
              gap="$2"
              justifyContent={
                actionsAlign === 'left' ? 'flex-start' : 'flex-end'
              }
              paddingTop="$3"
              paddingRight="$0.5"
              paddingBottom="$0.5"
            >
              {actions}
            </XStack>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  );
}

const toastIdMap = new Map<string, [number, number]>();

const handleToastDedup = ({
  title,
  message,
  haptic,
  toastId,
  dedupe = true,
  duration = 0,
  onClose,
}: {
  title: string;
  message?: string;
  haptic?: string;
  toastId?: string;
  dedupe?: boolean;
  duration?: number;
  onClose?: () => void;
}) => {
  if (platformEnv.isDev && title?.length === 0) {
    throw new OneKeyLocalError(
      `The parameter 'title' cannot be an empty string`,
    );
  }

  const dedupeKey =
    toastId ??
    (dedupe !== false
      ? `${haptic ?? ''}_${title}_${message ?? ''}`
      : undefined);

  const handleClose = () => {
    if (dedupeKey) {
      toastIdMap.delete(dedupeKey);
    }
    onClose?.();
  };

  if (dedupeKey && toastIdMap.has(dedupeKey)) {
    const [createdAt, toastDuration] = toastIdMap.get(dedupeKey)!;
    if (Date.now() - createdAt < toastDuration) {
      if (platformEnv.isNative) {
        return { shouldSkip: true, handleClose, dedupeKey };
      }
      toastIdMap.set(dedupeKey, [Date.now(), duration + 500]);
      return { shouldSkip: false, handleClose, dedupeKey };
    }
  }

  if (dedupeKey) {
    toastIdMap.set(dedupeKey, [Date.now(), duration + 500]);
  }
  return { shouldSkip: false, handleClose, dedupeKey };
};
function toastMessage({
  toastId,
  title,
  message,
  duration = 5000,
  haptic,
  preset = 'custom',
  actions,
  actionsAlign = 'right',
  position,
  onClose,
  dedupe,
}: IToastBaseProps) {
  const { shouldSkip, handleClose, dedupeKey } = handleToastDedup({
    title,
    message,
    haptic,
    toastId,
    dedupe,
    duration,
    onClose,
  });
  if (shouldSkip) return;

  return showMessage({
    renderContent: (props) => (
      <ToastContent
        onClose={handleClose}
        title={title}
        maxWidth={props?.width}
        message={message}
        icon={iconMap[haptic as keyof typeof iconMap]}
        actions={actions}
        actionsAlign={actionsAlign}
      />
    ),
    duration,
    haptic,
    preset,
    position,
    dedupeKey,
  });
}

function ToastNotificationContent({
  title,
  message,
  icon,
  iconImageUri,
  imageUri,
  onClose,
  onPress,
}: IToastNotificationProps) {
  const pageWidth = usePageWidth();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(
    () => () => {
      onCloseRef.current?.();
    },
    [],
  );
  const handlePress = () => {
    onPress?.();
  };
  const IconElement = useMemo(() => {
    if (iconImageUri) {
      return <Image source={{ uri: iconImageUri }} size={18} />;
    }
    return (
      <Icon size={18} name={icon || 'SpeakerPromoteOutline'} color="$icon" />
    );
  }, [iconImageUri, icon]);
  return (
    <XStack
      gap="$2"
      cursor="pointer"
      onPress={handlePress}
      flex={1}
      $platform-native={{
        width: Math.min(pageWidth, 640) - 64,
      }}
    >
      <XStack
        bg="$bgStrong"
        borderRadius="$full"
        ai="center"
        jc="center"
        w={28}
        h={28}
      >
        {IconElement}
      </XStack>
      <YStack flex={1} gap={2} flexShrink={1} minWidth={0}>
        <SizableText size="$headingSm" numberOfLines={2} flexShrink={1}>
          {title}
        </SizableText>
        <SizableText
          size="$bodyMd"
          color="$textSubdued"
          numberOfLines={3}
          flexShrink={1}
        >
          {message}
        </SizableText>
      </YStack>
      {imageUri ? (
        <Image borderRadius="$1" size="$12" source={{ uri: imageUri }} />
      ) : null}
    </XStack>
  );
}

function toastNotification({
  toastId,
  title,
  message,
  icon,
  iconImageUri,
  imageUri,
  duration = 5000,
  haptic,
  preset = 'custom',
  actions,
  actionsAlign = 'right',
  position,
  onPress,
  onClose,
  dedupe,
}: IToastNotificationProps) {
  const { shouldSkip, handleClose, dedupeKey } = handleToastDedup({
    title,
    message,
    haptic,
    toastId,
    dedupe,
    duration,
    onClose,
  });
  if (shouldSkip) return;

  return showMessage({
    renderContent: (_props) => (
      <ToastNotificationContent
        onClose={handleClose}
        title={title}
        imageUri={imageUri}
        message={message}
        icon={icon}
        iconImageUri={iconImageUri}
        actions={actions}
        actionsAlign={actionsAlign}
        onPress={onPress}
      />
    ),
    duration,
    haptic,
    preset,
    position,
    dedupeKey,
  });
}

export { default as Toaster } from './Toaster';

export type IToastShowResult = {
  close: (extra?: { flag?: string }) => void | Promise<void>;
};
export const Toast = {
  success: (props: IToastProps) => {
    return toastMessage({ haptic: 'success', ...props });
  },
  error: (props: IToastProps) => {
    return toastMessage({ haptic: 'error', ...props });
  },
  warning: (props: IToastProps) => {
    return toastMessage({ haptic: 'warning', ...props });
  },
  message: (props: IToastProps) => {
    return toastMessage({ haptic: 'info', preset: 'none', ...props });
  },
  loading: (props: IToastProps) => {
    return toastMessage({ haptic: 'loading', ...props });
  },
  notification: (props: IToastNotificationProps) => {
    return toastNotification({ haptic: 'info', preset: 'none', ...props });
  },
  /* show custom view on Toast */
  show: ({
    onClose,
    children,
    ...others
  }: IShowToasterProps): IToastShowResult => {
    dismissKeyboard();
    let instanceRef: RefObject<IShowToasterInstance | null> | undefined =
      createRef();
    let portalRef:
      | {
          current: IPortalManager;
        }
      | undefined;

    const handleClose = (extra?: { flag?: string }) =>
      new Promise<void>((resolve) => {
        // Remove the React node after the animation has finished.
        setTimeout(() => {
          if (instanceRef) {
            instanceRef = undefined;
          }
          if (portalRef) {
            portalRef.current.destroy();
            portalRef = undefined;
          }
          void onClose?.(extra);
          resolve();
        }, 300);
      });
    portalRef = {
      current: Portal.Render(
        Portal.Constant.TOASTER_OVERLAY_PORTAL,
        <ShowCustom ref={instanceRef} onClose={handleClose} {...others}>
          {children}
        </ShowCustom>,
      ),
    };
    const close = async (extra?: { flag?: string }, times = 0) => {
      if (times > 10) {
        return;
      }
      if (!instanceRef?.current) {
        setTimeout(() => {
          void close(extra, times + 1);
        }, 10);
        return Promise.resolve();
      }
      return instanceRef?.current?.close(extra);
    };
    const r: IToastShowResult = {
      close,
    };
    return r;
  },
  Close: ShowToasterClose,
};
export type IToast = typeof Toast;

export { useToaster } from './ShowCustom';
export type { IShowToasterProps } from './ShowCustom';

export function ShowToastProvider() {
  return (
    <ToastProvider swipeDirection="up">
      <Portal.Container name={Portal.Constant.TOASTER_OVERLAY_PORTAL} />
    </ToastProvider>
  );
}
