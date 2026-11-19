# Security Specification — Realty Messenger CRM (Firestore Rules TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every document created by a user MUST record `createdByUid == request.auth.uid` (or `uid == request.auth.uid` for user profiles, `authorUid == request.auth.uid` for notes, `recipientUid` check for notifications).
2. **No Self-Privilege Escalation**: On `/users/{userId}` creation, non-bootstrapped users can only register with `role == 'SALE'` and `status == 'ACTIVE'`. Only verified Admins (`SUPER_ADMIN`, `ADMIN`) can update `role`, `teamId`, `assignedPageIds`, or `status`.
3. **PII Isolation**: `/users/{userId}` (containing email & phone) is strictly readable only by the owner (`request.auth.uid == userId`) or Admins/Managers. Non-PII assignment dropdowns read `/staff_directory/{userId}`.
4. **Master Gate on Subcollections**: `/customers/{customerId}/notes/{noteId}` and `/customers/{customerId}/activities/{activityId}` and `/conversations/{conversationId}/messages/{messageId}` MUST verify existence and membership on the parent document via `get()`.
5. **Query Enforcer (No `get()` in `allow list`)**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` (e.g., `request.auth.uid in resource.data.viewerUids || resource.data.assignedToUid == request.auth.uid || isBootstrappedAdmin()`), preventing O(n) read amplification and unauthorized collection scraping.
6. **Temporal Integrity**: `createdAt == request.time` on `create`; `createdAt == existing().createdAt && updatedAt == request.time` on `update`.
7. **Terminal State Locking**: Once `tasks.status == 'COMPLETED'`, `appointments.status in ['COMPLETED', 'CANCELLED']`, or `conversations.status == 'ARCHIVED'`, non-admin users cannot mutate them further.
8. **Strict Key Allowlisting**: Every `create` checks `keys().hasAll(...) && keys().hasOnly(...)`; every `update` branches on `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: `{ auth: null }` attempting to read `/customers/c1` -> `PERMISSION_DENIED`.
2. **Unverified Email Bypass**: `{ auth: { uid: 'u1', token: { email_verified: false } } }` creating `/customers/c1` -> `PERMISSION_DENIED`.
3. **Self-Assigned SUPER_ADMIN**: `{ uid: 'attacker', role: 'SUPER_ADMIN' }` creating `/users/attacker` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Customer Create**: Including `{ isAdminApproved: true }` extra ghost key on `/customers/c1` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Note**: `{ authorUid: 'victim_uid' }` while authenticated as `'attacker_uid'` -> `PERMISSION_DENIED`.
6. **PII Blanket Read on `/users`**: Regular `SALE` user reading `/users/other_sale_uid` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Document ID exceeding 128 chars or containing invalid characters (`../evil`) -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: Setting `createdAt` to a past/future custom timestamp instead of server `request.time` -> `PERMISSION_DENIED`.
9. **Resource Exhaustion (1MB String)**: Passing a 10,000-char string into `fullName` (max 150) -> `PERMISSION_DENIED`.
10. **Orphan Subcollection Write**: Creating `/customers/nonexistent/notes/n1` -> `PERMISSION_DENIED`.
11. **Terminal State Mutation**: `SALE` user attempting to reopen a `COMPLETED` task without Admin role -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Querying `/customers` without scoping to `assignedToUid` or `viewerUids` -> `PERMISSION_DENIED`.
