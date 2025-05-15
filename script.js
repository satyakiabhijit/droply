// script.js

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const sendScreen = document.getElementById('send-screen');
const receiveScreen = document.getElementById('receive-screen');

const sendBtn = document.getElementById('send-button');
const receiveBtn = document.getElementById('receive-button');

const fileInput = document.getElementById('file-input');
const fileDropArea = document.getElementById('file-drop-area');
const fileInfo = document.getElementById('file-info');
const fileNameElem = document.getElementById('file-name');
const fileSizeElem = document.getElementById('file-size');
const fileTypeElem = document.getElementById('file-type');

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
const connectBtn = document.getElementById('connect-button');

const receiveConnectionStatus = document.getElementById('receive-connection-status');
const receiveFileInfo = document.getElementById('receive-file-info');
const receiveFileName = document.getElementById('receive-file-name');
const receiveFileSize = document.getElementById('receive-file-size');
const receiveFileType = document.getElementById('receive-file-type');

const downloadBtn = document.getElementById('download-button');
const receiveProgress = document.getElementById('receive-progress');
const receiveProgressBar = document.getElementById('receive-progress-bar');
const receiveProgressPercentage = document.getElementById('receive-progress-percentage');

const receiveComplete = document.getElementById('receive-complete');
const saveFileBtn = document.getElementById('save-file-button');
const receiveNewFileBtn = document.getElementById('receive-new-file-button');

const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');
const errorOkBtn = document.getElementById('error-ok-button');
const closeBtn = document.querySelector('.close-button');

let peer = null;
let conn = null;
let currentFile = null;
let receivedBuffers = [];
let receivedFileMetadata = null;

// Utility to show error modal
function showError(msg) {
  errorMessage.textContent = msg;
  errorModal.classList.remove('hidden');
}

// Hide error modal
errorOkBtn.onclick = () => errorModal.classList.add('hidden');
closeBtn.onclick = () => errorModal.classList.add('hidden');

// Mode button event handlers
sendBtn.onclick = () => {
  homeScreen.classList.remove('active');
  sendScreen.classList.add('active');
  receiveScreen.classList.remove('active');
};

receiveBtn.onclick = () => {
  homeScreen.classList.remove('active');
  sendScreen.classList.remove('active');
  receiveScreen.classList.add('active');
};

// File input change handler
fileInput.onchange = () => {
  if (fileInput.files.length > 0) {
    currentFile = fileInput.files[0];
    fileNameElem.textContent = currentFile.name;
    fileSizeElem.textContent = (currentFile.size / (1024 * 1024)).toFixed(2) + ' MB';
    fileTypeElem.textContent = currentFile.type || 'Unknown';
    fileInfo.classList.remove('hidden');
  }
};

// Drag & drop styling and file capture
fileDropArea.ondragover = (e) => {
  e.preventDefault();
  fileDropArea.classList.add('dragover');
};
fileDropArea.ondragleave = (e) => {
  e.preventDefault();
  fileDropArea.classList.remove('dragover');
};
fileDropArea.ondrop = (e) => {
  e.preventDefault();
  fileDropArea.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
  }
};

// Copy share link
copyLinkBtn.onclick = () => {
  shareLinkInput.select();
  document.execCommand('copy');
  alert('Link copied to clipboard!');
};

// Helper: send file in chunks over DataConnection
function sendFile() {
  if (!conn || !currentFile) return;

  const chunkSize = 16 * 1024; // 16KB chunk size
  const fileReader = new FileReader();
  let offset = 0;

  fileReader.onerror = err => showError('File read error: ' + err);
  fileReader.onabort = () => showError('File read aborted');
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
      transferProgress.classList.add('hidden');
      transferComplete.classList.remove('hidden');
      conn.send({ done: true });
    }
  };

  const readSlice = o => {
    const slice = currentFile.slice(o, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };

  readSlice(0);
}

