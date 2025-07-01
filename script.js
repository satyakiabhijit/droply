// script.js

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const sendScreen = document.getElementById('send-screen');
const receiveScreen = document.getElementById('receive-screen');

const sendBtn = document.getElementById('send-button');
const receiveBtn = document.getElementById('receive-button');
const backFromSendBtn = document.getElementById('back-from-send');
const backFromReceiveBtn = document.getElementById('back-from-receive');

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
const shareSection = document.getElementById('share-section');

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

const transferFinished = document.getElementById('transfer-finished');
const acceptTransferBtn = document.getElementById('accept-transfer-button');
const rejectTransferBtn = document.getElementById('reject-transfer-button');
const receiveNewFileBtn = document.getElementById('receive-new-file-button');

// QR Scanner elements
const scanQrBtn = document.getElementById('scan-qr-button');
const qrScannerModal = document.getElementById('qr-scanner-modal');
const qrVideo = document.getElementById('qr-video');
const qrScannerStatus = document.getElementById('qr-scanner-status');
const closeQrScannerBtn = document.querySelector('.close-qr-scanner');
const stopQrScannerBtn = document.getElementById('stop-qr-scanner');

const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');
const errorOkBtn = document.getElementById('error-ok-button');
const closeBtn = document.querySelector('.close-button');

// Header navigation
const header = document.querySelector('header');

let peer = null;
let conn = null;
let currentFile = null;
let receivedBuffers = [];
let receivedFileMetadata = null;

// QR Scanner variables
let qrStream = null;
let qrScannerActive = false;

// Utility to show error modal
function showError(msg) {
  errorMessage.textContent = msg;
  errorModal.classList.remove('hidden');
}

// Hide error modal
errorOkBtn.onclick = () => errorModal.classList.add('hidden');
closeBtn.onclick = () => errorModal.classList.add('hidden');

// QR Scanner modal handlers
closeQrScannerBtn.onclick = () => stopQrScanner();
stopQrScannerBtn.onclick = () => stopQrScanner();

// Header click handler - navigate to home
header.onclick = () => {
  // Reset both screens
  resetSendScreen();
  resetReceiveScreen();
  
  // Navigate to home
  sendScreen.classList.remove('active');
  receiveScreen.classList.remove('active');
  homeScreen.classList.add('active');
};

// Mode button event handlers
sendBtn.onclick = () => {
  homeScreen.classList.remove('active');
  sendScreen.classList.add('active');
  receiveScreen.classList.remove('active');
  
  // Ensure all sections are properly hidden when entering send mode
  shareSection.classList.add('hidden');
  connectionStatus.classList.add('hidden');
  peerConnected.classList.add('hidden');
  transferProgress.classList.add('hidden');
  transferComplete.classList.add('hidden');
};

receiveBtn.onclick = () => {
  homeScreen.classList.remove('active');
  sendScreen.classList.remove('active');
  receiveScreen.classList.add('active');
  
  // Ensure all sections are properly hidden when entering receive mode
  receiveConnectionStatus.classList.add('hidden');
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.add('hidden');
  transferFinished.classList.add('hidden');
};

// Back button event handlers
backFromSendBtn.onclick = () => {
  // Reset send screen state
  resetSendScreen();
  // Navigate back to home
  sendScreen.classList.remove('active');
  receiveScreen.classList.remove('active');
  homeScreen.classList.add('active');
};

backFromReceiveBtn.onclick = () => {
  // Reset receive screen state
  resetReceiveScreen();
  // Navigate back to home
  receiveScreen.classList.remove('active');
  sendScreen.classList.remove('active');
  homeScreen.classList.add('active');
};

// Reset functions
function resetSendScreen() {
  // Reset file selection
  fileInput.value = '';
  currentFile = null;
  fileInfo.classList.add('hidden');
  
  // Reset share section
  shareSection.classList.add('hidden');
  shareLinkInput.value = '';
  qrcodeContainer.innerHTML = '';
  
  // Reset connection status
  connectionStatus.style.display = 'none';
  peerConnected.classList.add('hidden');
  transferProgress.classList.add('hidden');
  transferComplete.classList.add('hidden');
  
  // Reset progress bars
  progressBar.style.width = '0%';
  progressPercentage.textContent = '0%';
  
  // Reset button state
  generateLinkBtn.disabled = false;
  
  // Close peer connection if exists
  if (peer) {
    peer.destroy();
    peer = null;
  }
  if (conn) {
    conn.close();
    conn = null;
  }
}

