def create_user(client, username: str):
    response = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    payload = response.json()
    return payload["user"], payload["token"]


def test_send_and_list_messages(client):
    _, alice_token = create_user(client, "alice")
    bob, _ = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": False, "name": None, "memberUserIds": [bob["id"]]},
    ).json()

    sent = client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"content": "Hello Bob"},
    )
    assert sent.status_code == 201
    assert sent.json()["content"] == "Hello Bob"

    listed = client.get(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_admin_can_soft_delete_message_for_everyone(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")
    charlie, charlie_token = create_user(client, "charlie")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"], charlie["id"]]},
    ).json()

    sent = client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={"content": "Hello group"},
    ).json()

    forbidden = client.delete(
        f"/api/chats/{chat['id']}/messages/{sent['id']}",
        headers={"Authorization": f"Bearer {charlie_token}"},
    )
    assert forbidden.status_code == 403

    deleted = client.delete(
        f"/api/chats/{chat['id']}/messages/{sent['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert deleted.status_code == 200
    assert deleted.json()["isDeleted"] is True
    assert deleted.json()["content"] == "This message was deleted"

    listed = client.get(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert listed.status_code == 200
    assert listed.json()[0]["isDeleted"] is True
