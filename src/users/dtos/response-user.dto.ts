export class ResponseCreateUserDto {
  id: string;
  fullName: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ResponseUserStreakDto {
  streak: number;
  lastStreakAt: Date | null;
}

export class ResponseUpdateAvatarDto {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}
