import { createGlobalState } from '@/lib/state';
import { LoginUserType } from '@/server/access-layer/user';

export const defaultUser: LoginUserType = {
  id: '1',
  name: 'Admin',
  phone: '*********',
  email: 'admin@****.com',
  image: '/images/user.png',
};

export const useAuthUser = createGlobalState<LoginUserType>('session', {
  ...defaultUser,
});