function resetReceiveScreen() {
  // Reset input
  shareCodeInput.value = '';
  
  // Reset button states
  connectBtn.disabled = false;
  
  // Reset all sections
  receiveConnectionStatus.classList.add('hidden');
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.add('hidden');
  transferFinished.classList.add('hidden');
  
  // Reset progress bars
  receiveProgressBar.style.width = '0%';
  receiveProgressPercentage.textContent = '0%';
  
  // Reset received data
  receivedBuffers = [];
  receivedFileMetadata = null;
  
  // Stop QR scanner if active
  if (qrScannerActive) {
    stopQrScanner();
  }
  
  // Close peer connection if exists
  if (peer) {
    peer.destroy();
    peer = null;
  }
  if (conn) {
    conn.close();
    conn = null;
  }
}

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
  shareLinkInput.setSelectionRange(0, 99999); // For mobile devices
  navigator.clipboard.writeText(shareLinkInput.value).then(() => {
    // Visual feedback
    const originalText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = '✅ Copied!';
    copyLinkBtn.style.background = 'var(--success-color)';
    copyLinkBtn.style.color = 'white';
    
    setTimeout(() => {
      copyLinkBtn.textContent = originalText;
      copyLinkBtn.style.background = '';
      copyLinkBtn.style.color = '';
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    document.execCommand('copy');
    alert('Link copied to clipboard!');
  });
};

// Helper: send file in chunks over DataConnection
function sendFile() {
  if (!conn || !currentFile) return;

  // First, send file metadata
  const metadata = {
    fileMeta: {
      name: currentFile.name,
      size: currentFile.size,
      type: currentFile.type
    }
  };
  
  // Wait for connection to be fully ready before sending metadata
  if (conn.open) {
    conn.send(metadata);
  } else {
    conn.on('open', () => {
      conn.send(metadata);
    });
  }

  const chunkSize = 8 * 1024; // Reduced chunk size for better reliability (8KB)
  const fileReader = new FileReader();
  let offset = 0;
  let retryCount = 0;
  const maxRetries = 3;

  fileReader.onerror = err => showError('File read error: ' + err);
  fileReader.onabort = () => showError('File read aborted');
  fileReader.onload = e => {
    if (!conn || !conn.open) {
      console.error('Connection lost during file transfer');
      showError('Connection lost during file transfer');
      return;
    }

    // Send the chunk with retry logic
    const sendChunk = () => {
      try {
        conn.send(e.target.result);
        offset += e.target.result.byteLength;
        const percent = Math.floor((offset / currentFile.size) * 100);
        progressBar.style.width = percent + '%';
        progressPercentage.textContent = percent + '%';
        
        console.log(`Sent chunk: ${offset}/${currentFile.size} bytes (${percent}%)`);
        
        // Reset retry count on successful send
        retryCount = 0;

        if (offset < currentFile.size) {
          // Continue reading next chunk with increased delay for stability
          setTimeout(() => readSlice(offset), 10);
        } else {
          // File completely sent - add delay before sending done signal
          console.log('File sending complete:', offset, '/', currentFile.size);
          setTimeout(() => {
            if (conn && conn.open) {
              conn.send({ done: true });
              transferProgress.classList.add('hidden');
            }
          }, 200); // Increased delay to ensure last chunk is processed
        }
      } catch (error) {
        console.error('Error sending chunk:', error);
        retryCount++;
        
        if (retryCount <= maxRetries) {
          console.log(`Retrying chunk send (attempt ${retryCount}/${maxRetries})`);
          setTimeout(sendChunk, 100 * retryCount); // Exponential backoff
        } else {
          showError('Failed to send file chunk after multiple retries: ' + error.message);
        }
      }
    };
    
    sendChunk();
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
  });  conn.on('data', data => {
    console.log('Sender received data:', data);
    
    if (data.ready) {
      console.log('Receiver ready, starting file transfer');
      // Add small delay to ensure connection is stable
      setTimeout(() => sendFile(), 50);
    } else if (data.rejected) {
      console.log('Receiver rejected the transfer');
      showError('Transfer rejected by receiver');
      // Reset to connection waiting state
      connectionStatus.style.display = 'block';
      peerConnected.classList.add('hidden');
      transferProgress.classList.add('hidden');
      transferComplete.classList.add('hidden');
    } else if (data.received === true) {
      console.log('Receiver confirmed file was received successfully');
      // Hide progress and show success message
      transferProgress.classList.add('hidden');
      transferComplete.classList.remove('hidden');
    } else if (data.received === false) {
      console.log('Receiver reported transfer failed:', data.error);
      showError('File transfer failed on receiver side: ' + (data.error || 'Unknown error'));
    }
  });

  conn.on('error', err => {
    console.error('Connection error:', err);
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

  // Configure peer with STUN servers for better cross-network connectivity
  const peerConfig = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    },
    debug: 0 // Reduce debug output
  };

  peer = new Peer(peerConfig);

  peer.on('open', id => {
    console.log('Peer opened with ID:', id);
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
    shareLinkInput.value = shareUrl;

    // Show share section
    shareSection.classList.remove('hidden');

    qrcodeContainer.innerHTML = '';
    const qr = qrcode(0, 'M');
    qr.addData(shareUrl);
    qr.make();
    qrcodeContainer.innerHTML = qr.createImgTag(4);

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

  // Disable connect button during connection attempt
  connectBtn.disabled = true;

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
  transferFinished.classList.add('hidden');

  // Create peer for receiver with same STUN configuration
  const peerConfig = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    },
    debug: 0 // Reduce debug output
  };

  peer = new Peer(peerConfig);

  peer.on('open', () => {
    console.log('Receiver peer opened. Connecting to:', remoteId);
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!conn || !conn.open) {
        receiveConnectionStatus.classList.add('hidden');
        connectBtn.disabled = false;
        showError('Connection timeout. Please check the share code and try again.');
        if (peer) {
          peer.destroy();
          peer = null;
        }
      }
    }, 15000); // 15 second timeout
    
    conn = peer.connect(remoteId, {
      reliable: true, // Use reliable data channel
      serialization: 'binary' // Use binary serialization for better performance
    });

    conn.on('open', () => {
      clearTimeout(connectionTimeout); // Clear timeout on successful connection
      console.log('Connected to sender');
      receiveConnectionStatus.classList.add('hidden');
      receiveFileInfo.classList.remove('hidden');
      connectBtn.disabled = false; // Re-enable connect button

      // Set a timeout for file metadata reception
      const metadataTimeout = setTimeout(() => {
        if (!receivedFileMetadata) {
          showError('Timeout waiting for file information. Please try reconnecting.');
          conn.close();
        }
      }, 10000); // 10 second timeout

      // Clear timeout when metadata is received
      const originalDataHandler = conn._events?.data;
      conn.on('data', (data) => {
        if (data.fileMeta) {
          clearTimeout(metadataTimeout);
        }
      });

      // Don't send ready immediately - wait for user to accept
    });

    conn.on('data', data => {
      if (data.done) {
        // Add a small delay to ensure all chunks are processed
        setTimeout(() => {
          if (receivedBuffers.length > 0 && receivedFileMetadata) {
            const receivedSize = receivedBuffers.reduce((acc, buf) => acc + buf.byteLength || buf.size, 0);
            // Allow for small tolerance due to potential browser differences
            const tolerance = 1024; // 1KB tolerance
            
            if (receivedSize >= (receivedFileMetadata.size - tolerance)) {
              console.log('File transfer completed successfully:', receivedSize, '/', receivedFileMetadata.size);
              receiveProgress.classList.add('hidden');
              transferFinished.classList.remove('hidden');
              // Send acknowledgment back to sender that file was received successfully
              conn.send({ received: true });
            } else {
              console.log('Transfer marked as done but file incomplete:', receivedSize, '/', receivedFileMetadata.size);
              showError(`Transfer incomplete. Received ${receivedSize} of ${receivedFileMetadata.size} bytes. Please try again.`);
              // Send failure acknowledgment to sender
              conn.send({ received: false, error: 'Incomplete transfer' });
            }
          } else {
            showError('No file data received. Please try again.');
            conn.send({ received: false, error: 'No data received' });
          }
        }, 100); // Small delay to ensure all chunks are processed
        return;
      }

      if (data.fileMeta) {
        // Metadata received
        receivedFileMetadata = data.fileMeta;
        receiveFileName.textContent = receivedFileMetadata.name;
        receiveFileSize.textContent = (receivedFileMetadata.size / (1024 * 1024)).toFixed(2) + ' MB';
        receiveFileType.textContent = receivedFileMetadata.type || 'Unknown';

        receiveFileInfo.classList.remove('hidden');
        receivedBuffers = [];
        
        console.log('File metadata received:', receivedFileMetadata);
        return;
      }

      if (data instanceof ArrayBuffer || data instanceof Blob) {
        receivedBuffers.push(data);

        if (receivedFileMetadata) {
          const receivedSize = receivedBuffers.reduce((acc, buf) => acc + buf.byteLength || buf.size, 0);
          const percent = Math.min(100, Math.floor((receivedSize / receivedFileMetadata.size) * 100));
          receiveProgressBar.style.width = percent + '%';
          receiveProgressPercentage.textContent = percent + '%';
          
          console.log(`Received chunk: ${receivedSize}/${receivedFileMetadata.size} bytes (${percent}%)`);
        }
      }
    });

    conn.on('error', err => {
      console.error('Connection error:', err);
      receiveConnectionStatus.classList.add('hidden');
      connectBtn.disabled = false; // Re-enable connect button
      showError('Connection error: ' + err);
    });

    conn.on('close', () => {
      console.log('Connection closed');
      // Check if transfer was incomplete
      if (receivedFileMetadata && receivedBuffers.length > 0) {
        const receivedSize = receivedBuffers.reduce((acc, buf) => acc + buf.byteLength || buf.size, 0);
        if (receivedSize < receivedFileMetadata.size) {
          showError(`Connection closed unexpectedly. Only received ${receivedSize} of ${receivedFileMetadata.size} bytes.`);
        }
      }
    });
  });

  peer.on('error', err => {
    console.error('Receiver peer error:', err);
    receiveConnectionStatus.classList.add('hidden');
    connectBtn.disabled = false; // Re-enable connect button
    showError('Failed to connect: ' + err);
  });
};

