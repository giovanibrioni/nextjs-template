# Detail screen

A detail screen is one record. The user arrived from a list or a direct link.

## Regions

- A link back to the list. Use an anchor, with the list name as the text.
- Title, status if the record has one, and the primary action.
- Fields as a description list: term, then value. Omit empty optional fields.
- A destructive action sits apart from the primary action.

## States

- Loading: placeholders for the title and the field block.
- Missing id or a 404 from the API: a short message and the back link. Do not render an empty form of fields.
- Error on save or delete: the message next to the control that failed. The rest of the record stays visible.

## Behavior

- A destructive action confirms, then returns to the list on success.
- Format dates and amounts with `Intl` in the view. Keep the API value unchanged.
