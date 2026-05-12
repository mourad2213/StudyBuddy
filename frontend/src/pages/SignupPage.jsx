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
  const [emailError, setEmailError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [registerUser] = useMutation(REGISTER_USER);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleFormKeyDown = (e) => {
    if (e.key !== "Enter") return;

    const focusable = Array.from(
      e.currentTarget.querySelectorAll("input, button[type='submit']"),
    );
    const activeElement = document.activeElement;

    if (activeElement && activeElement.id === "signup-email") {
      const trimmedEmail = form.email.trim();
      if (!isValidEmail(trimmedEmail)) {
        e.preventDefault();
        setEmailError("Enter a valid email");
        return;
      }
      setEmailError("");
    }

    if (activeElement && activeElement.id === "signup-confirm-password") {
      if (confirmPassword && confirmPassword !== form.password) {
        e.preventDefault();
        setConfirmError("Passwords do not match");
        return;
      }
      setConfirmError("");
    }

    const currentIndex = focusable.indexOf(document.activeElement);
    const next = focusable[currentIndex + 1];

    if (next && next.tagName === "BUTTON") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
      return;
    }

    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = form.email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Enter a valid email");
      return;
    }
    setEmailError("");

    if (confirmPassword && confirmPassword !== form.password) {
      setConfirmError("Passwords do not match");
      return;
    }

    setConfirmError("");

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

        <form
          className="signup-card"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
        >
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
            onChange={(e) => {
              const value = e.target.value;
              setForm({ ...form, email: value });
              if (emailError && isValidEmail(value.trim())) {
                setEmailError("");
              }
            }}
            required
          />
          {emailError && <p className="signup-error">{emailError}</p>}

          <FormInput
            id="signup-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              if (confirmError && confirmPassword === e.target.value) {
                setConfirmError("");
              }
            }}
            required
          />

          <FormInput
            id="signup-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              const value = e.target.value;
              setConfirmPassword(value);
              if (confirmError && value === form.password) {
                setConfirmError("");
              }
            }}
            required
          />
          {confirmError && <p className="signup-error">{confirmError}</p>}

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
