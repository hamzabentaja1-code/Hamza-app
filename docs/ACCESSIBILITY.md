# Accessibility support

## Implemented

- All shared Pressable controls in the main app, quote editor and POS use a common accessible button primitive.
- Controls expose the button role, are keyboard-focusable, and receive an 8 dp hit-slop expansion by default.
- Text inputs are explicitly accessible and focusable; caller-provided accessibility hints are translated with the selected app language.
- Button accessibility hints are translated with the selected app language.
- A control's visible child text is used as its screen-reader label; callers can override it with `accessibilityLabel`.
- Disabled state is exposed to assistive technology.
- Product, customer, POS payment-method, bank movement-type and bank-transfer destination choices expose their selected state. Warehouse selectors, technician/customer/equipment selections, time-entry selectors, recurring-expense frequency/project choices and agenda event actions use the same accessible controls.
- Expense project assignment, return restocking mode, project status, task project/priority, and payment customer/document/method choices expose selected state.
- Image-only product preview controls and the language switch have explicit labels.
- Quote-line and POS-cart removal actions announce the affected product and explain the removal action in Arabic or French.
- Text inputs expose a translated accessibility label based on their translated placeholder unless a caller supplies a better label.
- React Native text scaling remains enabled; the wrappers do not disable system font scaling.
- Arabic and French retain their respective writing directions.

## Automated regression coverage

The static accessibility regression suite (tests/accessibility.test.cjs) checks that the primary workspaces use the shared accessible controls and translated text inputs, and that selected states and translated hints remain wired into the wrappers across warehouse, bank, field operations, recurring expenses and agenda workspaces. It is included in the normal test:quote script.

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
