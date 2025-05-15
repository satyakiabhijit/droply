// script.js

// PeerJS variables
let peer = null;
let conn = null;
let fileToSend = null;
let receiveBuffer = [];
let receivedSize = 0;
let fileMetadata = null;

const homeScreen = document.getElementById("home-screen");
const sendScreen = document.getElementById("send-screen");
const receiveScreen = document.getElementById("receive-screen");

// Send screen elements
const fileInput = document.getElementById("file-input");
const fileDropArea = document.getElementById("file-drop-area");
const fileInfo = document.getElementById("file-info");
const fileNameElem = document.getElementById("file-name");
const fileSizeElem = document.getElementById("file-size");
const fileTypeElem = document.getElementById("file-type");
const generateLinkButton = document.getElementById("generate-link-button");
const shareInfo = document.getElementById("share-info");
const shareLinkInput = document.getElementById("share-link");
const copyLinkButton = document.getElementById("copy-link-button");
const qrcodeContainer = document.getElementById("qrcode");
const connectionStatus = document.getElementById("connection-status");
const peerConnectedMsg = document.getElementById("peer-connected");
const transferProgress = document.getElementById("transfer-progress");
const progressBar = document.getElementById("progress-bar");
const progressPercentage = document.getElementById("progress-percentage");
const transferCompleteMsg = document.getElementById("transfer-complete");

// Receive screen elements
const shareCodeInput = document.getElementById("share-code-input");
const connectButton = document.getElementById("connect-button");
const receiveConnectionStatus = document.getElementById("receive-connection-status");
const receiveFileInfo = document.getElementById("receive-file-info");
const receiveFileName = document.getElementById("receive-file-name");
const receiveFileSize = document.getElementById("receive-file-size");
const receiveFileType = document.getElementById("receive-file-type");
const downloadButton = document.getElementById("download-button");
const receiveProgress = document.getElementById("receive-progress");
const receiveProgressBar = document.getElementById("receive-progress-bar");
const receiveProgressPercentage = document.getElementById("receive-progress-percentage");
const receiveComplete = document.getElementById("receive-complete");
const saveFileButton = document.getElementById("save-file-button");
const receiveNewFileButton = document.getElementById("receive-new-file-button");

// Mode buttons
document.getElementById("send-button").addEventListener("click", () => {
  showScreen("send");
  initPeer();
});

document.getElementById("receive-button").addEventListener("click", () => {
  showScreen("receive");
  initPeer();
});

// File input events
fileInput.addEventListener("change", handleFileSelected);
fileDropArea.addEventListener("dragover", e => e.preventDefault());
fileDropArea.addEventListener("drop", e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelected();
  }
});

// Generate sharing link button
generateLinkButton.addEventListener("click", () => {
  if (!fileToSend) return;
  generateShareLink();
});

// Copy link button
copyLinkButton.addEventListener("click", () => {
  shareLinkInput.select();
  document.execCommand("copy");
  alert("Link copied to clipboard");
});

// Connect button (receiver)
connectButton.addEventListener("click", () => {
  const link = shareCodeInput.value.trim();
  const peerId = parsePeerIdFromLink(link);
  if (!peerId) {
    showError("Invalid share code or link.");
    return;
  }
  connectToSender(peerId);
});

// Download button
downloadButton.addEventListener("click", () => {
  if (!fileMetadata || receiveBuffer.length === 0) return;
  const receivedBlob = new Blob(receiveBuffer);
  const url = URL.createObjectURL(receivedBlob);
  downloadButton.href = url;
  downloadButton.download = fileMetadata.name;
  downloadButton.click();
  receiveComplete.classList.remove("hidden");
  receiveProgress.classList.add("hidden");
});

// Save file button
saveFileButton.addEventListener("click", () => {
  downloadButton.click();
});

// Receive new file button
receiveNewFileButton.addEventListener("click", () => {
  resetReceiveScreen();
});

function showScreen(screen) {
  homeScreen.classList.remove("active");
  sendScreen.classList.remove("active");
  receiveScreen.classList.remove("active");
  if (screen === "send") sendScreen.classList.add("active");
  else if (screen === "receive") receiveScreen.classList.add("active");
  else homeScreen.classList.add("active");
}

