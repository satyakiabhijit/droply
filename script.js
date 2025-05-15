document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const homeScreen = document.getElementById('home-screen');
    const sendScreen = document.getElementById('send-screen');
    const receiveScreen = document.getElementById('receive-screen');
    const sendButton = document.getElementById('send-button');
    const receiveButton = document.getElementById('receive-button');
    const fileInput = document.getElementById('file-input');
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const fileType = document.getElementById('file-type');
    const generateLinkButton = document.getElementById('generate-link-button');
    const shareInfo = document.getElementById('share-info');
    const shareLink = document.getElementById('share-link');
    const copyLinkButton = document.getElementById('copy-link-button');
    const qrcodeContainer = document.getElementById('qrcode');
    const connectionStatus = document.getElementById('connection-status');
    const peerConnected = document.getElementById('peer-connected');
    const transferProgress = document.getElementById('transfer-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const transferComplete = document.getElementById('transfer-complete');
    const shareCodeInput = document.getElementById('share-code-input');
    const connectButton = document.getElementById('connect-button');
    const scanQrButton = document.getElementById('scan-qr-button');
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
    const saveFileButton = document.getElementById('save-file-button');
    const receiveNewFileButton = document.getElementById('receive-new-file-button');
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    const errorOkButton = document.getElementById('error-ok-button');
    const closeButton = document.querySelector('.close-button');

    // Variables
    let peer;
    let peerId;
    let selectedFile;
    let connection;
    let receivedFile;
    let receivedData = [];
    let receivedChunks = 0;
    let totalChunks = 0;
    const CHUNK_SIZE = 16384; // 16KB chunks

    // Helper functions
    function showScreen(screen) {
        homeScreen.classList.remove('active');
        sendScreen.classList.remove('active');
        receiveScreen.classList.remove('active');
        screen.classList.add('active');
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');
    }

    function resetSendUI() {
        fileInfo.classList.add('hidden');
        shareInfo.classList.add('hidden');
        connectionStatus.classList.remove('hidden');
        peerConnected.classList.add('hidden');
        transferProgress.classList.add('hidden');
        transferComplete.classList.add('hidden');
        selectedFile = null;
        fileInput.value = '';
    }

    function resetReceiveUI() {
        receiveConnectionStatus.classList.add('hidden');
        receiveFileInfo.classList.add('hidden');
        receiveProgress.classList.add('hidden');
        receiveComplete.classList.add('hidden');
        shareCodeInput.value = '';
        receivedData = [];
        receivedFile = null;
    }

    function createPeer() {
        return new Promise((resolve, reject) => {
            try {
                // Using PeerJS public server for signaling
                const newPeer = new Peer(null, {
                    debug: 2
                });

                newPeer.on('open', (id) => {
                    resolve(newPeer);
                });

                newPeer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    reject(err);
                });
            } catch (err) {
                console.error('Failed to create peer:', err);
                reject(err);
            }
        });
    }

    function generateShareLink(peerId, fileDetails) {
        // Get the base URL, ensuring it's not localhost/127.0.0.1
        let baseUrl = window.location.href.split('?')[0];
        
        // For local development, instruct users to use a proper URL
        if (baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost')) {
            showError("You're using a local development URL. The receiver won't be able to connect unless you deploy this app to a publicly accessible URL (like GitHub Pages, Vercel, Netlify, etc.) or use a local tunnel service like ngrok.");
        }
        
        const fileInfo = btoa(JSON.stringify(fileDetails));
        return `${baseUrl}?peer=${peerId}&file=${fileInfo}`;
    }

    function parseShareLink(url) {
        try {
            const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : url);
            const peerId = params.get('peer');
            const fileInfoEncoded = params.get('file');
            
            if (!peerId || !fileInfoEncoded) {
                return null;
            }

            const fileInfo = JSON.parse(atob(fileInfoEncoded));
            return { peerId, fileInfo };
        } catch (e) {
            console.error('Failed to parse share link:', e);
            return null;
        }
    }

    function generateQRCode(link) {
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: link,
            width: 200,
            height: 200,
            colorDark: "#4f46e5",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function connectToPeer(peerId) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!peer) {
                    peer = await createPeer();
                }

                const conn = peer.connect(peerId, {
                    reliable: true
                });

                conn.on('open', () => {
                    resolve(conn);
                });

                conn.on('error', (err) => {
                    console.error('Connection error:', err);
                    reject(err);
                });
            } catch (err) {
                console.error('Failed to connect to peer:', err);
                reject(err);
            }
        });
    }

    function sendFileInChunks(file, conn) {
        return new Promise((resolve, reject) => {
            try {
                const fileReader = new FileReader();
                let offset = 0;
                const totalSize = file.size;
                const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
                
                // Send file metadata first
                conn.send({
                    type: 'file-meta',
                    name: file.name,
                    size: file.size,
                    contentType: file.type,
                    chunkCount: chunkCount
                });

                fileReader.onload = (e) => {
                    const chunk = e.target.result;
                    conn.send({
                        type: 'file-chunk',
                        data: chunk,
                        chunkIndex: Math.floor(offset / CHUNK_SIZE)
                    });

                    offset += CHUNK_SIZE;
                    const progress = Math.min(100, Math.round((offset / totalSize) * 100));
                    progressBar.style.width = `${progress}%`;
                    progressPercentage.textContent = `${progress}%`;

                    if (offset < totalSize) {
                        readNextChunk();
                    } else {
                        // All chunks sent
                        conn.send({
                            type: 'file-complete'
                        });
                        resolve();
                    }
                };

                fileReader.onerror = (error) => {
                    console.error('FileReader error:', error);
                    reject(error);
                };

                function readNextChunk() {
                    const slice = file.slice(offset, offset + CHUNK_SIZE);
                    fileReader.readAsArrayBuffer(slice);
                }

                // Start reading the first chunk
                readNextChunk();
            } catch (err) {
                console.error('Failed to send file:', err);
                reject(err);
            }
        });
    }

    function assembleFile(chunks, fileInfo) {
        const blob = new Blob(chunks, { type: fileInfo.contentType });
        return {
            blob: blob,
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.contentType
        };
    }

    function downloadFile(file) {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const peerId = urlParams.get('peer');
        const fileInfoEncoded = urlParams.get('file');

        if (peerId && fileInfoEncoded) {
            try {
                const fileInfo = JSON.parse(atob(fileInfoEncoded));
                
                // Switch to receive mode automatically
                showScreen(receiveScreen);
                shareCodeInput.value = window.location.href;
                
                // Display file information
                receiveFileName.textContent = `File: ${fileInfo.name}`;
                receiveFileSize.textContent = `Size: ${formatFileSize(fileInfo.size)}`;
                receiveFileType.textContent = `Type: ${fileInfo.contentType || 'Unknown'}`;
                
                // Connect to peer automatically
                handleConnect();
            } catch (e) {
                console.error('Failed to parse file info from URL', e);
                showError('Invalid sharing link. Please check and try again.');
            }
        }
    }

    // Event handlers
    sendButton.addEventListener('click', () => {
        showScreen(sendScreen);
    });

    receiveButton.addEventListener('click', () => {
        showScreen(receiveScreen);
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            displayFileInfo(selectedFile);
        }
    });

    // Drag and drop
    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('dragover');
    });

    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('dragover');
    });

    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            selectedFile = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            displayFileInfo(selectedFile);
        }
    });

    fileDropArea.addEventListener('click', () => {
        fileInput.click();
    });

    function displayFileInfo(file) {
        fileName.textContent = `File: ${file.name}`;
        fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
        fileType.textContent = `Type: ${file.type || 'Unknown'}`;
        fileInfo.classList.remove('hidden');
    }

    // Generate sharing link
    generateLinkButton.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('Please select a file first.');
            return;
        }

        try {
            if (!peer) {
                peer = await createPeer();
            }
            
            peerId = peer.id;
            
            const fileDetails = {
                name: selectedFile.name,
                size: selectedFile.size,
                contentType: selectedFile.type
            };

            const link = generateShareLink(peerId, fileDetails);
            shareLink.value = link;
            generateQRCode(link);
            
            fileInfo.classList.add('hidden');
            shareInfo.classList.remove('hidden');

            // Set up connection handler for incoming connection
            peer.on('connection', (conn) => {
                connection = conn;
                
                connectionStatus.classList.add('hidden');
                peerConnected.classList.remove('hidden');
                transferProgress.classList.remove('hidden');
                
                conn.on('open', async () => {
                    try {
                        await sendFileInChunks(selectedFile, conn);
                        transferComplete.classList.remove('hidden');
                    } catch (err) {
                        showError(`Failed to send file: ${err.message}`);
                    }
                });
                
                conn.on('error', (err) => {
                    console.error('Connection error:', err);
                    showError(`Connection error: ${err.message}`);
                });
                
                conn.on('close', () => {
                    console.log('Connection closed');
                });
            });
        } catch (err) {
            console.error('Failed to generate link:', err);
            showError(`Failed to create connection: ${err.message}`);
        }
    });

    // Copy link to clipboard
    copyLinkButton.addEventListener('click', () => {
        shareLink.select();
        document.execCommand('copy');
        copyLinkButton.textContent = 'Copied!';
        setTimeout(() => {
            copyLinkButton.textContent = 'Copy';
        }, 2000);
    });

    // Connect to sender
    connectButton.addEventListener('click', handleConnect);

    async function handleConnect() {
        const input = shareCodeInput.value.trim();
        
        if (!input) {
            showError('Please enter a share link or code.');
            return;
        }
        
        receiveConnectionStatus.classList.remove('hidden');
        
        try {
            const shareInfo = parseShareLink(input);
            
            if (!shareInfo) {
                throw new Error('Invalid sharing link or code.');
            }
            
            const { peerId, fileInfo } = shareInfo;
            
            // Display file information
            receiveFileName.textContent = `File: ${fileInfo.name}`;
            receiveFileSize.textContent = `Size: ${formatFileSize(fileInfo.size)}`;
            receiveFileType.textContent = `Type: ${fileInfo.contentType || 'Unknown'}`;
            
            // Connect to the peer
            connection = await connectToPeer(peerId);
            
            receiveConnectionStatus.classList.add('hidden');
            receiveFileInfo.classList.remove('hidden');
            
            // Set up data handling
            connection.on('data', (data) => {
                if (data.type === 'file-meta') {
                    // File metadata received
                    receivedFile = {
                        name: data.name,
                        size: data.size,
                        contentType: data.contentType,
                        chunkCount: data.chunkCount
                    };
                    
                    totalChunks = data.chunkCount;
                    receivedChunks = 0;
                    receivedData = new Array(totalChunks);
                    
                    receiveFileInfo.classList.add('hidden');
                    receiveProgress.classList.remove('hidden');
                } else if (data.type === 'file-chunk') {
                    // File chunk received
                    receivedData[data.chunkIndex] = new Uint8Array(data.data);
                    receivedChunks++;
                    
                    const progress = Math.round((receivedChunks / totalChunks) * 100);
                    receiveProgressBar.style.width = `${progress}%`;
                    receiveProgressPercentage.textContent = `${progress}%`;
                } else if (data.type === 'file-complete') {
                    // File transfer complete
                    const file = assembleFile(receivedData, receivedFile);
                    receivedFile.blob = file.blob;
                    
                    receiveProgress.classList.add('hidden');
                    receiveComplete.classList.remove('hidden');
                }
            });
            
            connection.on('error', (err) => {
                console.error('Connection error:', err);
                showError(`Connection error: ${err.message}`);
            });
            
            connection.on('close', () => {
                console.log('Connection closed');
            });
        } catch (err) {
            console.error('Connection failed:', err);
            receiveConnectionStatus.classList.add('hidden');
            showError(`Connection failed: ${err.message}`);
        }
    }

    // Download button
    downloadButton.addEventListener('click', () => {
        if (connection) {
            // Request the file
            connection.send({ type: 'request-file' });
        }
    });

    // Save file button
    saveFileButton.addEventListener('click', () => {
        if (receivedFile && receivedFile.blob) {
            downloadFile(receivedFile);
        }
    });

    // Receive another file button
    receiveNewFileButton.addEventListener('click', () => {
        resetReceiveUI();
        showScreen(homeScreen);
    });

    // Error modal
    errorOkButton.addEventListener('click', () => {
        errorModal.classList.add('hidden');
    });

    closeButton.addEventListener('click', () => {
        errorModal.classList.add('hidden');
    });

    // QR Code scanning functionality (simplified, as most browsers require HTTPS for camera access)
    scanQrButton.addEventListener('click', () => {
        // In a real implementation, you would integrate a QR code scanner library
        // that uses the device camera. For simplicity, we'll show an alternative message
        showError('QR code scanning requires camera access. For security reasons, please use HTTPS or enter the code manually.');
    });

    // Check if this is a receiver opening a share link
    checkUrlParams();
});