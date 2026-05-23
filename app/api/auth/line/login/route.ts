import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'LINE Login Client ID not configured on server' }, { status: 500 });
    }

    // Determine redirect URI dynamically based on current request host / env variables
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://calme-line.vercel.app';
    const redirectUri = `${origin}/api/auth/line/callback`;

    // Construct LINE authorization URL
    const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    lineAuthUrl.searchParams.set('response_type', 'code');
    lineAuthUrl.searchParams.set('client_id', clientId);
    lineAuthUrl.searchParams.set('redirect_uri', redirectUri);
    lineAuthUrl.searchParams.set('state', 'calmeRandomStateString123'); // Simple CSRF state
    lineAuthUrl.searchParams.set('scope', 'profile openid');

    return NextResponse.redirect(lineAuthUrl.toString());
  } catch (error) {
    console.error('Error redirecting to LINE Login:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
