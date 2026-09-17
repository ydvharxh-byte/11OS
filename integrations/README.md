# Integration architecture

The application intentionally has no simulated third-party connection.

## Google Drive

The future Drive adapter uses OAuth credentials from `.env`. Large files stay in Drive; the `resources` table already provides `drive_file_id`, `drive_url`, `file_name`, `mime_type`, `size`, and normal resource metadata.

## Telegram

The future Telegram adapter must use an authorised Telegram API flow for content the authenticated account may access. It must never request a password in the Study OS UI and must not bypass access controls.

Pipeline: authorised fetch → detect new messages/files → classify → duplicate check → import review → Drive upload/reference → `resources` metadata. Uncertain classifications must remain in `import_review_items` until the student confirms subject, chapter, topic, and type.
