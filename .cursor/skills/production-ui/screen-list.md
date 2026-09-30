# List screen

A list is for a handful of records the user scans and acts on. Hundreds of rows belong in [screen-table.md](screen-table.md).

## Regions

- Title and one primary action (create, add, invite).
- Optional search, only when the volume makes scanning fail.
- Rows. Each row shows the record name, one or two facts, and at most one secondary action.
- Empty, loading, and error occupy the same region as the rows.

## States

- Loading: a few placeholder rows with the same height as a real row.
- Empty: "No invoices yet" plus the primary action. Hide a disabled table header with no rows.
- Error: the message and a retry control in the row region. Keep the title and primary action.

## Behavior

- Creating a record adds it to the list without a full reload when the API returns the created record.
- Search text goes in the query string when search exists.
- The row links to the detail route when a detail screen exists. The link text is the record name.
