# Form screen

A form collects input and submits it. Settings, create, and edit share this shape.

## Regions

- Title that names the object being edited or created.
- Fields in the order the user fills them. Related fields sit together.
- The submit button uses the verb: "Save changes", "Create invoice".
- A cancel or back link when leaving would discard edits.

## Fields

- Every control has a visible label tied with `htmlFor` or a wrapping label.
- Set `name`, `type`, and `autoComplete` to real values (`email`, `name`, `tel`).
- Placeholders show an example and end with `…`. They do not replace the label.
- Allow paste.
- Turn spellcheck off on emails, codes, and usernames.

## States

- The submit button stays enabled until the request starts, then shows the verb in progress ("Saving…").
- Field errors render under that field, linked with `aria-describedby`, and the field gets `aria-invalid`. Move focus to the first invalid field.
- A form-level error (`role="alert"`) is for a failed request, and it says what to do next.
- After success, show the same verb in the past tense and go to the detail or list the user expects.

## Behavior

- Do not submit empty required fields.
- Keep the typed values when the request fails.
