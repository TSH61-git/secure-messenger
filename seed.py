"""
seed.py — Populate the database with test data.

HOW TO RUN:
    python seed.py

WHAT IT DOES:
    1. Clears all existing users and messages
    2. Creates 3 test users: alice, bob, charlie
    3. Sends a few messages between them
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from server.models import SessionLocal, User, Message, create_tables
from server.auth import hash_password
from server.crypto import encrypt


USERS = [
    {"username": "alice",   "password": "alice123"},
    {"username": "bob",     "password": "bob123"},
    {"username": "charlie", "password": "charlie123"},
]

MESSAGES = [
    {"sender": "alice",   "recipient": "bob",     "content": "hey bob, how are you?"},
    {"sender": "bob",     "recipient": "alice",   "content": "doing great! you?"},
    {"sender": "alice",   "recipient": "bob",     "content": "all good thanks!"},
    {"sender": "charlie", "recipient": "alice",   "content": "alice, are you free later?"},
    {"sender": "alice",   "recipient": "charlie", "content": "yes, what's up?"},
]


def seed():
    create_tables()
    db = SessionLocal()

    try:
        # clear existing data
        db.query(Message).delete()
        db.query(User).delete()
        db.commit()

        # create users
        for u in USERS:
            db.add(User(username=u["username"], password_hash=hash_password(u["password"])))
        db.commit()

        # create messages
        for m in MESSAGES:
            db.add(Message(sender=m["sender"], recipient=m["recipient"], ciphertext=encrypt(m["content"])))
        db.commit()

        print("[OK] Seeded database:")
        print(f"  {len(USERS)} users:    alice / bob / charlie")
        print(f"  {len(MESSAGES)} messages between them")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
