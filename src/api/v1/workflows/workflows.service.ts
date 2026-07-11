import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { generatePrefixedId } from '../../../utils/generateId';
import type { z } from 'zod';
import type { createWorkflowSchema, updateWorkflowSchema } from './workflows.validator';

export const workflowsService = {
  async list(organizationId: string, options: { employeeId?: string; page?: number; limit?: number } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(options.employeeId && { employeeId: options.employeeId }),
    };

    const [items, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workflow.count({ where })
    ]);

    return { items, total, page, limit };
  },

  async get(organizationId: string, id: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true } }
      }
    });

    if (!workflow || workflow.organizationId !== organizationId) {
      throw ApiError.notFound('Workflow');
    }

    return workflow;
  },

  async create(organizationId: string, data: z.infer<typeof createWorkflowSchema>) {
    return prisma.workflow.create({
      data: {
        id: generatePrefixedId('wf'),
        organizationId,
        employeeId: data.employeeId,
        name: data.name,
        description: data.description,
        nodes: data.nodes as any,
        edges: data.edges as any,
        variables: data.variables,
        triggerConfig: data.triggerConfig,
        isActive: data.isActive,
      }
    });
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateWorkflowSchema>) {
    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId) {
      throw ApiError.notFound('Workflow');
    }

    return prisma.workflow.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.nodes && { nodes: data.nodes as any }),
        ...(data.edges && { edges: data.edges as any }),
        ...(data.variables && { variables: data.variables }),
        ...(data.triggerConfig && { triggerConfig: data.triggerConfig }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      }
    });
  },

  async delete(organizationId: string, id: string) {
    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId) {
      throw ApiError.notFound('Workflow');
    }

    await prisma.workflow.delete({
      where: { id },
    });
  }
};
