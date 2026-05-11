import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { REGISTER_USER } from "../graphql/mutations/auth";
import FormInput from "../components/FormInput";
import "./SignupPage.css";

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const [registerUser] = useMutation(REGISTER_USER);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (confirmPassword && confirmPassword !== form.password) {
      alert("Passwords do not match.");
      return;
    }

    const res = await registerUser({
      variables: form,
    });

    localStorage.setItem("token", res.data.register.token);

    //alert("Registered!");
    navigate("/login");
  };

  return (
    <div className="signup-page">
      <div className="signup-shell">
        <div className="signup-header">
          <h1 className="signup-title">Create Your Account</h1>
        </div>

        <form className="signup-card" onSubmit={handleSubmit}>
          <h2 className="signup-card-title">
            Sign up to start finding study buddies
          </h2>

          <FormInput
            id="signup-name"
            label="Full Name"
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <FormInput
            id="signup-email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <FormInput
            id="signup-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <FormInput
            id="signup-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button className="signup-button" type="submit">
            Create Account
          </button>
        </form>

        <p className="signup-footer">
          Already have an account?{" "}
          <Link className="signup-link" to="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