// Accept/Reject transfer handlers
acceptTransferBtn.onclick = () => {
  if (!conn || !conn.open) {
    showError('Connection lost');
    return;
  }
  
  // Hide file info, show progress
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.remove('hidden');
  
  // Send ready message to sender to start transfer
  conn.send({ ready: true });
};

rejectTransferBtn.onclick = () => {
  if (conn && conn.open) {
    conn.send({ rejected: true });
    // Close connection after sending rejection
    setTimeout(() => {
      if (conn) {
        conn.close();
      }
    }, 100);
  }
  
  // Reset to initial state
  receiveFileInfo.classList.add('hidden');
  receiveProgress.classList.add('hidden');
  transferFinished.classList.add('hidden');
  receiveConnectionStatus.classList.add('hidden');
  
  // Show brief confirmation
  showError('Transfer rejected. You can enter a new share code to try again.');
};

// Download button (receiver) click handler
downloadBtn.onclick = () => {
  if (!receivedBuffers.length || !receivedFileMetadata) {
    showError('No file data received yet');
    return;
  }

  // Verify file is complete before allowing download
  const receivedSize = receivedBuffers.reduce((acc, buf) => acc + buf.byteLength || buf.size, 0);
  if (receivedSize < receivedFileMetadata.size) {
    showError(`File transfer incomplete. Received ${receivedSize} bytes of ${receivedFileMetadata.size} bytes.`);
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
  
  // Show a simple confirmation
  const downloadConfirmation = document.createElement('div');
  downloadConfirmation.className = 'download-confirmation';
  downloadConfirmation.innerHTML = '✅ File downloaded successfully!';
  downloadConfirmation.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    font-weight: 500;
  `;
  document.body.appendChild(downloadConfirmation);
  
  // Remove the confirmation after 3 seconds
  setTimeout(() => {
    if (downloadConfirmation.parentNode) {
      downloadConfirmation.parentNode.removeChild(downloadConfirmation);
    }
  }, 3000);
};

// Save file button (alternative download button) click handler - REMOVED (no such element exists)

// Reset receiver UI
receiveNewFileBtn.onclick = () => {
  resetReceiveScreen();
};

// QR Code Scanner Functionality
scanQrBtn.onclick = () => {
  startQrScanner();
};

function startQrScanner() {
  qrScannerModal.classList.remove('hidden');
  qrScannerStatus.textContent = 'Starting camera...';
  qrScannerStatus.className = 'scanner-status';
  
  // Request camera access
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'environment', // Use back camera if available
      width: { ideal: 1280 },
      height: { ideal: 720 }
    } 
  })
  .then(stream => {
    qrStream = stream;
    qrVideo.srcObject = stream;
    qrScannerActive = true;
    qrScannerStatus.textContent = 'Position QR code in the frame';
    
    // Start scanning for QR codes
    scanForQrCode();
  })
  .catch(err => {
    console.error('Camera access denied:', err);
    qrScannerStatus.textContent = 'Camera access denied. Please enable camera permissions.';
    qrScannerStatus.className = 'scanner-status error';
  });
}

function scanForQrCode() {
  if (!qrScannerActive) return;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Set canvas size to match video
  canvas.width = qrVideo.videoWidth;
  canvas.height = qrVideo.videoHeight;
  
  if (canvas.width > 0 && canvas.height > 0) {
    // Draw current video frame to canvas
    context.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try to decode QR code using jsQR library
    try {
      // Simple QR detection - look for URL patterns in the image
      // This is a basic implementation - in production you'd use a proper QR library
      detectQrCodePattern(canvas);
    } catch (error) {
      console.log('QR scan error:', error);
    }
  }
  
  // Continue scanning
  if (qrScannerActive) {
    requestAnimationFrame(scanForQrCode);
  }
}

function detectQrCodePattern(canvas) {
  // Get image data from canvas
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
  // Use jsQR library to detect QR codes
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    
    if (code && code.data) {
      console.log('QR Code detected:', code.data);
      handleQrCodeDetected(code.data);
      return;
    }
  }
  
  // Fallback: Click to paste from clipboard (for testing)
  if (!qrVideo.hasClickListener) {
    qrVideo.hasClickListener = true;
    qrVideo.onclick = () => {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
          if (text && (text.includes('localhost') || text.includes('http') || text.length > 10)) {
            handleQrCodeDetected(text);
          }
        }).catch(() => {
          // Show manual input option
          const manualUrl = prompt('QR scan failed. Please paste the share URL manually:');
          if (manualUrl) {
            handleQrCodeDetected(manualUrl);
          }
        });
      }
    };
  }
}

function handleQrCodeDetected(url) {
  qrScannerStatus.textContent = '✅ QR Code detected!';
  qrScannerStatus.className = 'scanner-status success';
  
  // Vibrate if supported
  if (navigator.vibrate) {
    navigator.vibrate(200);
  }
  
  // Fill the share code input
  shareCodeInput.value = url;
  
  // Auto-close scanner after a short delay
  setTimeout(() => {
    stopQrScanner();
    // Optionally auto-connect
    if (url.trim()) {
      connectBtn.click();
    }
  }, 1500);
}

function stopQrScanner() {
  qrScannerActive = false;
  
  // Stop camera stream
  if (qrStream) {
    qrStream.getTracks().forEach(track => track.stop());
    qrStream = null;
  }
  
  // Clear video source
  qrVideo.srcObject = null;
  
  // Hide modal
  qrScannerModal.classList.add('hidden');
}

// Alternative: Manual QR input for testing
function simulateQrScan() {
  const testUrl = prompt('Enter share URL for testing:');
  if (testUrl) {
    handleQrCodeDetected(testUrl);
  }
}

// Add double-tap to simulate QR scan (for testing)
let tapCount = 0;
scanQrBtn.addEventListener('click', (e) => {
  tapCount++;
  if (tapCount === 1) {
    setTimeout(() => {
      if (tapCount === 2) {
        e.preventDefault();
        simulateQrScan();
      }
      tapCount = 0;
    }, 300);
  }
});

// Optional: Show error modal on uncaught errors
window.onerror = (msg, url, line, col, error) => {
  showError(msg);
};

// Initialize app
function initializeApp() {
  // Check if URL has share parameters
  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('id');
  
  if (shareId) {
    // Auto-switch to receive mode and fill in the share code
    homeScreen.classList.remove('active');
    sendScreen.classList.remove('active');
    receiveScreen.classList.add('active');
    shareCodeInput.value = window.location.href;
    
    // Optionally auto-connect after a brief delay
    setTimeout(() => {
      if (shareCodeInput.value.trim()) {
        connectBtn.click();
      }
    }, 500);
  }
}

// Call initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);
