import { Injectable } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async permissionOptions(plan_id: number) {
    const permissions = await this.prisma.planPermission.findMany({
      where: { plan_id },
      include: {
        permission: true,
      },
    });

    return permissions.map((p) => {
      return { label: p.permission.action, value: p.permission.id };
    });
  }

  async getRoles(consumer_id: number) {
    return await this.prisma.role.findMany({
      where: { consumer_id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async deleteRole(id: number, consumer_id: number) {
    return await this.prisma.role.delete({
      where: { consumer_id, id },
    });
  }

  async createRole(dto: CreateRoleDto, consumer_id: number) {
    return this.prisma.role.create({
      data: {
        consumer_id,
        name: dto.name,
        permissions: {
          create: dto.permission_ids.map((id) => ({
            permission_id: id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async getUsers(consumer_id: number, search_text?: string | null, role_id?: number) {
    console.log({consumer_id, search_text, role_id});
    
    return await this.prisma.user.findMany({
      where: {
        consumer_id,
        ...(search_text && {
          OR: [
            { name: { contains: search_text, mode: 'insensitive' } },
            { email: { contains: search_text, mode: 'insensitive' } },
          ],
        }),
        ...(role_id && { role_id }),
      },
      include: {
        role: true,
      },
    });
  }

  async deleteUser(id: number, consumer_id: number) {
    return await this.prisma.user.delete({
      where: { consumer_id, id },
    });
  }

  async createUser(dto: CreateUserDto, consumer_id: number) {
    const hashedPassword = await bcryptjs.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        consumer_id,
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role_id: dto.role_id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
      },
    });

    if (dto.permission_ids) {
      // Remove existing permissions
      await this.prisma.rolePermission.deleteMany({
        where: { role_id: id },
      });

      // Re-add permissions
      await this.prisma.rolePermission.createMany({
        data: dto.permission_ids.map((pid) => ({
          role_id: id,
          permission_id: pid,
        })),
      });
    }

    return updatedRole;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    let hashedPassword: string | undefined = undefined;
    if (dto.password) {
      hashedPassword = await bcryptjs.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role_id: dto.role_id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }
}
