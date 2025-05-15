// script.js

const sendButton = document.getElementById('send-button');
const receiveButton = document.getElementById('receive-button');

const homeScreen = document.getElementById('home-screen');
const sendScreen = document.getElementById('send-screen');
const receiveScreen = document.getElementById('receive-screen');

const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameEl = document.getElementById('file-name');
const fileSizeEl = document.getElementById('file-size');
const fileTypeEl = document.getElementById('file-type');
const generateLinkBtn = document.getElementById('generate-link-button');

const shareLinkInput = document.getElementById('share-link');
const copyLinkBtn = document.getElementById('copy-link-button');
const qrcodeContainer = document.getElementById('qrcode');

const connectionStatus = document.getElementById('connection-status');
const peerConnected = document.getElementById('peer-connected');

const transferProgress = document.getElementById('transfer-progress');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');

const transferComplete = document.getElementById('transfer-complete');

const shareCodeInput = document.getElementById('share-code-input');
const connectButton = document.getElementById('connect-button');

const receiveConnectionStatus = document.getElementById('receive-connection-status');
const receiveFileInfo = document.getElementById('receive-file-info');
const receiveFileName = document.getElementById('receive-file-name');
const receiveFileSize = document.getElementById('receive-file-size');
const receiveFileType = document.getElementById('receive-file-type');

const downloadButton = document.getElementById('download-button');

const receiveProgress = document.getElementById('receive-progress');
const receiveProgressBar = document.getElementById('receive-progress-bar');
const receiveProgressPercentage = document.getElementById('receive-progress-percentage');

const receiveComplete = document.getElementById('receive-complete');

const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');
const errorOkButton = document.getElementById('error-ok-button');
const closeButton = document.querySelector('.close-button');

let peer;
let conn;
let currentFile;
let receivedBuffers = [];

const CHUNK_SIZE = 16 * 1024; // 16KB chunks for file transfer

