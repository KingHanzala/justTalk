def create_user(client, username: str):
    response = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    verify = client.post(
        "/api/auth/verify",
        json={"username": username, "code": client.fake_email_sender.codes_by_email[f"{username}@example.com"]},
    )
    payload = verify.json()
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


def test_removed_member_has_read_only_history_until_removed_at(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"]]},
    ).json()

    first = client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"content": "Before removal"},
    )
    assert first.status_code == 201

    removed = client.delete(
        f"/api/chats/{chat['id']}/members/{bob['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert removed.status_code == 200

    second = client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"content": "After removal"},
    )
    assert second.status_code == 201

    listed = client.get(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert listed.status_code == 200
    assert [message["content"] for message in listed.json()] == ["Before removal"]

    blocked = client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={"content": "Should fail"},
    )
    assert blocked.status_code == 403


def test_readded_member_does_not_see_messages_sent_while_removed(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"]]},
    ).json()

    client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"content": "Visible before removal"},
    )
    client.delete(
        f"/api/chats/{chat['id']}/members/{bob['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"content": "Hidden while removed"},
    )
    client.post(
        f"/api/chats/{chat['id']}/members",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"userId": bob["id"]},
    )
    client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"content": "Visible after re-add"},
    )

    listed = client.get(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert listed.status_code == 200
    assert [message["content"] for message in listed.json()] == [
        "Visible before removal",
        "Visible after re-add",
    ]
