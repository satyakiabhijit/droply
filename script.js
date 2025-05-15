// script.js

// UI elements
const homeScreen = document.getElementById("home-screen");
const sendScreen = document.getElementById("send-screen");
const receiveScreen = document.getElementById("receive-screen");

const sendButton = document.getElementById("send-button");
const receiveButton = document.getElementById("receive-button");

const fileInput = document.getElementById("file-input");
const fileInfo = document.getElementById("file-info");
const fileNameEl = document.getElementById("file-name");
const fileSizeEl = document.getElementById("file-size");
const fileTypeEl = document.getElementById("file-type");
const generateLinkButton = document.getElementById("generate-link-button");

const shareLinkInput = document.getElementById("share-link");
const copyLinkButton = document.getElementById("copy-link-button");
const qrcodeContainer = document.getElementById("qrcode");

const connectionStatus = document.getElementById("connection-status");
const peerConnected = document.getElementById("peer-connected");
const transferProgress = document.getElementById("transfer-progress");
const progressBar = document.getElementById("progress-bar");
const progressPercentage = document.getElementById("progress-percentage");
const transferComplete = document.getElementById("transfer-complete");

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

const errorModal = document.getElementById("error-modal");
const errorMessage = document.getElementById("error-message");
const errorOkButton = document.getElementById("error-ok-button");
const closeButton = document.querySelector(".close-button");

// Globals
let peer;
let conn; // DataConnection object
let currentFile;
let receivedBuffers = [];
let receivedSize = 0;
let receiveFileMetadata;
let fileDownloadUrl;

// Functions to show/hide screens
function showScreen(screen) {
    homeScreen.classList.remove("active");
    sendScreen.classList.remove("active");
    receiveScreen.classList.remove("active");
    screen.classList.add("active");
}

function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.remove("hidden");
}

errorOkButton.onclick = () => errorModal.classList.add("hidden");
closeButton.onclick = () => errorModal.classList.add("hidden");

// Initialize PeerJS peer
function createPeer(id) {
    peer = new Peer(id, {
        debug: 2
    });

    peer.on("error", (err) => {
        showError("Peer error: " + err);
    });
}

// Handle Send Mode
sendButton.addEventListener("click", () => {
    showScreen(sendScreen);
    resetSendUI();
    createPeer(); // generate random id
    peer.on("open", (id) => {
        console.log("Peer ID:", id);
        shareLinkInput.value = generateShareLink(id);
        generateQRCode(shareLinkInput.value);
    });

    // Incoming connection handler
    peer.on("connection", (connection) => {
        conn = connection;
        setupSenderConnection();
    });
});

// File input change
fileInput.addEventListener("change", () => {
    if (fileInput.files.length === 0) {
        fileInfo.classList.add("hidden");
        return;
    }
    currentFile = fileInput.files[0];
    fileNameEl.textContent = "Name: " + currentFile.name;
    fileSizeEl.textContent = "Size: " + formatBytes(currentFile.size);
    fileTypeEl.textContent = "Type: " + currentFile.type;
    fileInfo.classList.remove("hidden");
});

// Generate sharing link button
generateLinkButton.addEventListener("click", () => {
    if (!peer || !peer.id) {
        showError("Peer not ready yet, wait a moment.");
        return;
    }
    if (!currentFile) {
        showError("Select a file first.");
        return;
    }
    shareLinkInput.value = generateShareLink(peer.id);
    generateQRCode(shareLinkInput.value);
    document.getElementById("share-info").classList.remove("hidden");
});

// Copy share link to clipboard
copyLinkButton.addEventListener("click", () => {
    shareLinkInput.select();
    document.execCommand("copy");
    alert("Link copied to clipboard!");
});

// Setup sender connection events
function setupSenderConnection() {
    connectionStatus.style.display = "none";
    peerConnected.classList.remove("hidden");

    conn.on("open", () => {
        sendFile(currentFile);
    });

    conn.on("close", () => {
        alert("Connection closed.");
        resetSendUI();
    });

    conn.on("error", (err) => {
        showError("Connection error: " + err);
    });
}

// Send file in chunks
function sendFile(file) {
    const chunkSize = 16 * 1024; // 16KB chunk size
    let offset = 0;

    transferProgress.classList.remove("hidden");
    transferComplete.classList.add("hidden");

    function readSlice(o) {
        const reader = new FileReader();
        const slice = file.slice(o, o + chunkSize);
        reader.onload = (e) => {
            if (conn.open) {
                conn.send(e.target.result);
                offset += e.target.result.byteLength;
                const percent = Math.floor((offset / file.size) * 100);
                progressBar.style.width = percent + "%";
                progressPercentage.textContent = percent + "%";
                if (offset < file.size) {
                    readSlice(offset);
                } else {
                    transferComplete.classList.remove("hidden");
                    transferProgress.classList.add("hidden");
                    conn.send("EOF"); // signal end of file
                }
            }
        };
        reader.readAsArrayBuffer(slice);
    }

    // Send file metadata first
    conn.send(JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
    }));

    readSlice(0);
}

