import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import validator from "validator";
const URL = import.meta.env.VITE_BASE_URL;

const Register = () => {
  const [inputs, setInputs] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const [err, setError] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (inputs.username === "") {
      setError("Please enter username");
      setLoading(false);
      return;
    } else if (!validator.isEmail(inputs.email)) {
      setError("Please enter valid email");
      setLoading(false);
      return;
    } else if (inputs.password === "") {
      setError("Please enter password");
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${URL}/api/auth/register`, inputs);
      setLoading(false);
      navigate("/login");
    } catch (err) {
      console.log(err);
      setLoading(false);
      setError(err.response.data);
    }
  };

  return (
    <div className="auth">
      <h1 className="text">Register</h1>
      <form>
        <input
          className="text"
          required
          type="text"
          placeholder="username"
          name="username"
          onChange={handleChange}
        />
        <input
          className="text"
          required
          type="email"
          placeholder="email"
          name="email"
          onChange={handleChange}
        />
        <input
          className="text"
          required
          type="password"
          placeholder="password"
          name="password"
          onChange={handleChange}
        />
        <button className="btn-grad" onClick={handleSubmit}>
          {loading ? "Please wait..." : "Register"}
        </button>
        {err && <p>{err} !</p>}
        <span>
          Already have an have an account ?{" "}
          <Link className="text" to={"/login"}>
            Login
          </Link>
        </span>
      </form>
    </div>
  );
};

export default Register;
