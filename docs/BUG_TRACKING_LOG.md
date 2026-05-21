# Cognitive OS - Bug Tracking Log

Use this template to track and manage issues across all Cognitive OS modules.

| Date | Module | Bug Description | Severity | Root Cause | Fix Applied | Status | Assigned To |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 2026-05-21 | Memory Engine | ChromaDB connection timeout on startup | High | Missing heartbeat check before first query | Added `chroma_client.heartbeat()` in `database.py` | Fixed | @dev_lead |
| 2026-05-21 | API Routes | `user_id` missing in `/memory/store` request validation | Critical | Pydantic model didn't enforce mandatory field | Updated `MemoryStoreRequest` model in `memory.py` | Fixed | @security_eng |
| 2026-05-21 | Frontend | Timeline cards overlap on mobile view (320px) | Low | Flexbox wrapping not configured for small screens | Added `flex-wrap` and adjusted `min-width` in CSS | In Progress | @ui_designer |
| | | | | | | | |

---

## Severity Definitions
- **Critical**: System crash, data loss, or security breach (e.g., cross-user data leakage).
- **High**: Major functional failure with no workaround.
- **Medium**: Functional bug with a known workaround.
- **Low**: UI/UX polish, minor visual glitches, or non-breaking console warnings.

## Status Definitions
- **Open**: Reported and verified, but not yet started.
- **In Progress**: Actively being worked on.
- **Testing**: Fix applied, awaiting QA verification.
- **Fixed**: Verified and merged into main branch.
- **Won't Fix**: Identified as "by design" or out of current scope.
