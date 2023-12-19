import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const [inputs, setInputs] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [err, setError] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`/api/auth/register`, inputs);
      navigate("/login");
    } catch (err) {
      console.log(err);
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
          Register
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
