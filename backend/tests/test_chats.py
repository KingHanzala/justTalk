def create_user(client, username: str):
    response = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    payload = response.json()
    return payload["user"], payload["token"]


def test_create_direct_and_group_chat(client):
    alice, alice_token = create_user(client, "alice")
    bob, _ = create_user(client, "bob")
    charlie, _ = create_user(client, "charlie")

    direct = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": False, "name": None, "memberUserIds": [bob["id"]]},
    )
    assert direct.status_code == 201
    assert direct.json()["isGroup"] is False

    group = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"], charlie["id"]]},
    )
    assert group.status_code == 201
    assert group.json()["name"] == "Project"

    group_detail = client.get(
        f"/api/chats/{group.json()['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert group_detail.status_code == 200
    alice_member = next(member for member in group_detail.json()["members"] if member["userId"] == alice["id"])
    bob_member = next(member for member in group_detail.json()["members"] if member["userId"] == bob["id"])
    assert alice_member["role"] == "admin"
    assert bob_member["role"] == "member"


def test_add_member_requires_admin(client):
    alice, alice_token = create_user(client, "alice")
    bob, _ = create_user(client, "bob")
    charlie, charlie_token = create_user(client, "charlie")

    group = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"]]},
    ).json()

    forbidden = client.post(
        f"/api/chats/{group['id']}/members",
        headers={"Authorization": f"Bearer {charlie_token}"},
        json={"userId": alice["id"]},
    )
    assert forbidden.status_code == 403


def test_admin_can_remove_member_but_not_last_admin(client):
    alice, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")
    charlie, _ = create_user(client, "charlie")

    group = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"], charlie["id"]]},
    ).json()

    forbidden = client.delete(
        f"/api/chats/{group['id']}/members/{charlie['id']}",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert forbidden.status_code == 403

    removed = client.delete(
        f"/api/chats/{group['id']}/members/{charlie['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert removed.status_code == 200

    last_admin = client.delete(
        f"/api/chats/{group['id']}/members/{alice['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert last_admin.status_code == 409
