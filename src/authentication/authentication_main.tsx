import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    linkWithPhoneNumber,
} from 'firebase/auth';

import { useDispatch, useSelector } from 'react-redux';


import owlLogo from './owl_agent.png';
import './auth_main.css';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../state_mngmt/store';
import { auth, db } from '../firebase/firebase_config';
import { authStart, authSuccess } from '../state_mngmt/slices/authentication_slice';
import { Firebase_Storage } from '../db/firebase_storage';
import { User } from '../entity/users/user';
import { s3 } from '../s3_uploader/s3_uploader';


declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier | null;
    }
}

export const AuthMain = () => {
    const dispatch = useDispatch<AppDispatch>();
    const database = new Firebase_Storage<User>(db, "users", User.fromMap);
    const { user, isAuthenticated } = useSelector(
        (state: RootState) => state.authentication
    );

    const [step, setStep] = useState<'phone' | 'otp' | 'email' | 'inforequired' | 'done'>('email');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userInfoRequired, setuserInfoRequired] = useState<boolean>(false)
    const [name, setName] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [authChecked, setAuthChecked] = useState(false);

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmationRef = useRef<any>(null);
    const navigate = useNavigate();
    const checkIfUserExist = async (phone: string) => {
        const userExists = await database.getByField("phone", phone);
        const u = userExists[0];
        if (u.phone) {
            return true
        }
        return false;
    }
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                dispatch(authStart());

                const token = await firebaseUser.getIdToken();

                dispatch(
                    authSuccess({
                        user: {
                            uid: firebaseUser.uid,
                            phoneNumber: firebaseUser.phoneNumber,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                        },
                        token,
                    })
                );

                const existing = await database.getByField("email", firebaseUser.email);
                

                if (existing.length && existing[0].email && existing[0].phone) {
                    
                    navigate('/chathome');
                } else if (existing.length && existing[0].email && !existing[0].phone) {
                    await database.deleteOne(firebaseUser.uid);
                    await auth.signOut();
                    setStep('email');
                } else {
                    setStep("email");
                }
            }
            setAuthChecked(true);
        });

        return () => unsubscribe();
    }, []);
    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(
                auth,
                'recaptcha-container',
                { size: 'invisible' }
            );
        }
    };

    const handleSendOTP = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setStep("email")
                return;
            }
            if (!phone.trim()) {
                setError('Please enter your phone number');
                return;
            }
            setError('');
            setLoading(true);
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;

            if (!appVerifier) {
                setError('reCAPTCHA failed.');
                return;
            }

            const fullNumber = `+91${phone.replace(/\D/g, '')}`;

            const confirmation = await linkWithPhoneNumber(
                currentUser,
                fullNumber,
                appVerifier
            );

            confirmationRef.current = confirmation;
            setStep('otp');

        } catch (err) {
            console.error("Firestore error:", err);
            setError('Failed to send OTP.');
            window.recaptchaVerifier?.clear();
            window.recaptchaVerifier = null;     // is it throwing?
        } finally {
            setLoading(false);
        }

    };

    const handleVerify = async () => {
        const code = otp.join('');

        if (code.length < 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await confirmationRef.current.confirm(code);
            const currentuser = auth.currentUser;
            if (!currentuser) {
                throw new Error("No user after confirmation")
            }
            const existing = await database.getByField("email", currentuser.email);
            if (!existing.length) {
                const newUser = new User(
                    currentuser.uid,
                    currentuser.phoneNumber ?? '',
                    currentuser.displayName ?? '',
                    currentuser.email ?? '',
                    currentuser.uid,
                );
                await database.createOne(newUser);
                await s3.putObject("docs/data.json", JSON.stringify({ name: currentuser.displayName }), "application/json");
                navigate("/chathome")
            }
        } catch {
            setError('Invalid OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            const currentUserEmail = auth.currentUser?.email;
            const u = await database.getByField("email", currentUserEmail);
            if (!u.length) {
                setStep('phone')
            }
        } catch {
            setError('Google sign-in failed.');
        }
    };

    const handleMicrosoft = async () => {
        try {
            const provider = new OAuthProvider('microsoft.com');
            provider.addScope('email');
            provider.addScope('profile');
            await signInWithPopup(auth, provider);
        } catch {
            setError('Microsoft sign-in failed.');
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const updated = [...otp];
        updated[index] = digit;
        setOtp(updated);

        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const GoogleIcon = () => (
        <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.6l6.86-6.86C35.64 2.68 30.2 0 24 0 14.6 0 6.36 5.48 2.5 13.44l7.98 6.2C12.56 13.36 17.78 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.7-.15-3.34-.44-4.9H24v9.28h12.68c-.55 2.96-2.24 5.48-4.78 7.18l7.36 5.72C43.84 37.24 46.5 31.36 46.5 24.5z" />
            <path fill="#FBBC05" d="M10.48 28.64A14.5 14.5 0 019.5 24c0-1.61.28-3.17.78-4.64l-7.98-6.2A24.04 24.04 0 000 24c0 3.86.92 7.5 2.5 10.56l7.98-6.2z" />
            <path fill="#34A853" d="M24 48c6.2 0 11.64-2.05 15.52-5.58l-7.36-5.72c-2.04 1.36-4.66 2.18-8.16 2.18-6.22 0-11.44-3.86-13.52-9.14l-7.98 6.2C6.36 42.52 14.6 48 24 48z" />
        </svg>
    );
    if (!authChecked) {
        return (
            <div className="loading-screen">
                Loading...
            </div>
        );
    }
    return (

        <section className="design-section">
            <div className="auth-card">
                <div className="card-brand">
                    <img src={owlLogo} alt="Owl Agent" />
                    <div className="card-brand-name">Owl Agent</div>
                    <div className="card-brand-tag">Secure Access</div>
                    <div className="card-brand-divider" />
                </div>

                {!isAuthenticated && step === 'email' && <div>
                    <div className="continue_with_google" onClick={handleGoogle}>
                        <h4 className='cwg_text'>Continue With Google</h4>
                        <GoogleIcon />
                    </div>
                    <div className='line_or'>
                        <div className="line1"></div>
                        <div className='or_text'>Or</div>
                        <div className="line2"></div>
                    </div>

                    <div className="custom_email_field">
                        <input type="email" placeholder="Enter your email" />
                    </div>
                </div>}
                {step === 'phone' &&
                    <>
                        <div className="d3-form-title">Sign in</div>
                        <p className="d3-form-sub">
                            Enter your mobile number to receive a verification code.
                        </p>

                        <div className="d3-field">
                            <label>Mobile Number</label>
                            <div className="d3-input-wrap">
                                <span className="d3-prefix">+91</span>
                                <input
                                    className="d3-input"
                                    type="tel"
                                    placeholder="09876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <div id="recaptcha-container" />

                        {error && <div className="auth-error">{error}</div>}

                        <button
                            className="d3-btn"
                            onClick={handleSendOTP}
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </>

                }


                {step === 'otp' && (
                    <>
                        <div className="d3-form-title">Enter Code</div>
                        <p className="d3-form-sub">
                            Enter the 6-digit code sent to +91 {phone}
                        </p>

                        <div className="d3-otp-row">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => {
                                        otpRefs.current[i] = el;
                                    }}
                                    className="d3-otp-input"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(e.target.value, i)}
                                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                                />
                            ))}
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button
                            className="d3-btn"
                            onClick={handleVerify}
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button> :
                        <button className="d3-btn">
                            Next
                        </button>
                    </>
                )}
            </div>
        </section>
    );
};
