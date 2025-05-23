import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as dayjs from 'dayjs';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async loginSuperAdmin(superAdmin: { email: string; id: number }) {
    const payload = { email: superAdmin.email, sub: superAdmin.id };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // Refresh token validity
    });

    // Save refresh token in the database
    await this.prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { refresh_token: refreshToken },
    });

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: refreshToken,
    };
  }

  async loginUser(user: { email: string; id: number; consumer_id: number }) {
    const payload = {
      email: user.email,
      sub: user.id,
      consumer_id: user.consumer_id,
    };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // Refresh token validity
    });

    // Save refresh token in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: refreshToken,
    };
  }

  async validateSuperAdmin(email: string, pass: string): Promise<any> {
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!(await bcrypt.compare(pass, superAdmin.password))) {
      throw new HttpException("Password doesn't match", HttpStatus.FORBIDDEN);
    }
    return superAdmin;
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        consumer: {
          select: {
            billing_logs: {
              where: {
                billing_date: {
                  gte: dayjs().subtract(1, 'month').toISOString(),
                  lte: dayjs().toISOString(),
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.consumer.billing_logs.length) {
      throw new HttpException('Billing cycle failed', HttpStatus.FORBIDDEN);
    }
    if (!(await bcrypt.compare(pass, user.password))) {
      throw new HttpException("Password doesn't match", HttpStatus.FORBIDDEN);
    }

    return user;
  }

  async clientRefreshToken(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);

    // Validate refresh token in the database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, refresh_token: refreshToken },
    });

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = this.jwtService.sign(
      {
        email: payload.email,
        sub: payload.sub,
        consumer_id: payload.consumer_id,
      },
      { expiresIn: '15m' },
    );

    return { access_token: newAccessToken };
  }

  async adminRefreshToken(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);

    // Validate refresh token in the database
    const user = await this.prisma.superAdmin.findUnique({
      where: { id: payload.sub, refresh_token: refreshToken },
    });

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = this.jwtService.sign(
      {
        email: payload.email,
        sub: payload.sub,
      },
      { expiresIn: '15m' },
    );

    return { access_token: newAccessToken };
  }

  async invalidateAdminRefreshToken(refreshToken: string): Promise<void> {
    const payload = this.jwtService.decode(refreshToken) as { sub: number };

    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Invalidate the refresh token in the database
    await this.prisma.superAdmin.updateMany({
      where: { id: payload.sub, refresh_token: refreshToken },
      data: { refresh_token: null },
    });
  }

  async invalidateClientRefreshToken(refreshToken: string): Promise<void> {
    const payload = this.jwtService.decode(refreshToken) as { sub: number };

    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Invalidate the refresh token in the database
    await this.prisma.user.updateMany({
      where: { id: payload.sub, refresh_token: refreshToken },
      data: { refresh_token: null },
    });
  }
}
