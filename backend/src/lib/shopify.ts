import crypto from 'crypto';

export class Shopify {
    private static domain = process.env.SHOPIFY_SHOP_DOMAIN;
    private static accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    private static webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    private static locationId = process.env.SHOPIFY_LOCATION_ID;

    private static get apiBaseUrl() {
        return `https://${this.domain}/admin/api/2024-01`;
    }

    static verifyWebhook(rawBody: string, hmacHeader: string): boolean {
        if (!this.webhookSecret || !hmacHeader) return false;

        const hash = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(rawBody, 'utf8')
            .digest('base64');

        return hash === hmacHeader;
    }

    static async fetchProducts() {
        const response = await fetch(`${this.apiBaseUrl}/products.json`, {
            headers: {
                'X-Shopify-Access-Token': this.accessToken || '',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Shopify API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.products;
    }

    static async updateInventory(inventoryItemId: string, available: number) {
        const response = await fetch(`${this.apiBaseUrl}/inventory_levels/set.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': this.accessToken || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location_id: this.locationId,
                inventory_item_id: inventoryItemId,
                available: available,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Shopify Inventory Update Error: ${JSON.stringify(error)}`);
        }

        return response.json();
    }

    static async createOrder(orderData: any) {
        const response = await fetch(`${this.apiBaseUrl}/orders.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': this.accessToken || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order: orderData }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Shopify Order Creation Error: ${JSON.stringify(error)}`);
        }

        return response.json();
    }

    static async fetchOrders(sinceDate: string) {
        const response = await fetch(`${this.apiBaseUrl}/orders.json?status=any&created_at_min=${sinceDate}`, {
            headers: {
                'X-Shopify-Access-Token': this.accessToken || '',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Shopify Orders Fetch Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.orders;
    }
}
