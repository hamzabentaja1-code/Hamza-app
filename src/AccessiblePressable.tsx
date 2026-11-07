import React, {ReactNode, isValidElement} from 'react';
import {Pressable, PressableProps} from 'react-native';

function readableLabel(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(readableLabel).filter(Boolean).join(' ');
  if (isValidElement<{children?: ReactNode; accessibilityLabel?: string; alt?: string}>(node)) {
    const props = node.props;
    return props.accessibilityLabel || props.alt || readableLabel(props.children);
  }
  return '';
}

/** Shared screen-reader friendly button. Visible child text supplies its label. */
export default function AccessiblePressable(props: PressableProps) {
  const label = props.accessibilityLabel || readableLabel(props.children) || 'زر';
  return (
    <Pressable
      {...props}
      accessible={props.accessible ?? true}
      focusable={props.focusable ?? true}
      hitSlop={props.hitSlop ?? 8}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={label}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: props.disabled ?? props.accessibilityState?.disabled ?? false,
      }}
    />
  );
}
