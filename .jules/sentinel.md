## 2024-05-22 - Admin Auth Information Leak and Timing Attack
**Vulnerability:** Admin username exposed in logs and timing attack in credential verification.
**Learning:** `console.log` of configuration values can leak sensitive information. Simple string comparison `===` is vulnerable to timing attacks.
**Prevention:** Avoid logging sensitive configuration. Use `crypto.timingSafeEqual` for sensitive string comparisons, and ensure no short-circuiting occurs during verification.
