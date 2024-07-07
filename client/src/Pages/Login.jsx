import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";

const Login = () => {
  const [inputs, setInputs] = useState({
    username: "demo",
    password: "demo",
  });
  const [loading, setLoading] = useState(false);

  const [err, setError] = useState(null);

  const navigate = useNavigate();

  const { login } = useContext(AuthContext);

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
    } else if (inputs.password === "") {
      setError("Please enter password");
      setLoading(false);
      return;
    }

    try {
      await login(inputs);
      setLoading(false);
      navigate("/");
    } catch (err) {
      setLoading(false);
      setError(err.response.data);
    }
  };
  useEffect(() => {
    alert(
      "If you want to just see around the project then demo login credentials are already entered, just click on the login button to login, else would love you to be our new user by clicking on the Register button and creating a new account."
    );
  }, []);
  return (
    <div className="auth">
      <h1 className="text constant">Login</h1>
      <form>
        <input
          defaultValue={inputs.username}
          className="text"
          type="text"
          placeholder="username"
          name="username"
          onChange={handleChange}
        />
        <input
          defaultValue={inputs.password}
          className="text"
          type="password"
          placeholder="password"
          name="password"
          onChange={handleChange}
        />
        <button className="btn-grad" onClick={handleSubmit}>
          {loading ? "Logging in..." : "Login"}
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
