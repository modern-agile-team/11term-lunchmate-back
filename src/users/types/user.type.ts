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

export type CreateSocialUserProps = {
  email: string;
  name: string;
  nickname: string;
  birthDate: string;
  gender: UserGender;
  schoolInfo?: string;
  introduce?: string;
  mbti?: Mbti;
  provider: AuthProvider;
  providerId: string;
  providerAccessToken?: string;
  providerRefreshToken?: string;
};
