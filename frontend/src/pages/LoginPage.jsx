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

  const [loginUser] = useMutation(LOGIN_USER);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await loginUser({
      variables: form,
    });

    console.log("Logged in user:", res.data.login.user);
    localStorage.setItem("token", res.data.login.token);
    localStorage.setItem("username", res.data.login.user.name);
    localStorage.setItem("userId", res.data.login.user.id);
    //alert("Logged In!");
    
    navigate("/profile");
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-header">
          <h1 className="login-title">Welcome Back</h1>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
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
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <FormInput
            id="login-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

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
