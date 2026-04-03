import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import qs from 'qs';
import { IStateStore } from '../../../core/ports/IStateStore';

const WEB_ORIGIN = "https://web.budgetbakers.com";
const API_ENDPOINT = `${WEB_ORIGIN}/api`;

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Origin": WEB_ORIGIN,
  "Referer": `${WEB_ORIGIN}/`,
  "Accept": "application/json, text/plain, */*",
};

const webClient = axios.create({
  withCredentials: true,
  headers: BROWSER_HEADERS
});

/**
 * Headless SSO authentication flow for BudgetBakers.
 * Follows the TRPC requests documented in api.md to fetch the sessionToken.
 */
export function budgetbakersAuthRoutes(stateStore: IStateStore) {
  return async (fastify: FastifyInstance) => {

    // 1. Trigger the login email
    fastify.post('/request-login', async (req: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
      const email = req.body.email;
      if (!email) return reply.status(400).send({ error: 'Email required' });

      try {
        const res = await webClient.post(`${API_ENDPOINT}/trpc/user.ssoSignInEmail?batch=1`, { "0": { json: email } }, { headers: { "Content-Type": "application/json" } });
        const ssoKey = res.data[0]?.result?.data?.json;
        if (!ssoKey) return reply.status(500).send({ error: 'Failed to retrieve ssoKey' });

        return { ssoKey, message: "Email sent. Check inbox and submit the SSO link/token to /confirm-login" };
      } catch (err: any) {
        req.log.error(err, 'Failed to request login email');
        return reply.status(500).send({ error: 'Upstream error' });
      }
    });

    // 2. Exchange token for session cookie
    fastify.post('/confirm-login', async (req: FastifyRequest<{ Body: { email: string, ssoKey: string, ssoToken: string } }>, reply: FastifyReply) => {
      const { email, ssoKey, ssoToken } = req.body;
      if (!email || !ssoKey || !ssoToken) return reply.status(400).send({ error: 'Missing required parameters' });

      try {
        // Exchange for authToken
        const authRes = await webClient.post(`${API_ENDPOINT}/trpc/user.confirmSsoAuth?batch=1`, 
          { "0": { json: { ssoKey, ssoToken, userEmail: email } } }, 
          { headers: { "Content-Type": "application/json" } }
        );
        const authToken = authRes.data[0]?.result?.data?.json;
        if (!authToken) return reply.status(401).send({ error: 'Invalid or expired SSO token' });

        // Get CSRF
        const csrfRes = await webClient.get(`${API_ENDPOINT}/auth/csrf`);
        const csrfToken = csrfRes.data?.csrfToken;

        // Parse Set-Cookie correctly into standard Cookie header format
        const rawCookies = csrfRes.headers['set-cookie'] || [];
        const cleanCookieString = rawCookies.map((c: string) => c.split(';')[0]).join('; ');

        // Exchange for session cookie (prevent absolute redirect)
        const sessionRes = await webClient.post(`${API_ENDPOINT}/auth/callback/sso`, 
          qs.stringify({ token: authToken, csrfToken, callbackUrl: WEB_ORIGIN }), 
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": cleanCookieString },
            maxRedirects: 0,
            validateStatus: (s) => s >= 200 && s < 400,
          }
        );

        const COOKIE_NAME = "__Secure-next-auth.session-token=";
        const sessionToken = sessionRes.headers["set-cookie"]
            ?.find((c: string) => c.startsWith(COOKIE_NAME))
            ?.split(";")[0]
            ?.slice(COOKIE_NAME.length);

        if (!sessionToken) {
          return reply.status(500).send({ error: "Failed to extract session token from callback" });
        }

        // Save sessionToken to DB
        await stateStore.setValue('budgetbakers_session_token', sessionToken);

        return { message: "Successfully authenticated to BudgetBakers!", sessionToken };
      } catch (err: any) {
        req.log.error(err, 'Failed to complete SSO authentication');
        return reply.status(500).send({ error: 'Upstream error' });
      }
    });

  };
}
