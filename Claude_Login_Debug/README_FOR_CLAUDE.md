Project: Pratibimba Audit Management System

Issue:
- Login worked previously.
- Backend starts successfully.
- MongoDB connects successfully.
- Health endpoint returns 200.
- curl POST /api/v1/auth/login reaches backend.
- Browser fetch() fails with "Failed to fetch".
- DevTools reports CORS/fetch failure.
- Need root-cause analysis of why browser login fails while curl succeeds.

Frontend:
- React + Vite

Backend:
- Express + MongoDB + JWT

Please analyze the included files and identify the root cause rather than suggesting generic CORS fixes.
