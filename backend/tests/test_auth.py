def test_register_verify_login_and_me_flow(client):
    register = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "password123"},
    )
    assert register.status_code == 201
    assert register.json()["verificationRequired"] is True
    assert register.json()["token"] is None

    login_before_verify = client.post(
        "/api/auth/login",
        json={"username": "ALICE", "password": "password123"},
    )
    assert login_before_verify.status_code == 200
    assert login_before_verify.json()["verificationRequired"] is True
    assert login_before_verify.json()["token"] is None

    verify = client.post(
        "/api/auth/verify",
        json={"username": "alice", "code": client.fake_email_sender.codes_by_email["alice@example.com"]},
    )
    assert verify.status_code == 200
    token = verify.json()["token"]
    assert token

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "alice"
    assert me.json()["isVerified"] is True

    login = client.post(
        "/api/auth/login",
        json={"username": "ALIce", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["email"] == "alice@example.com"
    assert login.json()["verificationRequired"] is False
    assert login.json()["token"]


def test_username_uniqueness_is_case_insensitive(client):
    first = client.post(
        "/api/auth/register",
        json={"username": "Tom", "email": "tom@example.com", "password": "password123"},
    )
    assert first.status_code == 201

    second = client.post(
        "/api/auth/register",
        json={"username": "tom", "email": "other@example.com", "password": "password123"},
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "Username already taken"
