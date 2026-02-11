import { useState } from "react";
import axios from "axios";
import { useThemeContext } from "../Context/theme";

const Newsletter = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState("");
    const { theme } = useThemeContext();
    const URL = import.meta.env.VITE_BASE_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");
        setMessage("");

        try {
            await axios.post(`${URL}/api/newsletter`, { email });
            setStatus("success");
            setMessage("Subscribed successfully!");
            setEmail("");
        } catch (err) {
            setStatus("error");
            setMessage(err.response?.data || "Something went wrong.");
        }
    };

    return (
        <div className={`newsletter ${theme === "dark" ? "dark" : ""}`}>
            <h3>Subscribe to our Newsletter</h3>
            <div className="newsletter-content">
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={theme === "dark" ? "dark" : ""}
                    />
                    <button type="submit" disabled={status === "loading"}>
                        {status === "loading" ? "Subscribing..." : "Subscribe"}
                    </button>
                </form>
                {message && <p className={`message ${status}`}>{message}</p>}
            </div>
        </div>
    );
};

export default Newsletter;
