import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('LINE login error:', error, errorDescription);
      return NextResponse.redirect(new URL(`/?error=${error}`, req.url));
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
    const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing LINE login credentials in environment variables.');
      return NextResponse.json({ error: 'LINE Auth environment variables not configured' }, { status: 500 });
    }

    // Determine redirect URI dynamically based on current request host / env variables
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://calme-line.vercel.app';
    const redirectUri = `${origin}/api/auth/line/callback`;

    // 1. Exchange auth code for access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errText);
      return NextResponse.json({ error: 'Token exchange failed', details: errText }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from LINE API using access token
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errText = await profileResponse.text();
      console.error('Failed to fetch LINE profile:', errText);
      return NextResponse.json({ error: 'Failed to fetch LINE profile' }, { status: 500 });
    }

    const profileData = await profileResponse.json();
    const lineUserId = profileData.userId;
    const displayName = profileData.displayName;
    const pictureUrl = profileData.pictureUrl || '';

    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE user ID not found in profile' }, { status: 400 });
    }

    // 3. Generate Firebase Custom Auth Token
    const customToken = await adminAuth.createCustomToken(lineUserId, {
      displayName,
      pictureUrl,
    });

    // 4. Redirect user back to dashboard page with the custom token
    // The dashboard client-side page will use signInWithCustomToken to log in
    const redirectUrl = new URL('/dashboard', req.url);
    redirectUrl.searchParams.set('token', customToken);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
