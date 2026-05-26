import streamlit as st
import httpx
import json
import time

BASE_URL = "http://localhost:8000"

st.set_page_config(page_title="Secure Messaging", layout="wide", initial_sidebar_state="expanded")

if "token" not in st.session_state:
    st.session_state.token = None
    st.session_state.username = ""
if "active_recipient" not in st.session_state:
    st.session_state.active_recipient = None
if "messages_dict" not in st.session_state:
    st.session_state.messages_dict = {}

# ---------------------------------------------------------------------------
# מסך התחברות והרשמה
# ---------------------------------------------------------------------------
if not st.session_state.token:
    st.markdown("<h2 style='text-align: center; color: #1E3A8A;'>🔐 Secure Messenger</h2>", unsafe_allow_html=True)
    tab1, tab2 = st.tabs(["🔑 התחברות", "📝 הרשמה"])
    
    with tab1:
        with st.form("login_form"):
            username = st.text_input("שם משתמש", key="login_user")
            password = st.text_input("סיסמה", type="password", key="login_pass")
            if st.form_submit_button("התחבר", use_container_width=True):
                try:
                    res = httpx.post(f"{BASE_URL}/login", json={"username": username, "password": password})
                    if res.status_code == 200:
                        st.session_state.token = res.json()["access_token"]
                        st.session_state.username = username.lower()
                        st.session_state.messages_dict = {} # איפוס זיכרון ישן
                        st.rerun()
                    else:
                        st.error("שם משתמש או סיסמה שגויים")
                except Exception:
                    st.error("שרת ה-Uvicorn לא רץ!")
    with tab2:
        with st.form("register_form"):
            reg_username = st.text_input("בחר שם משתמש")
            reg_password = st.text_input("בחר סיסמה", type="password")
            if st.form_submit_button("צור חשבון חדש", use_container_width=True):
                try:
                    res = httpx.post(f"{BASE_URL}/register", json={"username": reg_username.lower(), "password": reg_password})
                    if res.status_code == 201:
                        st.success("נרשמת בהצלחה! עברי לטאב התחברות.")
                    else:
                        st.error(res.json().get("detail", "שגיאה ברישום"))
                except Exception:
                    st.error("השרת לא זמין.")

# ---------------------------------------------------------------------------
# מסך הצ'אט הראשי
# ---------------------------------------------------------------------------
else:
    headers = {"Authorization": f"Bearer {st.session_state.token}"}
    
    # משיכת משתמשים דינמית מהשרת
    all_users = []
    try:
        users_res = httpx.get(f"{BASE_URL}/users", headers=headers)
        if users_res.status_code == 200:
            all_users = users_res.json()
    except Exception:
        all_users = ["alice", "bob", "charlie"]

    recipients = [u for u in all_users if u != st.session_state.username]
    
    if not st.session_state.active_recipient and recipients:
        st.session_state.active_recipient = recipients[0]

    # טעינת היסטוריה ראשונית מה-DB במידה והמיכל ריק עבור הנמען הנוכחי
    if st.session_state.active_recipient and st.session_state.active_recipient not in st.session_state.messages_dict:
        st.session_state.messages_dict[st.session_state.active_recipient] = []
        try:
            res = httpx.get(f"{BASE_URL}/messages", headers=headers)
            if res.status_code == 200:
                for m in res.json():
                    partner = m["recipient"] if m["sender"] == st.session_state.username else m["sender"]
                    if partner not in st.session_state.messages_dict:
                        st.session_state.messages_dict[partner] = []
                    if m not in st.session_state.messages_dict[partner]:
                        st.session_state.messages_dict[partner].append(m)
        except Exception:
            pass

    # --- סרגל צד ---
    with st.sidebar:
        st.markdown(f"### 🟢 מחובר: **{st.session_state.username.capitalize()}**")
        st.write("---")
        
        if recipients:
            chosen = st.radio("💬 בחר חבר לשיחה:", options=recipients, format_func=lambda x: x.capitalize())
            if chosen != st.session_state.active_recipient:
                st.session_state.active_recipient = chosen
                st.rerun()
        else:
            st.info("אין עדיין משתמשים אחרים רשומים במערכת.")
            
        st.write("---")
        if st.button("🚪 התנתק", use_container_width=True):
            st.session_state.token = None
            st.session_state.username = ""
            st.session_state.messages_dict = {}
            st.session_state.active_recipient = None
            st.rerun()

    # חלון הצ'אט הראשי
    if st.session_state.active_recipient:
        st.markdown(f"## 💬 שיחה עם **{st.session_state.active_recipient.capitalize()}**")

        current_chat = st.session_state.messages_dict.get(st.session_state.active_recipient, [])
        
        with st.container(height=400, border=False):
            if not current_chat:
                st.info("אין הודעות עדיין בשיחה הזו. תהיי הראשונה לשלוח!")
            for msg in current_chat:
                is_me = msg["sender"] == st.session_state.username
                with st.chat_message("user" if is_me else "assistant"):
                    st.markdown(f"**{msg['sender'].capitalize()}**")
                    st.write(msg["content"])

        # תיבת קלט מהירה (Optimistic UI) לקפיצה מיידית של הטקסט
        if prompt := st.chat_input("הקלידי הודעה..."):
            try:
                new_msg = {"sender": st.session_state.username, "recipient": st.session_state.active_recipient, "content": prompt}
                st.session_state.messages_dict[st.session_state.active_recipient].append(new_msg)
                
                # שליחה שקטה לשרת
                httpx.post(f"{BASE_URL}/messages", json={"content": prompt, "recipient": st.session_state.active_recipient}, headers=headers)
                st.rerun()
            except Exception:
                st.error("השליחה נכשלה.")

        # 🔥 מאזין ה-SSE הלייב בתוך Fragment עם רענון חלקי סופר-מהיר
        @st.fragment(run_every="0.5s")
        def listen_to_sse_fast():
            try:
                # שימוש בלקוח מקומי עם טיימאאוט קצר כדי לא לחנוק את הבאפר
                with httpx.Client() as client:
                    with client.stream("GET", f"{BASE_URL}/stream", headers=headers, timeout=0.4) as stream:
                        for line in stream.iter_lines():
                            if line.startswith("data:"):
                                msg = json.loads(line[5:].strip())
                                partner = msg["recipient"] if msg["sender"] == st.session_state.username else msg["sender"]
                                
                                if partner not in st.session_state.messages_dict:
                                    st.session_state.messages_dict[partner] = []
                                
                                if msg not in st.session_state.messages_dict[partner]:
                                    st.session_state.messages_dict[partner].append(msg)
                                    st.rerun()
            except (httpx.TimeoutException, Exception):
                pass

        listen_to_sse_fast()