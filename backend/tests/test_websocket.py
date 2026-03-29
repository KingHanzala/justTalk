import pytest
from starlette.websockets import WebSocketDisconnect


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


def test_websocket_requires_valid_membership(client):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/ws/non-member-chat?token=invalid"):
            pass

    assert exc_info.value.code == 4001


def test_websocket_broadcast_path(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": False, "name": None, "memberUserIds": [bob["id"]]},
    ).json()

    with client.websocket_connect(f"/api/ws/{chat['id']}?token={bob_token}") as websocket:
        client.post(
            f"/api/chats/{chat['id']}/messages",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"content": "Hello Bob"},
        )
        payload = websocket.receive_json()
        assert payload["type"] == "message"
        assert payload["data"]["content"] == "Hello Bob"


def test_websocket_broadcasts_message_deletion(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"]]},
    ).json()

    sent = client.post(
        f"/api/chats/{chat['id']}/messages",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={"content": "Hello Alice"},
    ).json()

    with client.websocket_connect(f"/api/ws/{chat['id']}?token={bob_token}") as websocket:
        client.delete(
            f"/api/chats/{chat['id']}/messages/{sent['id']}",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        payload = websocket.receive_json()
        assert payload["type"] == "message_updated"
        assert payload["data"]["id"] == sent["id"]
        assert payload["data"]["isDeleted"] is True


def test_removed_member_cannot_reconnect_websocket(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": True, "name": "Project", "memberUserIds": [bob["id"]]},
    ).json()

    removed = client.delete(
        f"/api/chats/{chat['id']}/members/{bob['id']}",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert removed.status_code == 200

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/api/ws/{chat['id']}?token={bob_token}"):
            pass

    assert exc_info.value.code == 4003


def test_websocket_broadcasts_typing_events(client):
    _, alice_token = create_user(client, "alice")
    bob, bob_token = create_user(client, "bob")

    chat = client.post(
        "/api/chats",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"isGroup": False, "name": None, "memberUserIds": [bob["id"]]},
    ).json()

    with client.websocket_connect(f"/api/ws/{chat['id']}?token={alice_token}") as alice_ws:
        with client.websocket_connect(f"/api/ws/{chat['id']}?token={bob_token}") as bob_ws:
            bob_ws.send_json({"type": "typing", "data": {"isTyping": True}})
            payload = alice_ws.receive_json()
            assert payload["type"] == "typing"
            assert payload["data"]["userId"] == bob["id"]
            assert payload["data"]["isTyping"] is True
