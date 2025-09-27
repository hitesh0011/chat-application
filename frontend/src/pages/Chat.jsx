import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

export default function Chat() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef();
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    socketRef.current = io("http://localhost:5000", { auth: { token } });

    // fetch all users
    fetch("http://localhost:5000/api/auth/users", {
      headers: { Authorization: "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => setUsers(data));

    socketRef.current.on("previousMessages", msgs => setMessages(msgs));
    socketRef.current.on("chatMessage", msg => {
      if (selectedUser && (msg.sender === selectedUser._id || msg.sender === userId))
        setMessages(prev => [...prev, msg]);
    });

    return () => socketRef.current.disconnect();
  }, [selectedUser]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text || !selectedUser) return;
    socketRef.current.emit("chatMessage", { receiverId: selectedUser._id, text });
    setText("");
  };

  return (
    <div style={{ display: "flex", height: "80vh", border: "1px solid #ccc" }}>
      {/* Sidebar */}
      <div style={{ width: "250px", borderRight: "1px solid #ccc", padding: "10px", overflowY: "scroll" }}>
        <h3>Users</h3>
        {users.map(u => (
          <div key={u._id} 
               onClick={() => setSelectedUser(u)} 
               style={{ padding: "5px", cursor: "pointer", background: selectedUser?._id === u._id ? "#eee" : "#fff" }}>
            {u.username}
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: "10px", overflowY: "scroll", background: "#f9f9f9" }}>
          {messages.map(msg => (
            <div key={msg._id} style={{ textAlign: msg.sender === userId ? "right" : "left", margin: "5px 0" }}>
              <span style={{ display: "inline-block", padding: "5px 10px", borderRadius: "10px", background: msg.sender === userId ? "#dcf8c6" : "#fff", border: "1px solid #ccc" }}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} style={{ display: "flex", padding: "10px", borderTop: "1px solid #ccc" }}>
          <input value={text} onChange={e => setText(e.target.value)} style={{ flex: 1, padding: "5px" }} placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