// Initialize PeerJS
function initPeer() {
  if (peer) {
    peer.destroy();
  }
  peer = new Peer({
    host: "peerjs-server.herokuapp.com",
    secure: true,
    port: 443,
  });

  peer.on("open", id => {
    console.log("My peer ID is: " + id);
  });

  peer.on("connection", connection => {
    conn = connection;
    setupReceiveConnection();
  });

  peer.on("error", err => {
    showError(err.type || err.message || "Unknown error");
  });
}

// Handle file selected for sending
function handleFileSelected() {
  if (fileInput.files.length === 0) return;
  fileToSend = fileInput.files[0];
  fileInfo.classList.remove("hidden");
  fileNameElem.textContent = `Name: ${fileToSend.name}`;
  fileSizeElem.textContent = `Size: ${formatBytes(fileToSend.size)}`;
  fileTypeElem.textContent = `Type: ${fileToSend.type || "N/A"}`;
}

// Generate share link and QR code for sender
function generateShareLink() {
  if (!peer || !peer.id) {
    showError("Peer is not initialized.");
    return;
  }
  const shareLink = `${window.location.origin}${window.location.pathname}#${peer.id}`;
  shareLinkInput.value = shareLink;
  shareInfo.classList.remove("hidden");
  connectionStatus.classList.remove("hidden");
  peerConnectedMsg.classList.add("hidden");
  transferProgress.classList.add("hidden");
  transferCompleteMsg.classList.add("hidden");

  // Generate QR code
  qrcodeContainer.innerHTML = "";
  new QRCode(qrcodeContainer, {
    text: shareLink,
    width: 160,
    height: 160,
  });

  // Wait for connection from receiver
  peer.on("connection", connection => {
    conn = connection;
    setupSendConnection();
  });
}

// Setup connection for sending file
function setupSendConnection() {
  if (!conn) return;

  connectionStatus.classList.add("hidden");
  peerConnectedMsg.classList.remove("hidden");

  conn.on("open", () => {
    sendFileMetadata();
  });

  conn.on("error", err => {
    showError(err.type || err.message || "Connection error");
  });

  conn.on("close", () => {
    alert("Connection closed");
    resetSendScreen();
  });
}

// Send file metadata first
function sendFileMetadata() {
  if (!fileToSend) return;
  const metadata = {
    name: fileToSend.name,
    size: fileToSend.size,
    type: fileToSend.type,
  };
  conn.send({ type: "metadata", data: metadata });
  sendFileData();
}

