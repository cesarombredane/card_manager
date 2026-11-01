# Design system

## Palette

The single source is `frontend/src/styles/quasar_variables.sass`. Quasar consumes
it at build time; `theme.scss` reuses it for CSS tokens. Application surfaces and
spacing are defined in the shared styles.

| Quasar role | Colour    | Usage                                |
| ----------- | --------- | ------------------------------------ |
| `primary`   | `#fdd835` | Primary action and selection         |
| `secondary` | `#bdbdbd` | Secondary information                |
| `accent`    | `#ffca28` | Occasional emphasis                  |
| `dark`      | `#121212` | Main background                      |
| `positive`  | `#66bb6a` | Success                              |
| `warning`   | `#ffb300` | Warning, using a distinct amber tone |
| `negative`  | `#ef5350` | Errors and destructive actions       |
| `info`      | `#64b5f6` | Neutral information                  |

Use dark text on filled primary or warning buttons. Check contrast for new
combinations: role colours are not interchangeable on every background. Pair
success, warning and error colours with text or an icon. Do not communicate through
colour alone.

## Composition

Dark interface with no required logo. Centred content, a maximum width of 1120 px
and mobile margins. Use Quasar spacing of 4, 8, 16, 24 and 48 px. Cards have a 12 px
radius, subtle borders and a readable hierarchy. Use the system font without a
remote font service. Material Icons is provided by a local package.

The header contains the title and navigation. Each application adds its own domain
actions as needed.

## Controls

Give each group a clear primary action. Secondary buttons use flat or outline
styles; destructive actions use `negative`. Use explicit labels without forced
uppercase. Forms have persistent labels, nearby validation and loading states.
Dialogs have a title, explanation, cancellation and confirmation, with actions
aligned using `q-space`. Action buttons have explanatory tooltips delayed by
1000 ms, following the placement rules in the frontend conventions.

Empty states explain the situation and offer a useful action when available.
Errors explain their impact and recovery. Feedback examples on the home page are
identified as examples rather than live status.

## Accessibility and responsive layouts

Support keyboard navigation, visible focus, accessible names for interactive
icons, heading hierarchy and landmarks. Dialogs must close and restore focus
correctly. Do not hide essential error explanations in tooltips. Check the
interface at 375 px, on desktop and with browser zoom. Automated tests do not
replace an accessibility review.

## Card Manager geometry

The shared theme changes presentation only. Preserve card aspect ratios, binder
pocket dimensions, page layouts and PDF physical sizes. Binder and crop styles
are shared in `frontend/src/styles/binder.scss` so their dialogs use identical
geometry. Catalog artwork keeps its original colors.
