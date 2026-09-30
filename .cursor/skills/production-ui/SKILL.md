---
name: production-ui
description: >-
  Builds and improves production app screens in this Next.js template: layout,
  lists, detail views, forms, tables, and loading, empty, and error states.
  Use when the user asks for a new screen, page, or layout, sends a screenshot,
  mock, or print, or asks to polish an existing interface. Triggers include
  nova tela, layout, print, screenshot, mock, empty state, dashboard,
  formulário, form, and UI.
---

# Production UI

Use this skill to make a screen look and behave like a shipped product. Leave the example items page as it is unless the user asks to change it.

Read one screen reference when the screen type is clear:

- List or index: [screen-list.md](screen-list.md)
- Detail: [screen-detail.md](screen-detail.md)
- Form: [screen-form.md](screen-form.md)
- Dense table or dashboard: [screen-table.md](screen-table.md)

## Workflow

```
- [ ] 1. Classify the input
- [ ] 2. Write a short spec before code
- [ ] 3. Place files in the template layout
- [ ] 4. Cover loading, empty, error, and success
- [ ] 5. Check the quality floor
- [ ] 6. Add a component test
- [ ] 7. Exercise the screen in the browser
```

### 1. Classify the input

- **Screenshot or image.** The picture is the look. The product domain is the copy.
- **URL.** Fetch the page and treat it as a reference, same as a screenshot.
- **Text only.** Infer the screen type from the request.
- **Edit.** Change the screen the user named. Leave surrounding screens alone.

If a screenshot could be either a loose starting point or a faithful match, ask that one question. Otherwise proceed.

### 2. Write a short spec before code

Put this in the reply, then build from it:

```
Screen:
Who uses it:
Volume: handful | hundreds
Direction: match reference | restrained product UI
Regions:
Type roles:
Color roles: surface, text, muted, accent, danger
States to show:
Assumptions:
```

From a screenshot, fill the spec from what is visible: regions, hierarchy, density, type roles, and color roles. Note conflicts instead of averaging them away.

From text, ask only what would change the screen, in one message: who uses it, whether the data is a handful of rows or hundreds, hard constraints, and a reference if they have one. Volume decides list versus table. If the answer is partial, state the assumption in the spec and continue.

With no reference, reuse the type and color already in the app and say so in `Direction`. One accent per view. Skip a new visual identity on every screen.

### 3. Place files in the template layout

- `src/app/<route>/page.tsx` imports a frontend component and holds no business rules.
- UI lives in `src/frontend/<domain>/`. Talk to the server with `fetch("/api/v1/...")`. Keep request and response types in `src/frontend/<domain>/api.ts`.
- Do not import `src/backend` from the frontend.
- Scope styles to a root class on the screen component, in a CSS file next to it. Leave `src/app/globals.css` element rules for the example page unless the user asks to change the app shell.
- Use the styling already in the project. Add a component library or utility framework only when the user asks.
- When the screen needs data that does not exist yet, add the domain the way `AGENTS.md` describes. Do not fake the API inside the page.

The picture supplies layout and rhythm. Write labels and empty copy for this product.

### 4. Cover the four states

Every screen that loads data shows loading, empty, error, and success.

- Loading matches the shape of the loaded screen.
- Empty is one sentence plus one action, the same action the screen already offers.
- Error states what happened and the next step, next to the action that failed. Use `role="alert"`.
- The button uses the verb of the action. The success text uses that same verb.

### 5. Quality floor

- Every control has an accessible name. Icon-only buttons have `aria-label`. Inputs have a label.
- Focus is visible. Do not remove the outline without a replacement.
- Use `button` for actions and `a` for navigation.
- A destructive action asks for confirmation before it runs.
- Long text truncates or wraps. It does not blow out the layout.
- Dates and numbers use `Intl`. Numeric columns use tabular figures.
- Motion only answers an action. If anything moves, honor `prefers-reduced-motion`.
- Filters, tabs, and pagination live in the URL when the screen has them.

### 6. Add a component test

Add `tests/frontend/<domain>/<screen>.test.tsx`. Mock `fetch` with `vi.stubGlobal`, as `tests/frontend/items/items-page.test.tsx` does. Cover at least one success path and one failure or empty path. Query by role and accessible name.

### 7. Exercise the screen in the browser

Run the app, open the route, and use it: type, submit, and hit empty and error. A still screenshot is not enough. Fix what breaks and try again.

## Copy

Name the thing the user manages, in the words they would use. Sentence case. One job per label. An error does not apologize and does not stop at "Something went wrong".
