# Secure Note-Taking Application

A REST API + plain HTML/JS frontend implementing secure auth, role-based
access control, notes, a lightweight posts feature, and two required
MongoDB aggregation pipelines.

## Stack

- **Runtime:** Node.js + Express
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (stateless, `Authorization: Bearer <token>`)
- **Password hashing:** bcrypt (12 salt rounds)

## Setup

```bash
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET
npm run dev             # or: npm start
```

Requires a running MongoDB instance reachable at `MONGO_URI`. Open
`http://localhost:5000` for the frontend, or hit the JSON API directly.

The very first user you register is a normal "user". To test admin
functionality, either:
- Register a user, then use `mongosh`/Compass to flip that user's `role`
  field to `"admin"` directly in the `users` collection, or
- Log in as that admin and use the "Add User" form (role dropdown) to
  create further admins.

## Roles

- **user** — create/update/delete/list **their own** notes.
- **admin** — everything a user can do, plus: manage users (add/remove/
  update/list all), and view everyone's notes.

## API Reference

### Auth (`/api/auth`)
| Method | Path        | Auth | Description |
|---|---|---|---|
| POST | `/register` | none | Create a `user` account, returns JWT |
| POST | `/login`    | none | Returns JWT |
| GET  | `/me`       | any  | Current user profile |

### Users (`/api/users`) — admin only
| Method | Path | Description |
|---|---|---|
| GET | `/?page=&limit=` | Paginated list of all users |
| GET | `/:id` | Get one user |
| POST | `/` | Create a user (optionally `role: "admin"`) |
| PATCH | `/:id` | Update name/email/role/interests/password |
| DELETE | `/:id` | Delete user (cascades: deletes their notes) |

### Notes (`/api/notes`) — authenticated
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create a note (owned by caller) |
| GET | `/?page=&limit=` | List notes — own notes for `user`, **all** notes for `admin` |
| GET | `/:id` | Fetch one note (owner or admin) |
| PATCH | `/:id` | Update (owner or admin) |
| DELETE | `/:id` | Delete (owner or admin) |

### Posts (`/api/posts`) — public read, authenticated write
| Method | Path | Description |
|---|---|---|
| GET | `/?page=&limit=` | Public feed of all posts |
| POST | `/` | Create a post (any logged-in user) |

### Aggregations (`/api/aggregations`) — authenticated

**Scenario 1 — Group by Interests**
`GET /users-by-interest`
Single `User.aggregate()` call: `$unwind` interests → `$group` by interest
(with count + user list) → `$project` → `$sort` by popularity.

**Scenario 2 — User Posts ($lookup)**
`GET /users/:id/posts`
Single pipeline: `$match` the user by id → `$lookup` into `posts` on
`author` → `$project` the shape returned to the client.

## Indexing Strategy

Only indexes that are actually required by a query or aggregation in this
app were created (see inline comments in each model for the exact
justification):

| Collection | Index | Purpose |
|---|---|---|
| `users` | `{ email: 1 }` unique | Login lookup + uniqueness constraint |
| `users` | `{ interests: 1 }` (multikey) | Aggregation Scenario 1 |
| `users` | `{ createdAt: -1 }` | Admin "list all users", paginated |
| `notes` | `{ owner: 1, createdAt: -1 }` | A user listing their own notes, paginated |
| `notes` | `{ createdAt: -1 }` | Admin listing **everyone's** notes, paginated |
| `posts` | `{ author: 1, createdAt: -1 }` | Aggregation Scenario 2's `$lookup` (foreignField), plus per-author post listing |

Single-document GET operations (`GET /users/:id`, `GET /notes/:id`) rely on
MongoDB's automatic default `_id` index — no extra index needed there,
per the "no unnecessary indexes" constraint.

## Notes on design decisions

- Role can never be set by a self-registering user (`/auth/register`
  always creates a `user`); only an existing admin can promote someone via
  `PATCH /users/:id`. This prevents privilege escalation.
- Passwords are bcrypt-hashed (12 rounds) and the hash field uses
  `select: false` in the schema, so it's never accidentally returned by a
  normal `find`/`findById` — it's only pulled in explicitly during login.
- Deleting a user cascades to delete their notes, keeping the `notes`
  collection consistent.
- The frontend is intentionally minimal/unstyled per the task's
  instructions to prioritize backend functionality — it's plain HTML/CSS/
  JS calling the REST API directly with `fetch`, no build step or UI
  framework.
