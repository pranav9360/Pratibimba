const BASE_URL =
  "https://bug-free-eureka-r4jrjvp4ppjxfwqp5-5000.app.github.dev/api/v1/users";
function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getUsers() {
  const res = await fetch(BASE_URL, {
    headers: authHeaders(),
  });

  return res.json();
}

export async function createUser(data: any) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function updateUser(id: string, data: any) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  return res.json();
}