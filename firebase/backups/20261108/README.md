# Security Rules backup

- `local-before.rules`: modification-free copy of the entire local firebase/firestore.rules before this security task.
- SHA-256: `e70b9f36741c6ec13d22a4f760b5930f554bb4ba038cd1fc5f38feb526e6ecfc`.
- This is **not a backup of the published production rules**.
- The management API was queried without credentials and returned HTTP403/PERMISSION_DENIED. No rules were returned.
- The user described an attachment, but no rules source or accessible attachment was present in the delivered message. The actual code/file path has been requested.
- Subsequent user confirmation: the Console currently grants read/write to every Firestore document until 2026-12-06. This confirms the effective permissive policy responsible for the unauthenticated reads. Exact source text was still not supplied; this description is not represented as a byte-for-byte rules backup.
- Before publishing: save the full Console rules separately as `deployed-before.rules`, record project/database/release and checksum, compare all non-Q&A grants with the candidate, then request approval. Do not replace this local backup with the deployed copy.
- `reservation-before.rules`: entire local candidate before the usernames/emails read minimization review (SHA-256 c7098adb43f76171f35bd7c1bb84f0e43ac18f831964f5b8728c2de33a2ae644). This is also a local source backup, not a Console export.
