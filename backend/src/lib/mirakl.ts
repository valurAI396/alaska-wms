export class Mirakl {
    private static apiUrl = process.env.MIRAKL_API_URL;
    private static apiKey = process.env.MIRAKL_API_KEY;

    static async fetchReturns() {
        if (!this.apiUrl || !this.apiKey) return [];

        const response = await fetch(`${this.apiUrl}/api/returns?status=WAITING_FOR_RECEPTION`, {
            headers: {
                'Authorization': this.apiKey || '',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Mirakl API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.returns || [];
    }

    static async acceptReturn(returnId: string) {
        const response = await fetch(`${this.apiUrl}/api/returns/${returnId}/receive`, {
            method: 'PUT',
            headers: {
                'Authorization': this.apiKey || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                received: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`Mirakl Return Reception Error: ${response.statusText}`);
        }

        return response.json();
    }
}
