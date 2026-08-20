import { getStore } from '@netlify/blobs';

const store = getStore('certify-published');
const recordKey = 'current';

export default async (request) => {
    if (request.method === 'GET') {
        const data = await store.get(recordKey, { type: 'json' });
        return Response.json(data || {});
    }

    if (request.method === 'PUT') {
        let data;
        try {
            data = await request.json();
        } catch {
            return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
        }

        if (!data.image || !Array.isArray(data.fields) || !Array.isArray(data.roster)) {
            return Response.json({ error: 'Incomplete certificate data.' }, { status: 400 });
        }

        await store.setJSON(recordKey, {
            image: data.image,
            dims: data.dims || null,
            fields: data.fields,
            roster: data.roster,
            publishedAt: new Date().toISOString()
        });
        return Response.json({ ok: true });
    }

    return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, PUT' }
    });
};