// Format bytes helper
function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024,
        dm = 2,
        sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Generate sharing link
function generateShareLink(peerId) {
    // For demo, just a simple URL with hash as peer id
    return `${window.location.origin}${window.location.pathname}#${peerId}`;
}

// Generate QR code
function generateQRCode(text) {
    qrcodeContainer.innerHTML = "";
    new QRCode(qrcodeContainer, {
        text: text,
        width: 150,
        height: 150
    });
}

// Reset Send UI
function resetSendUI() {
    fileInput.value = "";
    fileInfo.classList.add("hidden");
    document.getElementById("share-info").classList.add("hidden");
    connectionStatus.style.display = "block";
    peerConnected.classList.add("hidden");
    transferProgress.classList.add("hidden");
    transferComplete.classList.add("hidden");
    progressBar.style.width = "0%";
    progressPercentage.textContent = "0%";
    qrcodeContainer.innerHTML = "";
    shareLinkInput.value = "";
}

// -------- RECEIVE MODE ---------

receiveButton.addEventListener("click", () => {
    showScreen(receiveScreen);
    resetReceiveUI();
    createPeer();
    peer.on("open", (id) => {
        console.log("Receiver Peer ID:", id);
    });

    peer.on("error", (err) => {
        showError("Peer error: " + err);
    });
});

connectButton.addEventListener("click", () => {
    const link = shareCodeInput.value.trim();
    if (!link) {
        showError("Please enter a share link or code.");
        return;
    }
    const peerId = parsePeerIdFromLink(link);
    if (!peerId) {
        showError("Invalid link or code.");
        return;
    }
    connectToSender(peerId);
});

// Extract peerId from share link (hash)
function parsePeerIdFromLink(link) {
    try {
        if (link.includes("#")) {
            return link.split("#")[1];
        }
        return link; // if just ID entered
    } catch {
        return null;
    }
}

// Connect to sender peer
function connectToSender(peerId) {
    receiveConnectionStatus.classList.remove("hidden");
    conn = peer.connect(peerId);

    conn.on("open", () => {
        console.log("Connected to sender");
        receiveConnectionStatus.classList.add("hidden");
    });

    conn.on("data", (data) => {
        if (typeof data === "string") {
            if (data === "EOF") {
                finishReceivingFile();
            } else {
                try {
                    // Try parse JSON metadata
                    let meta = JSON.parse(data);
                    if (meta.fileName) {
                        receiveFileMetadata = meta;
                        showReceiveFileInfo(meta);
                    }
                } catch (e) {
                    // Not JSON, ignore
                }
            }
        } else {
            // Received chunk (ArrayBuffer)
            receivedBuffers.push(data);
            receivedSize += data.byteLength;
            updateReceiveProgress();
        }
    });

    conn.on("close", () => {
        console.log("Connection closed by sender");
    });

    conn.on("error", (err) => {
        showError("Connection error: " + err);
    });
}

function showReceiveFileInfo(meta) {
    receiveFileName.textContent = "Name: " + meta.fileName;
    receiveFileSize.textContent = "Size: " + formatBytes(meta.fileSize);
    receiveFileType.textContent = "Type: " + meta.fileType;
    receiveFileInfo.classList.remove("hidden");
    downloadButton.disabled = false;
}

downloadButton.addEventListener("click", () => {
    downloadButton.disabled = true;
    receiveProgress.classList.remove("hidden");
    receiveFileInfo.classList.add("hidden");
    // Actual file will be finalized on EOF
});

function updateReceiveProgress() {
    if (!receiveFileMetadata) return;
    const percent = Math.floor((receivedSize / receiveFileMetadata.fileSize) * 100);
    receiveProgressBar.style.width = percent + "%";
    receiveProgressPercentage.textContent = percent + "%";
}

function finishReceivingFile() {
    receiveProgress.classList.add("hidden");
    receiveComplete.classList.remove("hidden");

    // Combine all chunks into a blob
    const blob = new Blob(receivedBuffers, { type: receiveFileMetadata.fileType });
    fileDownloadUrl = URL.createObjectURL(blob);
    saveFileButton.disabled = false;
}

saveFileButton.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = fileDownloadUrl;
    a.download = receiveFileMetadata.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

receiveNewFileButton.addEventListener("click", () => {
    resetReceiveUI();
});

function resetReceiveUI() {
    shareCodeInput.value = "";
    receiveConnectionStatus.classList.add("hidden");
    receiveFileInfo.classList.add("hidden");
    receiveProgress.classList.add("hidden");
    receiveComplete.classList.add("hidden");
    receivedBuffers = [];
    receivedSize = 0;
    receiveFileMetadata = null;
    fileDownloadUrl = null;
    saveFileButton.disabled = true;
}

// Scan QR button functionality is omitted here but can be added if needed.

