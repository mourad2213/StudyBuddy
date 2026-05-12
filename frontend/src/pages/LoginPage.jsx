import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { LOGIN_USER } from "../graphql/mutations/auth";
import FormInput from "../components/FormInput";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loginUser] = useMutation(LOGIN_USER);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const handleFormKeyDown = (e) => {
    if (e.key !== "Enter") return;

    const focusable = Array.from(
      e.currentTarget.querySelectorAll("input, button[type='submit']"),
    );
    const activeElement = document.activeElement;

    if (activeElement && activeElement.id === "login-email") {
      const trimmedEmail = form.email.trim();
      if (!isValidEmail(trimmedEmail)) {
        e.preventDefault();
        setEmailError("Enter a valid email");
        return;
      }
      setEmailError("");
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
  setPasswordError("");

  try {
    const res = await loginUser({
      variables: {
        email: trimmedEmail,
        password: form.password,
      },
    });

    const { token, user } = res.data.login;

    localStorage.setItem("token", token);
    localStorage.setItem("userId", user.id);
    localStorage.setItem("userName", user.name);
    localStorage.setItem("username", user.name);

    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("user", JSON.stringify({ id: user.id, name: user.name, email: user.email }));

    const onboardingDone = localStorage.getItem("onboardingDone");
    if (!onboardingDone) {
      navigate("/profile-setup");
    } else {
      navigate("/dashboard");
    }
  } catch (error) {
    setPasswordError("Incorrect password");
  }
};

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
        </div>

        <form
          className="login-card"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
        >
          <h2 className="login-card-title">
            Log in to continue finding study buddies
          </h2>
          <FormInput
            id="login-email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              if (emailError && isValidEmail(e.target.value.trim())) {
                setEmailError("");
              }
            }}
            required
          />
          {emailError && <p className="login-error">{emailError}</p>}

          <FormInput
            id="login-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              if (passwordError) {
                setPasswordError("");
              }
            }}
            required
          />
          {passwordError && <p className="login-error">{passwordError}</p>}

          <a className="login-forgot" href="#">
            Forgot password?
          </a>

          <button className="login-button" type="submit">
            Log in
          </button>
        </form>

        <p className="login-footer">
          Don&apos;t have an account?{" "}
          <Link className="login-link" to="/signup">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
