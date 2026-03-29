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

    added = client.post(
        f"/api/chats/{group['id']}/members",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"userId": charlie["id"]},
    )
    assert added.status_code == 200

    group_detail = client.get(
        f"/api/chats/{group['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert any(member["userId"] == charlie["id"] for member in group_detail.json()["members"])


def test_admin_can_remove_member_but_not_last_admin(client):
    alice, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")
    charlie, charlie_token = create_user(client, "charlie")

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

    removed_view = client.get(
        f"/api/chats/{group['id']}",
        headers={"Authorization": f"Bearer {charlie_token}"},
    )
    assert removed_view.status_code == 200
    assert removed_view.json()["membershipStatus"] == "removed"
    assert removed_view.json()["canWrite"] is False

    last_admin = client.delete(
        f"/api/chats/{group['id']}/members/{alice['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert last_admin.status_code == 409


def test_removed_member_can_be_readded(client):
    alice, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    group = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"]]},
    ).json()

    removed = client.delete(
        f"/api/chats/{group['id']}/members/{bob['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert removed.status_code == 200

    readded = client.post(
        f"/api/chats/{group['id']}/members",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"userId": bob["id"]},
    )
    assert readded.status_code == 200

    send = client.post(
        f"/api/chats/{group['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={"content": "I'm back"},
    )
    assert send.status_code == 201
