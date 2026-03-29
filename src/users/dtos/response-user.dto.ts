export class ResponseCreateUserDto {
  id: string;
  fullName: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ResponseUpdateAvatarDto {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}
