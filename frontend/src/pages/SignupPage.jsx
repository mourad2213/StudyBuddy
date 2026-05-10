import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { REGISTER_USER } from "../graphql/mutations/auth";
import Navbar from "../components/Navbar";

function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [registerUser] = useMutation(REGISTER_USER);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await registerUser({
      variables: form,
    });

    localStorage.setItem("token", res.data.register.token);

    alert("Registered!");
  };

  return (
    <>
      <Navbar />

      <form onSubmit={handleSubmit}>
        <h1>Create Account</h1>

        <input
          placeholder="Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button type="submit">Sign Up</button>
      </form>
    </>
  );
}

export default SignupPage;
