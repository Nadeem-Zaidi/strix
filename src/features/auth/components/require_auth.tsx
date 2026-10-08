import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "@/shared/lib/firebase";
import { OwlLoader } from "@/shared/ui/owl_loader";

// Pages behind sign-in. Sends visitors who aren't signed in — or haven't
// finished sign-up (verified phone) — to the sign-in screen. The backend
// enforces the same rule on every API call; this keeps the UI consistent.
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.phoneNumber) {
        setAllowed(true);
      } else {
        setAllowed(false);
        navigate("/", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (!allowed) return <OwlLoader />;
  return <>{children}</>;
};
