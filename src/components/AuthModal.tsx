import { useState, useEffect } from 'react';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { X, Zap } from 'lucide-react';

type Props = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) onClose();
  }, [isSignedIn, onClose]);

  if (isSignedIn) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">ChargeEV</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-2xl font-bold">
            {mode === 'sign-in' ? 'Welcome Back' : 'Join ChargeEV'}
          </h2>
          <p className="text-emerald-100 text-sm mt-1">
            {mode === 'sign-in' ? 'Sign in to your account' : 'Create your free account'}
          </p>
        </div>

        <div className="p-6">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('sign-in')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'sign-in' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('sign-up')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'sign-up' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'sign-in' ? (
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none border-0 p-0',
                  header: 'hidden',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border-gray-200 hover:bg-gray-50 text-gray-700 font-medium',
                  dividerLine: 'bg-gray-200',
                  dividerText: 'text-gray-400',
                  formFieldLabel: 'text-sm font-medium text-gray-700',
                  formFieldInput: 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                  formButtonPrimary: 'w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all',
                  footerActionLink: 'text-emerald-600 font-semibold hover:underline',
                  footer: 'hidden',
                  phoneNumberField: 'hidden',
                  formFieldRow__phoneNumber: 'hidden',
                },
              }}
              signUpUrl="#"
              afterSignInUrl={window.location.href}
            />
          ) : (
            <SignUp
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none border-0 p-0',
                  header: 'hidden',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border-gray-200 hover:bg-gray-50 text-gray-700 font-medium',
                  dividerLine: 'bg-gray-200',
                  dividerText: 'text-gray-400',
                  formFieldLabel: 'text-sm font-medium text-gray-700',
                  formFieldInput: 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                  formButtonPrimary: 'w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all',
                  footerActionLink: 'text-emerald-600 font-semibold hover:underline',
                  footer: 'hidden',
                  phoneNumberField: 'hidden',
                  formFieldRow__phoneNumber: 'hidden',
                },
              }}
              signInUrl="#"
              afterSignUpUrl={window.location.href}
            />
          )}

          <div className="mt-4 text-center border-t border-gray-100 pt-4">
            {mode === 'sign-in' ? (
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <button onClick={() => setMode('sign-up')} className="text-emerald-600 font-semibold hover:underline">
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button onClick={() => setMode('sign-in')} className="text-emerald-600 font-semibold hover:underline">
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
