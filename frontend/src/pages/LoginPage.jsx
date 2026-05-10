import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { LOGIN_USER } from "../graphql/mutations/auth";
import Navbar from "../components/Navbar";

function LoginPage() {
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

    localStorage.setItem("token", res.data.login.token);

    alert("Logged In!");
  };

  return (
    <>
      <Navbar />

      <form onSubmit={handleSubmit}>
        <h1>Welcome Back</h1>

        <input
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button type="submit">Log In</button>
      </form>
    </>
  );
}

export default LoginPage;
