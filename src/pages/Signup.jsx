import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SignupForm from "../components/auth/SignupForm";

import "./Signup.css";
import SignupBenefits from "../components/auth/SignUpBenefits";

export default function Signup() {
  return (
    <>
      <Navbar />
      <main className="su-page">
        <div className="su-card">
          <SignupForm />
          <SignupBenefits/>
        </div>
      </main>
      <Footer />
    </>
  );
}