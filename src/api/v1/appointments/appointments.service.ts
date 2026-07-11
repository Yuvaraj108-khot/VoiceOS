import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { generatePrefixedId } from '../../../utils/generateId';
import type { z } from 'zod';
import type { createAppointmentSchema, updateAppointmentSchema } from './appointments.validator';
import { Prisma } from '@prisma/client';

export const appointmentsService = {
  async list(organizationId: string, options: { page?: number; limit?: number; status?: string; from?: string; to?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      organizationId,
      ...(options.status && { status: options.status as any }),
      ...(options.from && options.to && {
        startTime: {
          gte: new Date(options.from),
          lte: new Date(options.to),
        }
      })
    };

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          employee: { select: { id: true, name: true } },
        }
      }),
      prisma.appointment.count({ where })
    ]);

    return { items, total, page, limit };
  },

  async get(organizationId: string, id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        employee: { select: { id: true, name: true } },
      }
    });

    if (!appointment || appointment.organizationId !== organizationId) {
      throw ApiError.notFound('Appointment');
    }

    return appointment;
  },

  async create(organizationId: string, data: z.infer<typeof createAppointmentSchema>) {
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer || customer.organizationId !== organizationId) {
        throw ApiError.notFound('Customer');
      }
    }

    const employee = await prisma.aIEmployee.findUnique({ where: { id: data.employeeId } });
    if (!employee || employee.organizationId !== organizationId) {
      throw ApiError.notFound('AI Employee');
    }

    return prisma.appointment.create({
      data: {
        id: generatePrefixedId('apt'),
        organizationId,
        customerId: data.customerId,
        employeeId: data.employeeId,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.startTime),
        durationMinutes: Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000),
        status: 'PENDING',
      }
    });
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateAppointmentSchema>) {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId) {
      throw ApiError.notFound('Appointment');
    }

    const updateData: any = { ...data };
    if (data.startTime) updateData.scheduledAt = new Date(data.startTime);
    if (data.startTime && data.endTime) {
      updateData.durationMinutes = Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000);
    } else if (data.endTime) {
      updateData.durationMinutes = Math.round((new Date(data.endTime).getTime() - existing.scheduledAt.getTime()) / 60000);
    }
    delete updateData.startTime;
    delete updateData.endTime;

    return prisma.appointment.update({
      where: { id },
      data: updateData
    });
  },

  async delete(organizationId: string, id: string) {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId) {
      throw ApiError.notFound('Appointment');
    }

    await prisma.appointment.delete({ where: { id } });
  }
};
