# Design system

Card Manager retains its existing dark Quasar interface, binder layouts, card
aspect ratios, spacing and responsive behavior. The template's example home screen
and palette do not replace application content.

`frontend/src/styles/quasar_variables.sass` is the source of the existing primary
(`#f1c748`), secondary (`#9c9c9c`) and dark (`#050505`) colors. `theme.scss` reuses
them for CSS variables. Preserve icon/Quasar/application stylesheet ordering.
Use semantic colors and Quasar utility classes. Keep accessible names, visible
focus, keyboard navigation and readable mobile layouts. Tooltips use a 1000 ms delay.
Keep confirmation and validation messages explicit; color alone is insufficient.
