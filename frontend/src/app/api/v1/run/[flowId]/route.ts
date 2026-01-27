import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ flowId: string }> }
) {
    try {
        const { flowId } = await params;

        // 1. Verify API Key
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();

        // Ideally we would query by metadata directly, but listUsers is robust for this scale.
        // WARNING: listUsers has a default limit. For MVP this is fine.
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

        if (authError || !users) {
            console.error("Auth Admin Error:", authError);
            return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
        }

        const user = users.find(u => u.user_metadata?.api_key === apiKey);

        if (!user) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // 2. Fetch Flow Validation
        const { data: flow, error: flowError } = await supabaseAdmin
            .from('flows')
            .select('*')
            .eq('id', flowId)
            .single();

        if (flowError || !flow) {
            return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
        }

        if (flow.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized access to this flow' }, { status: 403 });
        }

        // 3. Prepare Payload for Backend
        const body = await request.json();
        const { inputs, tweaks } = body;
        const inputValue = inputs?.input_value || "";

        // Map to Backend FlowRequest Model
        const backendPayload = {
            nodes: flow.data.nodes || [],
            edges: flow.data.edges || [],
            message: inputValue,
            user_id: user.id,
            flow_id: flowId,
            // Allow tweaks to override keys, otherwise use stored keys if we had them (not implemented yet securely)
            // For now, keys must be passed in tweaks or handled by the backend environment
            openai_api_key: tweaks?.openai_api_key,
            groq_api_key: tweaks?.groq_api_key
        };

        // 4. Proxy to Python Backend
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

        const response = await fetch(`${backendUrl}/run_flow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `Backend Execution Failed: ${errorText}` }, { status: response.status });
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
