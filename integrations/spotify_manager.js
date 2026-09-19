// integrations/spotify_manager.js — Official Spotify OAuth, Search, Playlists & Player Manager

const CLIENT_ID = () => process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = () => process.env.SPOTIFY_CLIENT_SECRET || '';
function resolveRedirectUri(override) {
  if (override && typeof override === 'string' && override.startsWith('http')) {
    return override;
  }
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/integrations/spotify/callback`;
  }
  return 'http://localhost:4173/api/integrations/spotify/callback';
}

const REDIRECT_URI = (override) => resolveRedirectUri(override);

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'app-remote-control'
].join(' ');

// Generate official OAuth authorization URL
function getAuthUrl(state = 'study_os_spotify', redirectUri = null) {
  const cid = CLIENT_ID();
  if (!cid) {
    throw new Error('SPOTIFY_CLIENT_ID is not configured in .env');
  }
  const effectiveRedirect = resolveRedirectUri(redirectUri);
  const params = new URLSearchParams({
    client_id: cid,
    response_type: 'code',
    redirect_uri: effectiveRedirect,
    scope: SCOPES,
    state
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens and save to SQLite
async function exchangeCode(db, uid, code, redirectUri = null) {
  const cid = CLIENT_ID();
  const csecret = CLIENT_SECRET();
  if (!cid || !csecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required in .env');
  }

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const creds = Buffer.from(`${cid}:${csecret}`).toString('base64');
  const effectiveRedirect = resolveRedirectUri(redirectUri);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: effectiveRedirect
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange Spotify token');
  }

  const expiresAt = Date.now() + (data.expires_in * 1000);

  // Fetch Spotify User Profile
  let profile = { display_name: 'Spotify User', id: '', product: 'unknown' };
  try {
    const profRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    if (profRes.ok) profile = await profRes.json();
  } catch (_) {}

  db.prepare(`
    INSERT INTO spotify_connections (user_id, access_token, refresh_token, expires_at, scope, user_id_spotify, display_name, product)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET 
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, spotify_connections.refresh_token),
      expires_at = excluded.expires_at,
      display_name = excluded.display_name,
      product = excluded.product,
      updated_at = CURRENT_TIMESTAMP
  `).run(uid, data.access_token, data.refresh_token, expiresAt, data.scope || SCOPES, profile.id, profile.display_name, profile.product);

  return { ok: true, profile };
}

// Retrieve a guaranteed valid access token, auto-refreshing if expired
async function getValidAccessToken(db, uid) {
  const row = db.prepare('SELECT * FROM spotify_connections WHERE user_id = ?').get(uid);
  if (!row || !row.access_token) return null;

  // If token is valid for more than 60 seconds, reuse it
  if (Date.now() < row.expires_at - 60000) {
    return row.access_token;
  }

  // Token expired: refresh it
  if (!row.refresh_token) return row.access_token;

  const cid = CLIENT_ID();
  const csecret = CLIENT_SECRET();
  if (!cid || !csecret) return row.access_token;

  try {
    const creds = Buffer.from(`${cid}:${csecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      const newExpiresAt = Date.now() + (data.expires_in * 1000);
      db.prepare(`
        UPDATE spotify_connections 
        SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `).run(data.access_token, newExpiresAt, uid);
      return data.access_token;
    }
  } catch (e) {
    console.error('Spotify token refresh error:', e.message);
  }

  return row.access_token;
}

// Get Spotify connection status
function getSpotifyStatus(db, uid) {
  const row = db.prepare('SELECT * FROM spotify_connections WHERE user_id = ?').get(uid);
  const configured = Boolean(CLIENT_ID() && CLIENT_SECRET());
  if (!row || !row.access_token) {
    return { connected: false, configured };
  }
  return {
    connected: true,
    configured,
    displayName: row.display_name,
    product: row.product
  };
}

// Fetch user's playlists from Spotify API
async function getUserPlaylists(db, uid) {
  const token = await getValidAccessToken(db, uid);
  if (!token) throw new Error('Spotify is not connected. Please connect Spotify first.');

  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=30', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch playlists from Spotify');
  }

  const data = await res.json();
  return (data.items || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    tracksCount: p.tracks?.total || 0,
    imageUrl: p.images?.[0]?.url || '',
    uri: p.uri,
    externalUrl: p.external_urls?.spotify || ''
  }));
}

