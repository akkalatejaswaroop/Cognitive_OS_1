# Cognitive OS: Authentication Testing Framework

This document outlines the comprehensive testing strategy for the Cognitive OS authentication system. It serves as a guide for QA engineers and developers to ensure the platform remains secure, stable, and user-friendly.

---

## 1. QA Checklist

### A. Signup Testing
- [ ] **Valid Signup**: New user can sign up with a valid email and strong password.
- [ ] **Email Uniqueness**: System prevents signing up with an already registered email.
- [ ] **Format Validation**: System rejects invalid email formats (e.g., missing @, missing domain).
- [ ] **Social Signup**: Google and GitHub OAuth flows work correctly.
- [ ] **Initial State**: New users are created with default role ('user') and default cognitive preferences.

### B. Login Testing
- [ ] **Valid Credentials**: Existing user can log in with correct email and password.
- [ ] **Invalid Password**: System rejects login with incorrect password (401 Unauthorized).
- [ ] **Unregistered Email**: System rejects login with an email not in the database.
- [ ] **Lockout Policy**: (If implemented) Multiple failed attempts should trigger temporary lockout or CAPTCHA.
- [ ] **OAuth Login**: Returning users can log in via previously linked social accounts.

### C. Password Validation Testing
- [ ] **Complexity Requirements**: Minimum 8 characters, at least one uppercase, one lowercase, and one number.
- [ ] **Special Characters**: System supports and encourages special characters in passwords.
- [ ] **Visual Feedback**: Password strength meter or clear error messages during signup.

### D. Session Persistence Testing
- [ ] **Remember Me**: Sessions persist across browser restarts when 'Remember Me' is checked.
- [ ] **Cookie Security**: `access_token` and `refresh_token` are set as `HttpOnly`, `Secure` (in prod), and `SameSite`.
- [ ] **State Restoration**: Global auth state is restored correctly on page refresh.

### E. Protected Route Testing
- [ ] **Guest Access**: Attempting to access `/dashboard/*` as a guest redirects to `/login`.
- [ ] **Role-Based Access**: Attempting to access admin-only pages as a 'user' shows a 403 Forbidden or redirects.
- [ ] **API Protection**: API endpoints return 401/403 when accessed without a valid session cookie.

### F. Logout Testing
- [ ] **Cookie Clearing**: Logout successfully deletes `access_token` and `refresh_token` cookies.
- [ ] **Database Invalidation**: Logout deletes the corresponding session entry in the `sessions` table.
- [ ] **Redirect**: Successful logout redirects the user to the homepage or login page.

### G. Token Expiration & Refresh Testing
- [ ] **Short-lived Access**: Access token expires after 30 minutes.
- [ ] **Auto-Refresh**: Frontend automatically refreshes the token 5 minutes before expiry.
- [ ] **Refresh Rotation**: Refreshing a token generates a *new* refresh token and invalidates the old one.
- [ ] **Total Expiry**: When both tokens expire (7 days), the user is gracefully redirected to login.

### H. Multi-device Session Testing
- [ ] **Parallel Sessions**: User can be logged in on Desktop Chrome and Mobile Safari simultaneously.
- [ ] **Independent Logout**: Logging out on one device does not (necessarily) invalidate the other device's session unless "Logout all" is used.
- [ ] **Device Tracking**: The `sessions` table correctly records `User-Agent` for different devices.

### I. Browser & Platform Compatibility
- [ ] **Desktop**: Chrome, Firefox, Safari, Edge (Latest versions).
- [ ] **Mobile**: iOS Safari, Android Chrome.
- [ ] **Private/Incognito**: Verify behavior when cookies/local storage are restricted.

---

## 2. Security Validation Checklist

- [ ] **No Secrets in Logs**: Verify that passwords and tokens are NEVER printed in backend logs.
- [ ] **HTTPS Only**: Verify that auth cookies are only sent over HTTPS (enforce `Secure` flag).
- [ ] **CSRF Protection**: Verify that `SameSite` cookies or CSRF tokens are active.
- [ ] **XSS Prevention**: Verify that tokens are NOT accessible via `document.cookie`.
- [ ] **Bcrypt Hashing**: Confirm passwords are stored using a strong salt and `bcrypt` (no plain text).
- [ ] **JWT Signing**: Verify that JWTs are signed with a robust `SECRET_KEY` and cannot be tampered with.

---

## 3. Auth Acceptance Criteria

| Feature | Requirement |
| :--- | :--- |
| **Login Latency** | Successful login should complete in < 500ms. |
| **Token Size** | JWT payloads should remain lean to avoid header bloat. |
| **Error Messages** | Display generic "Invalid email or password" to prevent account enumeration. |
| **Session Cleanup** | Expired sessions in the database should be cleaned up periodically. |

---

## 4. Bug Tracking Format

When reporting an authentication bug, use the following template:

```markdown
### Bug Title: [Brief Description]
**Severity**: [Low / Medium / High / Critical]
**Environment**: [Dev / Staging / Prod]
**Platform**: [e.g. Chrome 124 / iOS 17]

**Steps to Reproduce**:
1. Go to '/login'
2. Enter valid email
3. Enter incorrect password
4. ...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened - include console logs or network traces]

**Security Impact**:
[Yes/No - Explain if this vulnerability exposes user data]
```
