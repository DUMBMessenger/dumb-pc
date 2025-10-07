import { invoke } from "@tauri-apps/api/tauri";

const channelsUl = document.getElementById("channels");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-msg");
const messageList = document.getElementById("message-list");

let selectedChannel = null;

async function loadChannels() {
  const channels = await invoke("get_channels");
  // const channels = [{id:1,name:"общий"},{id:2,name:"random"}];
  channelsUl.innerHTML = "";
  channels.forEach(ch => {
    const li = document.createElement("li");
    li.textContent = ch.name;
    li.onclick = () => selectChannel(ch);
    channelsUl.appendChild(li);
  });
}

function selectChannel(ch) {
  selectedChannel = ch;
  messageList.innerHTML = "";
}

sendBtn.addEventListener("click", async () => {
  if(!selectedChannel) return alert("выбери канал");
  const text = msgInput.value.trim();
  if(!text) return;
  const li = document.createElement("li");
  li.textContent = `я: ${text}`;
  messageList.appendChild(li);
  msgInput.value = "";
  // позже здесь invoke("send_message", {channel_id:selectedChannel.id,text})
});
