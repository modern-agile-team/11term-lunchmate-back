export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum AuthProvider {
  local = 'local',
  google = 'google',
  kakao = 'kakao',
}

export enum UserGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum Mbti {
  INTJ = 'INTJ',
  INTP = 'INTP',
  ENTJ = 'ENTJ',
  ENTP = 'ENTP',
  INFJ = 'INFJ',
  INFP = 'INFP',
  ENFJ = 'ENFJ',
  ENFP = 'ENFP',
  ISTJ = 'ISTJ',
  ISFJ = 'ISFJ',
  ESTJ = 'ESTJ',
  ESFJ = 'ESFJ',
  ISTP = 'ISTP',
  ISFP = 'ISFP',
  ESTP = 'ESTP',
  ESFP = 'ESFP',
}

export enum RegisterStatus {
  SOCIAL_PENDING = 'SOCIAL_PENDING',
  COMPLETE = 'COMPLETE',
}

export type CreateSocialUserProps = {
  email: string;
  nickname: string;
  provider: AuthProvider;
  providerId: string;
  providerAccessToken: string;
  providerRefreshToken: string;
  registerStatus: RegisterStatus;
};
