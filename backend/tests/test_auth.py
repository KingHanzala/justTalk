def test_register_login_and_me_flow(client):
    register = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "password123"},
    )
    assert register.status_code == 201
    token = register.json()["token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "alice"

    login = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["email"] == "alice@example.com"
