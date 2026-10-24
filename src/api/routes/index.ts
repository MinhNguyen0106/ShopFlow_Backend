import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { webhookRouter } from './webhook.routes.js';
import { fbOAuthRouter } from './fb-oauth.routes.js';
import { pageRouter } from './page.routes.js';
import { mediaRouter } from './media.routes.js';
import { postRouter } from './post.routes.js';
import { inboxRouter } from './inbox.routes.js';
import { orderParserRouter } from './order-parser.routes.js';
import { productRouter } from './product.routes.js';
import { paymentRouter } from './payment.routes.js';
import { shippingRouter } from './shipping.routes.js';
import { analyticsRouter } from './analytics.routes.js';

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

// Mount Order AI Parser routes (TASK-20)
apiV1Router.use('/orders', orderParserRouter);

// Mount Product Catalog routes (TASK-21)
apiV1Router.use('/products', productRouter);

// Mount Payment & VietQR routes (TASK-23)
apiV1Router.use('/payments', paymentRouter);

// Mount Shipping Carrier routes (TASK-23)
apiV1Router.use('/shipments', shippingRouter);

// Mount Business Analytics routes (TASK-24)
apiV1Router.use('/analytics', analyticsRouter);
