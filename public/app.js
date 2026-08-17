const API = '/api';

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  notesPage: 1,
  adminNotesPage: 1,
  usersPage: 1,
};

// ---------- tab switching ----------
document.querySelectorAll('#tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.remove('active'));
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    btn.classList.add('active');
  });
});
document.querySelector('#tabs button').classList.add('active');
document.getElementById('tab-auth').classList.add('active');

// ---------- helpers ----------
async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  renderSession();
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  renderSession();
}

function renderSession() {
  const el = document.getElementById('session-info');
  const logoutBtn = document.getElementById('logout-btn');
  if (state.user) {
    el.textContent = `Logged in as ${state.user.name} (${state.user.role})`;
    logoutBtn.style.display = 'inline-block';
  } else {
    el.textContent = 'Not logged in';
    logoutBtn.style.display = 'none';
  }
}
renderSession();

function toInterestsArray(str) {
  return (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- auth ----------
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const data = await api('/auth/register', {
      auth: false,
      method: 'POST',
      body: {
        name: f.get('name'),
        email: f.get('email'),
        password: f.get('password'),
        interests: toInterestsArray(f.get('interests')),
      },
    });
    setSession(data.token, data.user);
    document.getElementById('auth-output').textContent = 'Registered and logged in.';
    e.target.reset();
  } catch (err) {
    document.getElementById('auth-output').textContent = 'Error: ' + err.message;
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const data = await api('/auth/login', {
      auth: false,
      method: 'POST',
      body: { email: f.get('email'), password: f.get('password') },
    });
    setSession(data.token, data.user);
    document.getElementById('auth-output').textContent = 'Logged in.';
    e.target.reset();
  } catch (err) {
    document.getElementById('auth-output').textContent = 'Error: ' + err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  document.getElementById('auth-output').textContent = 'Logged out.';
});

// ---------- notes (own) ----------
document.getElementById('note-create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/notes', {
      method: 'POST',
      body: { title: f.get('title'), content: f.get('content') },
    });
    e.target.reset();
    loadNotes();
  } catch (err) {
    alert(err.message);
  }
});

async function loadNotes() {
  try {
    const data = await api(`/notes?page=${state.notesPage}&limit=5`);
    const list = document.getElementById('notes-list');
    list.innerHTML = data.notes
      .map(
        (n) => `<div class="card">
          <strong>${escapeHtml(n.title)}</strong>
          <p>${escapeHtml(n.content)}</p>
          <small>owner: ${n.owner?.name || ''} | ${new Date(n.createdAt).toLocaleString()}</small><br/>
          <button onclick="deleteNote('${n._id}', false)">Delete</button>
        </div>`
      )
      .join('') || '<p>No notes yet.</p>';
    document.getElementById('notes-page-info').textContent =
      `page ${data.pagination.page} / ${data.pagination.totalPages}`;
  } catch (err) {
    document.getElementById('notes-list').textContent = 'Error: ' + err.message;
  }
}
document.getElementById('notes-prev').addEventListener('click', () => {
  if (state.notesPage > 1) { state.notesPage--; loadNotes(); }
});
document.getElementById('notes-next').addEventListener('click', () => {
  state.notesPage++; loadNotes();
});

async function deleteNote(id, isAdminView) {
  try {
    await api(`/notes/${id}`, { method: 'DELETE' });
    isAdminView ? loadAdminNotes() : loadNotes();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- admin: all notes ----------
async function loadAdminNotes() {
  try {
    const data = await api(`/notes?page=${state.adminNotesPage}&limit=5`);
    const list = document.getElementById('admin-notes-list');
    list.innerHTML = data.notes
      .map(
        (n) => `<div class="card">
          <strong>${escapeHtml(n.title)}</strong>
          <p>${escapeHtml(n.content)}</p>
          <small>owner: ${n.owner?.name || ''} (${n.owner?.email || ''}) | ${new Date(n.createdAt).toLocaleString()}</small><br/>
          <button onclick="deleteNote('${n._id}', true)">Delete</button>
        </div>`
      )
      .join('') || '<p>No notes.</p>';
    document.getElementById('admin-notes-page-info').textContent =
      `page ${data.pagination.page} / ${data.pagination.totalPages}`;
  } catch (err) {
    document.getElementById('admin-notes-list').textContent = 'Error: ' + err.message;
  }
}
document.getElementById('admin-notes-prev').addEventListener('click', () => {
  if (state.adminNotesPage > 1) { state.adminNotesPage--; loadAdminNotes(); }
});
document.getElementById('admin-notes-next').addEventListener('click', () => {
  state.adminNotesPage++; loadAdminNotes();
});
document.querySelector('[data-tab="admin-notes"]').addEventListener('click', loadAdminNotes);
document.querySelector('[data-tab="notes"]').addEventListener('click', loadNotes);

// ---------- admin: users ----------
document.getElementById('user-create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/users', {
      method: 'POST',
      body: {
        name: f.get('name'),
        email: f.get('email'),
        password: f.get('password'),
        role: f.get('role'),
        interests: toInterestsArray(f.get('interests')),
      },
    });
    e.target.reset();
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
});

