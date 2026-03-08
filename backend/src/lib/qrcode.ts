import QRCode from 'qrcode';

export async function generateOrderQRCode(shopifyOrderId: string): Promise<string> {
    try {
        // In a real app, this might be a URL to a specific internal page or just the ID
        // For Alaska WMS, scanning this should trigger the return flow for this ID
        const qrContent = shopifyOrderId;
        const qrDataUrl = await QRCode.toDataURL(qrContent, {
            color: {
                dark: '#00D1FF', // Alaska Cyan
                light: '#00000000' // Transparent
            },
            margin: 1,
            scale: 10
        });
        return qrDataUrl;
    } catch (err) {
        console.error('QR Generation Error:', err);
        return '';
    }
}