// Setup connection event handlers on sender side
function setupSenderConnection() {
  conn.on('open', () => {
    console.log('Connection opened with receiver');
    sendFile();
  });

  conn.on('error', err => {
    showError('Connection error: ' + err);
  });

  conn.on('close', () => {
    console.log('Connection closed');
  });
}

// Handle generate link button click
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
    console.log('Peer opened with ID:', id);
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
    shareLinkInput.value = shareUrl;

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

    peer.on('connection', connection => {
      conn = connection;
      connectionStatus.style.display = 'none';
      peerConnected.classList.remove('hidden');
      transferProgress.classList.remove('hidden');

      setupSenderConnection();
    });
  });

  peer.on('error', err => {
    console.error('Peer error:', err);
    showError('PeerJS error: ' + err);
    generateLinkBtn.disabled = false;
  });
};

// Connect button (receiver) click handler
connectBtn.onclick = () => {
  const urlOrId = shareCodeInput.value.trim();
  if (!urlOrId) {
    showError('Please enter a share code or URL');
    return;
  }

  let remoteId = urlOrId;
  try {
    // If URL, extract id param
    const urlObj = new URL(urlOrId);
    if (urlObj.searchParams.has('id')) {
      remoteId = urlObj.searchParams.get('id');
    }
  } catch {
    // Not a URL, just an ID or code
  }

  receiveConnectionStatus.classList.remove('hidden');
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.add('hidden');
  receiveComplete.classList.add('hidden');

  // Create peer for receiver
  peer = new Peer({
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    port: 443,
  });

  peer.on('open', () => {
    console.log('Receiver peer opened. Connecting to:', remoteId);
    conn = peer.connect(remoteId);

    conn.on('open', () => {
      console.log('Connected to sender');
      receiveConnectionStatus.classList.add('hidden');
      receiveFileInfo.classList.remove('hidden');

      // Send ready message to sender to start sending metadata
      conn.send({ ready: true });
    });

    conn.on('data', data => {
      if (data.done) {
        receiveProgress.classList.add('hidden');
        receiveComplete.classList.remove('hidden');
        return;
      }

      if (data.fileMeta) {
        // Metadata received
        receivedFileMetadata = data.fileMeta;
        receiveFileName.textContent = receivedFileMetadata.name;
        receiveFileSize.textContent = (receivedFileMetadata.size / (1024 * 1024)).toFixed(2) + ' MB';
        receiveFileType.textContent = receivedFileMetadata.type || 'Unknown';

        receiveFileInfo.classList.remove('hidden');
        receiveProgress.classList.remove('hidden');
        receivedBuffers = [];
        return;
      }

      if (data instanceof ArrayBuffer || data instanceof Blob) {
        receivedBuffers.push(data);

        const receivedSize = receivedBuffers.reduce((acc, buf) => acc + buf.byteLength || buf.size, 0);
        const percent = Math.floor((receivedSize / receivedFileMetadata.size) * 100);
        receiveProgressBar.style.width = percent + '%';
        receiveProgressPercentage.textContent = percent + '%';
      }
    });

    conn.on('error', err => {
      showError('Connection error: ' + err);
    });

    conn.on('close', () => {
      console.log('Connection closed');
    });
  });

  peer.on('error', err => {
    showError('Peer error: ' + err);
  });
};

// Download button (receiver) click handler
downloadBtn.onclick = () => {
  if (!receivedBuffers.length || !receivedFileMetadata) {
    showError('No file data received yet');
    return;
  }

  const blob = new Blob(receivedBuffers, { type: receivedFileMetadata.type });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = receivedFileMetadata.name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

// Reset receiver UI
receiveNewFileBtn.onclick = () => {
  receivedBuffers = [];
  receivedFileMetadata = null;
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.add('hidden');
  receiveComplete.classList.add('hidden');
  shareCodeInput.value = '';
};

// Optional: You can add QR scan feature here if you want

// Optional: Show error modal on uncaught errors
window.onerror = (msg, url, line, col, error) => {
  showError(msg);
};