// Helpers to show/hide screens
function showScreen(screen) {
  [homeScreen, sendScreen, receiveScreen].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// Show error modal
function showError(message) {
  errorMessage.textContent = message;
  errorModal.classList.remove('hidden');
}

// Close error modal
errorOkButton.onclick = () => errorModal.classList.add('hidden');
closeButton.onclick = () => errorModal.classList.add('hidden');

// Initial mode buttons
sendButton.onclick = () => {
  showScreen(sendScreen);
};

receiveButton.onclick = () => {
  showScreen(receiveScreen);
};

// File input handling
fileInput.onchange = () => {
  if (fileInput.files.length === 0) return;
  currentFile = fileInput.files[0];
  fileNameEl.textContent = `Name: ${currentFile.name}`;
  fileSizeEl.textContent = `Size: ${(currentFile.size / (1024*1024)).toFixed(2)} MB`;
  fileTypeEl.textContent = `Type: ${currentFile.type || 'N/A'}`;
  fileInfo.classList.remove('hidden');
};

// Setup PeerJS and generate share link
generateLinkBtn.onclick = () => {
  if (!currentFile) {
    showError('Please select a file first');
    return;
  }

  generateLinkBtn.disabled = true;

  peer = new Peer({
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    port: 443,
  });

  peer.on('open', id => {
    const shareUrl = `${window.location.origin}?id=${id}`;
    shareLinkInput.value = shareUrl;

    // Generate QR code
    qrcodeContainer.innerHTML = '';
    new QRCode(qrcodeContainer, {
      text: shareUrl,
      width: 128,
      height: 128,
    });

    connectionStatus.style.display = 'block';
    peerConnected.classList.add('hidden');
    transferProgress.classList.add('hidden');
    transferComplete.classList.add('hidden');

    // Listen for receiver connection
    peer.on('connection', connection => {
      conn = connection;
      connectionStatus.style.display = 'none';
      peerConnected.classList.remove('hidden');
      transferProgress.classList.remove('hidden');

      setupSenderConnection();
    });
  });

  peer.on('error', err => {
    generateLinkBtn.disabled = false;
    showError('PeerJS error: ' + err);
  });
};

// Copy share link
copyLinkBtn.onclick = () => {
  shareLinkInput.select();
  document.execCommand('copy');
  alert('Link copied to clipboard');
};

// Setup sender connection (send file in chunks)
function setupSenderConnection() {
  if (!conn) return;

  conn.on('open', () => {
    // Start sending file metadata first
    conn.send(JSON.stringify({
      type: 'metadata',
      name: currentFile.name,
      size: currentFile.size,
      fileType: currentFile.type,
    }));

    // Now start sending file data in chunks
    const fileReader = new FileReader();
    let offset = 0;

    fileReader.onerror = error => showError('File read error: ' + error);
    fileReader.onload = e => {
      if (!conn.open) return;

      conn.send(e.target.result);
      offset += e.target.result.byteLength;
      const percent = Math.floor((offset / currentFile.size) * 100);
      progressBar.style.width = percent + '%';
      progressPercentage.textContent = percent + '%';

      if (offset < currentFile.size) {
        readSlice(offset);
      } else {
        // Done sending
        transferComplete.classList.remove('hidden');
      }
    };

    const readSlice = o => {
      const slice = currentFile.slice(o, o + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  });

  conn.on('close', () => {
    connectionStatus.style.display = 'none';
    showError('Connection closed');
  });

  conn.on('error', err => {
    showError('Connection error: ' + err);
  });
}

// --- Receiver side code ---

connectButton.onclick = () => {
  const input = shareCodeInput.value.trim();

  let peerId = input;
  try {
    // if input is a full URL, extract id query param
    const url = new URL(input);
    peerId = url.searchParams.get('id') || input;
  } catch {
    // input not URL, use as is
  }

  if (!peerId) {
    showError('Please enter a valid share code or URL');
    return;
  }

  connectButton.disabled = true;
  receiveConnectionStatus.classList.remove('hidden');
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.add('hidden');
  receiveComplete.classList.add('hidden');

  peer = new Peer({
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    port: 443,
  });

  peer.on('open', id => {
    conn = peer.connect(peerId, { reliable: true });

    conn.on('open', () => {
      receiveConnectionStatus.classList.add('hidden');
    });

    receivedBuffers = [];
    let fileMeta = null;
    let receivedSize = 0;

    conn.on('data', data => {
      // Check if metadata or file data chunk
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'metadata') {
            fileMeta = msg;
            receiveFileName.textContent = `Name: ${fileMeta.name}`;
            receiveFileSize.textContent = `Size: ${(fileMeta.size / (1024*1024)).toFixed(2)} MB`;
            receiveFileType.textContent = `Type: ${fileMeta.fileType || 'N/A'}`;
            receiveFileInfo.classList.remove('hidden');
          }
        } catch {
          // Ignore invalid JSON
        }
      } else {
        // Binary data chunk (ArrayBuffer)
        receivedBuffers.push(data);
        receivedSize += data.byteLength;
        const percent = Math.floor((receivedSize / fileMeta.size) * 100);
        receiveProgressBar.style.width = percent + '%';
        receiveProgressPercentage.textContent = percent + '%';
        receiveProgress.classList.remove('hidden');

        if (receivedSize >= fileMeta.size) {
          receiveComplete.classList.remove('hidden');
          receiveProgress.classList.add('hidden');
          conn.close();
        }
      }
    });

    conn.on('close', () => {
      console.log('Connection closed');
    });

    conn.on('error', err => {
      showError('Connection error: ' + err);
    });
  });

  peer.on('error', err => {
    showError('PeerJS error: ' + err);
  });
};

downloadButton.onclick = () => {
  if (!receivedBuffers.length) return;

  const blob = new Blob(receivedBuffers);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Use received file name or fallback
  a.download = receiveFileName.textContent.replace(/^Name: /, '') || 'downloaded_file';

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

// Optional: Reload receive screen for new transfer
document.getElementById('receive-new-file-button').onclick = () => {
  location.reload();
};