// Search songs, artists, albums, playlists
async function searchMusic(db, uid, query, type = 'track,artist,album,playlist') {
  const token = await getValidAccessToken(db, uid);
  if (!token) throw new Error('Spotify is not connected. Connect Spotify in Settings.');

  const params = new URLSearchParams({
    q: query,
    type,
    limit: 8
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to search Spotify');
  }

  const data = await res.json();

  const tracks = (data.tracks?.items || []).map(t => ({
    id: t.id,
    name: t.name,
    artist: t.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
    album: t.album?.name || '',
    albumArt: t.album?.images?.[0]?.url || '',
    durationMs: t.duration_ms,
    uri: t.uri,
    externalUrl: t.external_urls?.spotify || ''
  }));

  const playlists = (data.playlists?.items || []).map(p => ({
    id: p.id,
    name: p.name,
    imageUrl: p.images?.[0]?.url || '',
    tracksCount: p.tracks?.total || 0,
    uri: p.uri,
    externalUrl: p.external_urls?.spotify || ''
  }));

  return { tracks, playlists };
}

// Get currently playing track and state
async function getCurrentlyPlaying(db, uid) {
  const token = await getValidAccessToken(db, uid);
  if (!token) return { connected: false };

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 204 || res.status === 200) {
      if (res.status === 204) return { isPlaying: false, track: null };
      const data = await res.json();
      const item = data.item;
      if (!item) return { isPlaying: false, track: null };

      return {
        isPlaying: data.is_playing,
        progressMs: data.progress_ms,
        track: {
          id: item.id,
          name: item.name,
          artist: item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
          album: item.album?.name || '',
          albumArt: item.album?.images?.[0]?.url || '',
          durationMs: item.duration_ms,
          uri: item.uri,
          externalUrl: item.external_urls?.spotify || ''
        }
      };
    }
  } catch (e) {
    console.error('Currently playing fetch error:', e.message);
  }

  return { isPlaying: false, track: null };
}

// Playback control (play, pause, next, previous) with graceful fallback
async function playbackControl(db, uid, action, uri = null) {
  const token = await getValidAccessToken(db, uid);
  if (!token) throw new Error('Spotify is not connected.');

  let endpoint = 'https://api.spotify.com/v1/me/player/play';
  let method = 'PUT';
  let reqBody = null;

  if (action === 'pause') {
    endpoint = 'https://api.spotify.com/v1/me/player/pause';
    method = 'PUT';
  } else if (action === 'next') {
    endpoint = 'https://api.spotify.com/v1/me/player/next';
    method = 'POST';
  } else if (action === 'previous') {
    endpoint = 'https://api.spotify.com/v1/me/player/previous';
    method = 'POST';
  } else if (action === 'play') {
    endpoint = 'https://api.spotify.com/v1/me/player/play';
    method = 'PUT';
    if (uri) {
      if (uri.includes(':playlist:') || uri.includes(':album:')) {
        reqBody = JSON.stringify({ context_uri: uri });
      } else {
        reqBody = JSON.stringify({ uris: [uri] });
      }
    }
  }

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: reqBody
    });

    if (res.status === 204 || res.status === 200) {
      return { ok: true, action };
    }

    // Handle restriction / no active device gracefully
    const errData = await res.json().catch(() => ({}));
    return {
      ok: false,
      fallback: true,
      reason: errData.error?.reason || 'NO_ACTIVE_DEVICE',
      message: 'No active Spotify player detected. Open Spotify on your phone/desktop or use the embed player below.',
      webUrl: uri ? `https://open.spotify.com/track/${uri.split(':').pop()}` : 'https://open.spotify.com'
    };
  } catch (e) {
    return {
      ok: false,
      fallback: true,
      message: `Playback request failed: ${e.message}`,
      webUrl: 'https://open.spotify.com'
    };
  }
}

// Disconnect Spotify account
function disconnectSpotify(db, uid) {
  db.prepare('DELETE FROM spotify_connections WHERE user_id = ?').run(uid);
  return { ok: true };
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  getSpotifyStatus,
  getUserPlaylists,
  searchMusic,
  getCurrentlyPlaying,
  playbackControl,
  disconnectSpotify
};
