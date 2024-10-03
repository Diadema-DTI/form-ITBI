document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('itbiForm');
    const metodoSubmissao = document.getElementById('metodoSubmissao');
    const formularioCompleto = document.getElementById('formularioCompleto');
    const documentosContainer = document.getElementById('documentosContainer');

    metodoSubmissao.addEventListener('change', function() {
        if (this.value === 'formulario') {
            formularioCompleto.style.display = 'block';
            documentosContainer.style.display = 'none';
        } else {
            formularioCompleto.style.display = 'none';
            documentosContainer.style.display = 'block';
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(form);
            const jsonData = {};
            formData.forEach((value, key) => {
                jsonData[key] = value;
            });

            // Fetch the public key from the server
            const publicKeyResponse = await fetch('/.netlify/functions/get-public-key');
            if (!publicKeyResponse.ok) {
                throw new Error(`Failed to fetch public key. Status: ${publicKeyResponse.status}`);
            }
            const { publicKeyPem } = await publicKeyResponse.json();

            // Encrypt the form data
            const encryptedData = await encryptFormData(jsonData, publicKeyPem);

            // Submit the encrypted form data
            const response = await fetch('/.netlify/functions/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ encryptedData }),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Form submission failed. Status: ${response.status}. Message: ${errorData.error}`);
            }
    
            alert('Formulário enviado com sucesso!');
        } catch (error) {
            console.error('Detailed error:', error);
            alert(`Erro ao enviar o formulário: ${error.message}`);
        }
    });

async function encryptFormData(data, publicKeyPem) {
    // Convert PEM to CryptoKey
    const publicKey = await importPublicKey(publicKeyPem);

    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        publicKey,
        new TextEncoder().encode(JSON.stringify(data))
    );

    return Array.from(new Uint8Array(encryptedData));
}

async function importPublicKey(pemKey) {
    // Remove header and footer
    const pemContents = pemKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
    
    // Base64 decode the string to get the binary data
    const binaryDer = atob(pemContents);
    
    // Convert from a binary string to an ArrayBuffer
    const buf = new ArrayBuffer(binaryDer.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < binaryDer.length; i++) {
        bufView[i] = binaryDer.charCodeAt(i);
    }

    // Import the key
    return window.crypto.subtle.importKey(
        "spki",
        buf,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}
