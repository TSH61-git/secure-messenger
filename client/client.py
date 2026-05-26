"""
client.py — CLI client for Secure Messenger.

HOW TO RUN:
    python -m client.client

WHAT IT DOES:
    1. Prompts the user to register or login
    2. Shows message history
    3. Listens for incoming messages in a background thread (SSE)
    4. Lets the user type and send messages in the main loop
"""

import json
import threading
from getpass import getpass

import httpx

BASE_URL = "http://localhost:8000"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def prompt_auth() -> tuple[str, str]:
    """Prompt register or login. Returns (username, token)."""
    print("\n=== Secure Messenger ===")
    print("1) Register")
    print("2) Login")
    choice = input("Choose (1/2): ").strip()

    username = input("Username: ").strip()
    password = getpass("Password: ")

    if choice == "1":
        res = httpx.post(f"{BASE_URL}/register", json={"username": username, "password": password})
        if res.status_code != 201:
            print(f"Registration failed: {res.json().get('detail')}")
            return prompt_auth()

    res = httpx.post(f"{BASE_URL}/login", json={"username": username, "password": password})
    if res.status_code != 200:
        print(f"Login failed: {res.json().get('detail')}")
        return prompt_auth()

    token = res.json()["access_token"]
    return username, token


# ---------------------------------------------------------------------------
# SSE listener (background thread)
# ---------------------------------------------------------------------------

def listen_for_messages(token: str, username: str) -> None:
    """Open a persistent SSE connection and print incoming messages."""
    headers = {"Authorization": f"Bearer {token}"}
    try:
        with httpx.stream("GET", f"{BASE_URL}/stream", headers=headers, timeout=None) as res:
            for line in res.iter_lines():
                if line.startswith("data:"):
                    raw = line[len("data:"):].strip()
                    try:
                        msg = json.loads(raw)
                        if msg['sender'] == username:
                            continue
                        print(f"\n  [{msg['sender']} \u2192 {msg['recipient']}]: {msg['content']}")
                        print("  > ", end="", flush=True)
                    except json.JSONDecodeError:
                        pass
    except Exception:
        print("\n[disconnected from stream]")


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    username, token = prompt_auth()
    headers = {"Authorization": f"Bearer {token}"}

    print(f"\nWelcome, {username}!  (format: 'recipient: message', or 'quit' to exit)\n")

    # show message history
    res = httpx.get(f"{BASE_URL}/messages", headers=headers)
    if res.status_code == 200:
        for msg in res.json():
            print(f"  [{msg['sender']} \u2192 {msg['recipient']}]: {msg['content']}")

    # start background SSE listener
    thread = threading.Thread(target=listen_for_messages, args=(token, username), daemon=True)
    thread.start()

    # main send loop
    while True:
        try:
            line = input("\n  > ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not line or line.lower() == "quit":
            break

        if ":" not in line:
            print("  [usage]: recipient: message")
            continue

        recipient, content = line.split(":", 1)
        recipient = recipient.strip()
        content = content.strip()

        if not content:
            print("  [usage]: recipient: message")
            continue

        res = httpx.post(
            f"{BASE_URL}/messages",
            json={"content": content, "recipient": recipient},
            headers=headers,
        )
        if res.status_code != 201:
            print(f"  [error]: {res.json().get('detail')}")


if __name__ == "__main__":
    main()
