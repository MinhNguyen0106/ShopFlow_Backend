import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { webhookRouter } from './webhook.routes.js';
import { fbOAuthRouter } from './fb-oauth.routes.js';
import { pageRouter } from './page.routes.js';
import { mediaRouter } from './media.routes.js';
import { postRouter } from './post.routes.js';
import { inboxRouter } from './inbox.routes.js';

export const apiV1Router = Router();

// Mount health check route
apiV1Router.use('/health', healthRouter);

// Mount authentication routes
apiV1Router.use('/auth', authRouter);

// Mount Meta webhook route
apiV1Router.use('/webhook', webhookRouter);

// Mount Meta Facebook OAuth routes
apiV1Router.use('/fb-oauth', fbOAuthRouter);

// Mount Connected Pages routes
apiV1Router.use('/pages', pageRouter);

// Mount Media Upload routes
apiV1Router.use('/media', mediaRouter);

// Mount Scheduled Posts routes
apiV1Router.use('/posts', postRouter);

// Mount Centralized Inbox routes
apiV1Router.use('/inbox', inboxRouter);
