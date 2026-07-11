import { Router } from 'express';
import { authRoutes } from './auth/auth.routes';
import { organizationsRoutes } from './organizations/organizations.routes';
import { teamRoutes } from './team/team.routes';
import { aiEmployeesRoutes } from './ai-employees/ai-employees.routes';
import { knowledgeRoutes } from './knowledge/knowledge.routes';
import { callsRoutes } from './calls/calls.routes';
import { workflowsRoutes } from './workflows/workflows.routes';
import { customersRoutes } from './customers/customers.routes';
import { appointmentsRoutes } from './appointments/appointments.routes';
import { analyticsRoutes } from './analytics/analytics.routes';
import { integrationsRoutes } from './integrations/integrations.routes';
import { billingRoutes } from './billing/billing.routes';
import { notificationsRoutes } from './notifications/notifications.routes';
import { settingsRoutes } from './settings/settings.routes';
import { adminRoutes } from './admin/admin.routes';
import { tenantResolver } from '../../middleware/tenantResolver';

const router = Router();

// Global API routes
router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationsRoutes);

// Organization-scoped API routes
// The tenantResolver ensures req.organization is set correctly before hitting these routes.
const orgRouter = Router();
orgRouter.use(tenantResolver);

orgRouter.use('/organizations', organizationsRoutes);
orgRouter.use('/team', teamRoutes);
orgRouter.use('/ai-employees', aiEmployeesRoutes);
orgRouter.use('/knowledge', knowledgeRoutes);
orgRouter.use('/calls', callsRoutes);
orgRouter.use('/workflows', workflowsRoutes);
orgRouter.use('/customers', customersRoutes);
orgRouter.use('/appointments', appointmentsRoutes);
orgRouter.use('/analytics', analyticsRoutes);
orgRouter.use('/integrations', integrationsRoutes);
orgRouter.use('/settings', settingsRoutes);

// Mount the org-scoped router
// Optional: If we want to mount this under a specific org ID like `/v1/orgs/:orgId/...` 
// we would do it here. For now, tenantResolver pulls from JWT or headers.
router.use('/', orgRouter);

export const v1Router = router;
