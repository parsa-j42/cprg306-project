import {auth} from '@/lib/firebase';
import {
    AuthError,
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    GithubAuthProvider,
    linkWithPopup,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    User
} from 'firebase/auth';
import {AppError, ErrorCodes} from '@/lib/errors';

export class UserService {
    private readonly githubProvider: GithubAuthProvider;

    constructor() {
        this.githubProvider = new GithubAuthProvider();
        // Add necessary scopes if needed
        this.githubProvider.addScope('user:email');
    }

    async signUp(email: string, password: string) {
        try {
            return await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            const authError = error as AuthError;
            if (authError.code === 'auth/email-already-in-use') {
                throw new AppError(
                    'Email already exists',
                    ErrorCodes.EMAIL_ALREADY_EXISTS,
                    400
                );
            }
            throw new AppError(
                'Failed to create account',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }
    }

    async signIn(email: string, password: string) {
        try {
            return await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            throw new AppError(
                'Invalid email or password',
                ErrorCodes.INVALID_CREDENTIALS,
                401
            );
        }
    }

    async signInWithGithub() {
        try {
            const result = await signInWithPopup(auth, this.githubProvider);

            // Get GitHub OAuth access token
            const credential = GithubAuthProvider.credentialFromResult(result);
            if (!credential) {
                throw new AppError(
                    'Failed to get GitHub credentials',
                    ErrorCodes.INVALID_CREDENTIALS,
                    401
                );
            }

            return result;
        } catch (error: any) {
            const authError = error as AuthError;

            // Handle account exists with different credential
            if (authError.code === 'auth/account-exists-with-different-credential') {
                const email = authError.customData?.email;
                if (!email) throw error;

                // Get sign-in methods for this email
                const methods = await fetchSignInMethodsForEmail(auth, email);

                // If the user has previously signed in with GitHub
                if (methods.includes('github.com')) {
                    // Sign in with GitHub again
                    const ghResult = await signInWithPopup(auth, this.githubProvider);
                    return ghResult;
                }

                throw new AppError(
                    'This email is already associated with a different sign-in method. Please use your original sign-in method.',
                    ErrorCodes.INVALID_CREDENTIALS,
                    401
                );
            }

            throw new AppError(
                'Failed to sign in with GitHub',
                ErrorCodes.INVALID_CREDENTIALS,
                401
            );
        }
    }

    async linkGithubAccount(user: User) {
        try {
            return await linkWithPopup(user, this.githubProvider);
        } catch (error) {
            throw new AppError(
                'Failed to link GitHub account',
                ErrorCodes.INVALID_CREDENTIALS,
                401
            );
        }
    }

    async signOut() {
        try {
            await signOut(auth);
        } catch (error) {
            throw new AppError(
                'Failed to sign out',
                ErrorCodes.UNAUTHORIZED,
                401
            );
        }
    }

    async resetPassword(email: string) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw new AppError(
                'Failed to send reset email',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }
    }

    async getSignInMethods(email: string) {
        try {
            return await fetchSignInMethodsForEmail(auth, email);
        } catch (error) {
            throw new AppError(
                'Failed to fetch sign-in methods',
                ErrorCodes.INVALID_INPUT,
                400
            );
        }
    }
}