# Table and dashboard

Use a table when the user compares many records. A handful of rows is a list; see [screen-list.md](screen-list.md).

A dashboard is a small set of figures plus one table or list. Lead with the figure the user opens the page to see. Skip a row of identical stat cards unless each figure answers a different question.

## Regions

- Title, the primary action, and filters that change what the table shows.
- Column headers that name the data. Numeric columns align right and use tabular figures.
- Row actions stay inside the row. One primary action for the page, secondary actions per row.

## States

- Loading: placeholder rows under the real headers.
- Empty: one sentence that reflects the active filter ("No invoices in March") and a way to clear the filter or create a record.
- Error: message and retry in the table body. Leave the filters usable.

## Behavior

- Sort, filter, and page index live in the query string so the view can be shared.
- Truncate overflowing cell text. Give the flex or grid child `min-width: 0` so truncation works.
- Keep a keyboard path for every row action.
- Stay with a normal table until the user is rendering more than about 50 rows at once. Add virtualization only when that shows up.
