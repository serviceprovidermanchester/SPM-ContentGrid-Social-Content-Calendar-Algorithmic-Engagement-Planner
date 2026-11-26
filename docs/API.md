# ContentGrid REST API Reference

**Maintained by:** [SPManchester Private Limited](https://spmanchester.com/)  
**Contact:** [info@spmanchester.com](mailto:info@spmanchester.com)  
**API Base:** `/api/v1`  
**Authentication:** Bearer Token via `Authorization: Bearer <session-token>` header

---

## System Endpoints

### Health Check
- **Endpoint:** `GET /health`
- **Auth Required:** No
- **Response:**
  ```json
  {
    "status": "ok",
    "data": {
      "service": "spm-ads-contentgrid-calendar-api",
      "status": "healthy",
      "brandsLoaded": 1,
      "postsLoaded": 29,
      "channelsLoaded": 3,
      "time": "2026-11-26T12:00:00.000Z"
    }
  }
  ```

---

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register owner account and create brand workspace |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user and receive bearer token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke active session token |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch active user profile and brand scope |
| `PUT` | `/api/v1/auth/me` | Authenticated | Update user profile details |

---

## 2. Brand & Workspace (`/api/v1/brand`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/brand` | Authenticated | Retrieve brand details and cadence/format mix settings |
| `PUT` | `/api/v1/brand` | Owner Only | Update brand settings (cadence target, format mix targets) |

---

## 3. Social Channels (`/api/v1/channels`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/channels` | Authenticated | List configured social channels |
| `POST` | `/api/v1/channels` | Authenticated | Add a new social channel handle and follower count |
| `DELETE` | `/api/v1/channels/:id` | Owner Only | Remove a social channel |

---

## 4. Content & Posts (`/api/v1/posts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/posts` | Authenticated | Query posts with filtering by status, platform, or date |
| `POST` | `/api/v1/posts` | Authenticated | Plan a new post or record published performance |
| `GET` | `/api/v1/posts/:id` | Authenticated | Retrieve post details with complete score breakdown |
| `PUT` | `/api/v1/posts/:id` | Authenticated | Update post copy, status, scheduled slot, or metrics |
| `DELETE` | `/api/v1/posts/:id` | Owner Only | Delete a post record |

---

## 5. Analytics & Engine Intelligence (`/api/v1/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/dashboard` | Authenticated | High-level overview: stats, best format, best slot, recent posts |
| `GET` | `/api/v1/analytics/formats` | Authenticated | Roll-up statistics grouped by creative format |
| `GET` | `/api/v1/analytics/slots` | Authenticated | Engagement roll-ups by weekday × daypart slot |
| `GET` | `/api/v1/analytics/coverage` | Authenticated | Calendar coverage audit, gap days, and format mix deviations |

---

## 6. Analysis Runs (`/api/v1/analysis-runs`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/analysis-runs` | Authenticated | Execute engine analysis run and persist recommendations |
| `GET` | `/api/v1/analysis-runs/:id` | Authenticated | Retrieve detailed analysis snapshot with derived intelligence |

---

## 7. Editorial Tasks & Workflow (`/api/v1/tasks`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | Authenticated | List content production tasks |
| `POST` | `/api/v1/tasks` | Authenticated | Create a new task assignment |
| `PATCH` | `/api/v1/tasks/:id` | Authenticated | Update task status (`todo`, `in_progress`, `done`) |

---

## 8. Reports & Notifications (`/api/v1/reports`, `/api/v1/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/reports` | Authenticated | List generated performance reports |
| `POST` | `/api/v1/reports` | Authenticated | Generate an executive report snapshot from latest analysis |
| `GET` | `/api/v1/notifications` | Authenticated | Retrieve in-app activity notifications |
| `PATCH` | `/api/v1/notifications/read` | Authenticated | Mark notifications as read |

---

*Provided by SPManchester Private Limited. For enterprise integration support, contact info@spmanchester.com.*
