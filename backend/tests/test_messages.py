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
