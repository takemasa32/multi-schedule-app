export const useSession = () => ({ data: null, status: 'unauthenticated' });

export const signIn = async () => undefined;

export const signOut = async () => undefined;

export const SessionProvider = ({ children }) => children;