// Send file data in chunks (64KB)
function sendFileData() {
  const chunkSize = 64 * 1024; // 64KB
  const fileReader = new FileReader();
  let offset = 0;

  fileReader.addEventListener("error", error => {
    showError("Error reading file: " + error);
  });

  fileReader.addEventListener("load", e => {
    conn.send({ type: "chunk", data: e.target.result });
    offset += e.target.result.byteLength;
    updateSendProgress(offset, fileToSend.size);

    if (offset < fileToSend.size) {
      readSlice(offset);
    } else {
      conn.send({ type: "done" });
      transferCompleteMsg.classList.remove("hidden");
      transferProgress.classList.add("hidden");
    }
  });

  const readSlice = o => {
    const slice = fileToSend.slice(offset, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };

  readSlice(0);
}

function updateSendProgress(sent, total) {
  transferProgress.classList.remove("hidden");
  const percent = Math.floor((sent / total) * 100);
  progressBar.style.width = percent + "%";
  progressPercentage.textContent = percent + "%";
}

// Setup connection for receiving file
function setupReceiveConnection() {
  if (!conn) return;

  receiveConnectionStatus.classList.remove("hidden");
  receiveFileInfo.classList.add("hidden");
  receiveProgress.classList.add("hidden");
  receiveComplete.classList.add("hidden");

  conn.on("data", data => {
    if (!data) return;

    if (data.type === "metadata") {
      fileMetadata = data.data;
      receiveFileName.textContent = `Name: ${fileMetadata.name}`;
      receiveFileSize.textContent = `Size: ${formatBytes(fileMetadata.size)}`;
      receiveFileType.textContent = `Type: ${fileMetadata.type || "N/A"}`;

      receiveConnectionStatus.classList.add("hidden");
      receiveFileInfo.classList.remove("hidden");
      downloadButton.classList.remove("hidden");
    } else if (data.type === "chunk") {
      receiveBuffer.push(data.data);
      receivedSize += data.data.byteLength;
      updateReceiveProgress(receivedSize, fileMetadata.size);
    } else if (data.type === "done") {
      receiveProgress.classList.add("hidden");
      receiveComplete.classList.remove("hidden");
    }
  });

  conn.on("open", () => {
    receiveConnectionStatus.classList.remove("hidden");
  });

  conn.on("error", err => {
    showError(err.type || err.message || "Connection error");
  });

  conn.on("close", () => {
    alert("Connection closed");
    resetReceiveScreen();
  });
}

function updateReceiveProgress(received, total) {
  receiveProgress.classList.remove("hidden");
  const percent = Math.floor((received / total) * 100);
  receiveProgressBar.style.width = percent + "%";
  receiveProgressPercentage.textContent = percent + "%";
}

// Connect to sender using peer ID (extracted from link)
function connectToSender(peerId) {
  if (!peer || !peerId) {
    showError("Peer or peer ID is not ready.");
    return;
  }
  conn = peer.connect(peerId);

  conn.on("open", () => {
    receiveConnectionStatus.classList.remove("hidden");
    receiveConnectionStatus.querySelector("h2").textContent = "Connected to sender. Waiting for file metadata...";
  });

  conn.on("data", data => {
    if (!data) return;

    if (data.type === "metadata") {
      fileMetadata = data.data;
      receiveFileName.textContent = `Name: ${fileMetadata.name}`;
      receiveFileSize.textContent = `Size: ${formatBytes(fileMetadata.size)}`;
      receiveFileType.textContent = `Type: ${fileMetadata.type || "N/A"}`;

      receiveConnectionStatus.classList.add("hidden");
      receiveFileInfo.classList.remove("hidden");
      receiveProgress.classList.remove("hidden");
      receiveComplete.classList.add("hidden");
    } else if (data.type === "chunk") {
      receiveBuffer.push(data.data);
      receivedSize += data.data.byteLength;
      updateReceiveProgress(receivedSize, fileMetadata.size);
    } else if (data.type === "done") {
      receiveProgress.classList.add("hidden");
      receiveComplete.classList.remove("hidden");
    }
  });

  conn.on("error", err => {
    showError(err.type || err.message || "Connection error");
  });

  conn.on("close", () => {
    alert("Connection closed");
    resetReceiveScreen();
  });
}

// Extract peer ID from full share link or code
function parsePeerIdFromLink(link) {
  if (!link) return null;
  try {
    if (link.includes("#")) {
      return link.split("#")[1];
    }
    return link; // If user inputs peer ID directly
  } catch {
    return null;
  }
}

// Reset send screen for next transfer
function resetSendScreen() {
  fileToSend = null;
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  shareInfo.classList.add("hidden");
  connectionStatus.classList.add("hidden");
  peerConnectedMsg.classList.add("hidden");
  transferProgress.classList.add("hidden");
  transferCompleteMsg.classList.add("hidden");
}

// Reset receive screen for next transfer
function resetReceiveScreen() {
  fileMetadata = null;
  receiveBuffer = [];
  receivedSize = 0;
  shareCodeInput.value = "";
  receiveConnectionStatus.classList.add("hidden");
  receiveFileInfo.classList.add("hidden");
  receiveProgress.classList.add("hidden");
  receiveComplete.classList.add("hidden");
}

// Utility: format bytes to human readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024,
    dm = decimals < 0 ? 0 : decimals,
    sizes = ["Bytes", "KB", "MB", "GB", "TB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Show error modal
function showError(message) {
  alert("Error: " + message);
}
