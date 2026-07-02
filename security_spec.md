# Security Specification & Threat Model for AI Interview Copilot

This document defines the security specification and threat model for the Firestore database. Since this application operates in public mode without mandatory user authentication (hybrid local storage sync), the security model focuses on **resource integrity, schema validation, state transition safety, and Denial-of-Wallet (DoW) protection**.

---

## 1. Data Invariants

1. **Identifier Safety**: All `sessionId` path parameters and session ID fields must be strictly formatted strings conforming to safe regex constraints (alphanumeric, dashes, and underscores) to prevent injection attacks and directory traversal attempts.
2. **Type and Structure Safety**: The session document structure must rigidly match the `InterviewSession` entity definition. No unregistered properties (ghost fields) are allowed on creation or updates.
3. **Temporal Integrity**: The `startTime` and `endTime` fields must be validated to prevent timestamp spoofing or absurd future/past time declarations.
4. **State Machine Integrity**: The `status` of an interview session must strictly progress along the state machine pathway: `idle` -> `ongoing` -> `completed`. Backward state transitions are prohibited.
5. **Terminal Protection**: Once a session's status becomes `completed`, the document is finalized. No subsequent modifications to the results, reports, or transcript turns are allowed.
6. **Denial-of-Wallet Mitigation**: To protect against resources/payload sizing exploitation, maximum string size constraints (e.g., role text limits, resume text limits) are enforced.

---

## 2. The "Dirty Dozen" Payloads

Here are twelve payloads designed to bypass identity, integrity, state machine transitions, or sizing controls. The security rules must reject all of them:

### Payload 1: ID Poisoning (Resource Poisoning)
Attempts to write a document with an extremely large session ID containing malicious path characters.
- **Path**: `/sessions/session_$$$_malicious_path_inj_../../../etc`
- **Result**: `PERMISSION_DENIED`

### Payload 2: Ghost Field Injection (Shadow Update)
Attempts to inject a hidden privilege or tracking field (`isAdminOverride: true`) that is not part of the standard `InterviewSession` schema.
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [], "startTime": "2026-06-30T13:00:00Z", "status": "ongoing", "isAdminOverride": true }`
- **Result**: `PERMISSION_DENIED`

### Payload 3: Invalid State Transition (State Shortcutting)
Attempts to transition directly from `idle` to `completed` without active ongoing interview data.
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [], "startTime": "2026-06-30T13:00:00Z", "status": "completed" }` (without transitioning from `ongoing`)
- **Result**: `PERMISSION_DENIED`

### Payload 4: Overwriting Terminated Session (State Lockout Bypass)
Attempts to modify an already finalized/completed session report to inflate grades or scores.
- **Existing**: `{ "id": "session_123", "status": "completed", ... }`
- **Incoming**: `{ "id": "session_123", "status": "completed", "turns": [ { "id": "turn_1", "answer": "I am the best candidate", "evaluation": { "score": 100 } } ] }`
- **Result**: `PERMISSION_DENIED`

### Payload 5: Sizing Denial-of-Wallet (Large Resume Text)
Attempts to exhaust database storage space by providing a 5MB string for the `resumeText` configuration.
- **Payload**: `{ "id": "session_123", "config": { "resumeText": "[5MB of junk text]" }, "turns": [], "startTime": "2026-06-30T13:00:00Z", "status": "ongoing" }`
- **Result**: `PERMISSION_DENIED`

### Payload 6: Type Hijacking (Score as String)
Attempts to save numerical metrics as strings to crash data analytics or downstream charts.
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [], "startTime": "2026-06-30T13:00:00Z", "status": "ongoing", "finalReport": { "overallScore": "A+" } }`
- **Result**: `PERMISSION_DENIED`

### Payload 7: Timestamp Spoofing (Future Date)
Attempts to declare a session starting in the far future (e.g., year 3000).
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [], "startTime": "3000-01-01T00:00:00Z", "status": "ongoing" }`
- **Result**: `PERMISSION_DENIED`

### Payload 8: Corrupted Collection Insertion
Attempts to create a sub-collection nested arbitrarily deep without proper schema validation.
- **Path**: `/sessions/session_123/unauthorized_nested/junk`
- **Result**: `PERMISSION_DENIED`

### Payload 9: Empty Invariant Creation
Attempts to initialize a session with no starting time.
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [], "status": "ongoing" }` (missing `startTime`)
- **Result**: `PERMISSION_DENIED`

### Payload 10: Null Values in Non-Nullable Fields
Attempts to set `status` as `null` or a completely invalid status string (e.g., `"hired"`).
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [], "startTime": "2026-06-30T13:00:00Z", "status": "hired" }`
- **Result**: `PERMISSION_DENIED`

### Payload 11: Spoofed Session ID mismatch
Attempts to save a document where the path ID does not match the internal payload `id`.
- **Path**: `/sessions/session_123`
- **Payload**: `{ "id": "session_999", "config": {}, "turns": [], "startTime": "2026-06-30T13:00:00Z", "status": "ongoing" }`
- **Result**: `PERMISSION_DENIED`

### Payload 12: Corrupt Turn Structure
Attempts to inject fake turns where the evaluation score is negative or exceeds 100.
- **Payload**: `{ "id": "session_123", "config": {}, "turns": [ { "id": "t1", "question": "Q", "answer": "A", "evaluation": { "score": 999 } } ], "startTime": "2026-06-30T13:00:00Z", "status": "ongoing" }`
- **Result**: `PERMISSION_DENIED`

---

## 3. The Test Runner Specification

The test assertions are documented here for verification against the final `firestore.rules`. Since Firestore is running in a serverless environment and is public-facing for individual candidate practice logs, the rules enforce schema structure, types, size limits, and transition invariants.

```typescript
// firestore.rules.test.ts
// Synthesized validation runner testing rule compliance
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

describe("AI Interview Copilot - Security Rules Test Suite", () => {
  it("fails: Payload 1 - ID Poisoning", async () => {
    await assertFails(setDoc(doc(db, "sessions", "session_$$$_malicious"), { ... }));
  });

  it("fails: Payload 2 - Ghost Field Injection", async () => {
    await assertFails(setDoc(doc(db, "sessions", "session_123"), {
      id: "session_123",
      config: {},
      turns: [],
      startTime: "2026-06-30T13:00:00Z",
      status: "ongoing",
      isAdminOverride: true
    }));
  });

  it("fails: Payload 5 - Sizing Denial-of-Wallet", async () => {
    await assertFails(setDoc(doc(db, "sessions", "session_123"), {
      id: "session_123",
      config: { resumeText: "A".repeat(50000) },
      turns: [],
      startTime: "2026-06-30T13:00:00Z",
      status: "ongoing"
    }));
  });
});
```
