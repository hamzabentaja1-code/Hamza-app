# Accessibility support

## Implemented

- All shared Pressable controls in the main app, quote editor and POS use a common accessible button primitive.
- Controls expose the button role, are keyboard-focusable, and receive an 8 dp hit-slop expansion by default.
- A control's visible child text is used as its screen-reader label; callers can override it with `accessibilityLabel`.
- Disabled state is exposed to assistive technology.
- Product and customer choices expose their selected state.
- Image-only product preview controls and the language switch have explicit labels.
- Text inputs expose a translated accessibility label based on their translated placeholder unless a caller supplies a better label.
- React Native text scaling remains enabled; the wrappers do not disable system font scaling.
- Arabic and French retain their respective writing directions.

## Device verification still required

Static TypeScript checks cannot prove a usable TalkBack experience. Before release, run the app on an Android device/emulator with TalkBack enabled and verify:

1. Swipe navigation reaches every interactive control in a logical order.
2. Every icon/photo-only control has a meaningful spoken label.
3. Product/customer/payment choices announce selected state.
4. Inputs announce a useful label, keyboard type and current value.
5. Large system font settings do not clip totals, buttons, dialogs or navigation.
6. Contrast and touch target sizes are usable at normal and large display sizes.
7. Arabic and French are each tested with the matching screen-reader language.

Use Android Accessibility Scanner (or the built-in Accessibility checks in Android Studio) to inspect touch target size, labels, contrast and clickable bounds. This scan complements, but does not replace, manual TalkBack testing.
