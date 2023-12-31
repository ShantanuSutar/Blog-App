import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";

const Login = () => {
  const [inputs, setInputs] = useState({
    username: "",
    password: "",
  });

  const [err, setError] = useState(null);

  const navigate = useNavigate();

  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (inputs.username === "") {
      setError("Please enter username");
      return;
    } else if (inputs.password === "") {
      setError("Please enter password");
      return;
    }

    try {
      await login(inputs);
      navigate("/");
    } catch (err) {
      setError(err.response.data);
    }
  };

  return (
    <div className="auth">
      <h1 className="text constant">Login</h1>
      <form>
        <input
          className="text"
          type="text"
          placeholder="username"
          name="username"
          onChange={handleChange}
        />
        <input
          className="text"
          type="password"
          placeholder="password"
          name="password"
          onChange={handleChange}
        />
        <button className="btn-grad" onClick={handleSubmit}>
          Login
        </button>
        {err && <p>{err} !</p>}
        <span>
          Don't you have an account ?{" "}
          <Link className="text" to={"/register"}>
            Register
          </Link>
        </span>
      </form>
    </div>
  );
};

export default Login;
