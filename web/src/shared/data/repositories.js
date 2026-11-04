import * as auth from './real/auth.js';
import * as catalog from './real/catalog.js';
import * as orders from './real/orders.js';
import * as inbox from './real/inbox.js';
import * as business from './real/business.js';
import * as guide from './real/guide.js';
import * as admin from './real/admin.js';

export const authRepo = auth;
export const catalogRepo = catalog;
export const ordersRepo = orders;
export const inboxRepo = inbox;
export const businessRepo = business;
export const guideRepo = guide;
export const adminRepo = admin;
