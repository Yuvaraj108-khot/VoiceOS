import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { generatePrefixedId } from '../../../utils/generateId';
import type { z } from 'zod';
import type { createCustomerSchema, updateCustomerSchema } from './customers.validator';
import { Prisma } from '@prisma/client';

export const customersService = {
  async list(organizationId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.search && {
        OR: [
          { firstName: { contains: options.search, mode: 'insensitive' } },
          { lastName: { contains: options.search, mode: 'insensitive' } },
          { email: { contains: options.search, mode: 'insensitive' } },
          { phone: { contains: options.search, mode: 'insensitive' } },
        ]
      })
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where })
    ]);

    return { items, total, page, limit };
  },

  async get(organizationId: string, id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        calls: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          select: { id: true, startedAt: true, status: true, duration: true, sentiment: true }
        },
        appointments: {
          take: 5,
          orderBy: { scheduledAt: 'desc' },
        }
      }
    });

    if (!customer || customer.organizationId !== organizationId || customer.deletedAt) {
      throw ApiError.notFound('Customer');
    }

    return customer;
  },

  async create(organizationId: string, data: z.infer<typeof createCustomerSchema>) {
    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: { organizationId, email: data.email, deletedAt: null }
      });
      if (existing) throw ApiError.conflict('Customer with this email already exists');
    }

    if (data.phone) {
      const existing = await prisma.customer.findFirst({
        where: { organizationId, phone: data.phone, deletedAt: null }
      });
      if (existing) throw ApiError.conflict('Customer with this phone already exists');
    }

    return prisma.customer.create({
      data: {
        id: generatePrefixedId('cus'),
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        metadata: data.metadata || {},
      }
    });
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateCustomerSchema>) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId || existing.deletedAt) {
      throw ApiError.notFound('Customer');
    }

    if (data.email && data.email !== existing.email) {
      const conflict = await prisma.customer.findFirst({
        where: { organizationId, email: data.email, deletedAt: null }
      });
      if (conflict) throw ApiError.conflict('Email is already in use by another customer');
    }

    if (data.phone && data.phone !== existing.phone) {
      const conflict = await prisma.customer.findFirst({
        where: { organizationId, phone: data.phone, deletedAt: null }
      });
      if (conflict) throw ApiError.conflict('Phone is already in use by another customer');
    }

    return prisma.customer.update({
      where: { id },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId || existing.deletedAt) {
      throw ApiError.notFound('Customer');
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
};
