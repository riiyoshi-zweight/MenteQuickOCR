import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
    },
  });
}