async function loadUsers() {
  try {
    const data = await api(`/users?page=${state.usersPage}&limit=5`);
    const list = document.getElementById('users-list');
    list.innerHTML = data.users
      .map(
        (u) => `<div class="card">
          <strong>${escapeHtml(u.name)}</strong> (${u.role}) - ${escapeHtml(u.email)}
          <br/><small>interests: ${(u.interests || []).join(', ') || '-'} | id: ${u.id}</small><br/>
          <button onclick="deleteUser('${u.id}')">Delete</button>
        </div>`
      )
      .join('') || '<p>No users.</p>';
    document.getElementById('users-page-info').textContent =
      `page ${data.pagination.page} / ${data.pagination.totalPages}`;
  } catch (err) {
    document.getElementById('users-list').textContent = 'Error: ' + err.message;
  }
}
document.getElementById('users-prev').addEventListener('click', () => {
  if (state.usersPage > 1) { state.usersPage--; loadUsers(); }
});
document.getElementById('users-next').addEventListener('click', () => {
  state.usersPage++; loadUsers();
});
document.querySelector('[data-tab="admin-users"]').addEventListener('click', loadUsers);

async function deleteUser(id) {
  try {
    await api(`/users/${id}`, { method: 'DELETE' });
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- posts ----------
document.getElementById('post-create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/posts', {
      method: 'POST',
      body: { title: f.get('title'), content: f.get('content') },
    });
    e.target.reset();
    loadPosts();
  } catch (err) {
    alert(err.message);
  }
});

async function loadPosts() {
  try {
    const data = await api('/posts?limit=10', { auth: false });
    const list = document.getElementById('posts-list');
    list.innerHTML = data.posts
      .map(
        (p) => `<div class="card">
          <strong>${escapeHtml(p.title)}</strong>
          <p>${escapeHtml(p.content)}</p>
          <small>by ${p.author?.name || ''} | ${new Date(p.createdAt).toLocaleString()}</small>
        </div>`
      )
      .join('') || '<p>No posts.</p>';
  } catch (err) {
    document.getElementById('posts-list').textContent = 'Error: ' + err.message;
  }
}
document.querySelector('[data-tab="posts"]').addEventListener('click', loadPosts);

// ---------- aggregation scenario 1 ----------
document.getElementById('load-interests').addEventListener('click', async () => {
  try {
    const data = await api('/aggregations/users-by-interest');
    document.getElementById('interests-output').innerHTML = data.groups
      .map(
        (g) => `<div class="card">
          <strong>${escapeHtml(g.interest)}</strong> (${g.count} user${g.count === 1 ? '' : 's'})
          <ul>${g.users.map((u) => `<li>${escapeHtml(u.name)} - ${escapeHtml(u.email)}</li>`).join('')}</ul>
        </div>`
      )
      .join('') || '<p>No data.</p>';
  } catch (err) {
    document.getElementById('interests-output').textContent = 'Error: ' + err.message;
  }
});

// ---------- aggregation scenario 2 ----------
document.getElementById('userposts-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const data = await api(`/aggregations/users/${f.get('userId')}/posts`);
    const r = data.result;
    document.getElementById('userposts-output').innerHTML = `
      <div class="card">
        <strong>${escapeHtml(r.name)}</strong> - ${escapeHtml(r.email)}
        <ul>${r.posts.map((p) => `<li>${escapeHtml(p.title)}: ${escapeHtml(p.content)}</li>`).join('') || '<li>No posts</li>'}</ul>
      </div>`;
  } catch (err) {
    document.getElementById('userposts-output').textContent = 'Error: ' + err.message;
  }
});

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
