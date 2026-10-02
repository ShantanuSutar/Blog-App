import { useState } from "react";
import { Send } from "lucide-react";
import LoadingButton from "./ui/LoadingButton.jsx";
import api from "../api/axios.js";

const Newsletter = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");
        setMessage("");

        try {
            await api.post("/api/newsletter", { email: email.trim() });
            setStatus("success");
            setMessage("Subscribed successfully!");
            setEmail("");
        } catch {
            setStatus("error");
            setMessage("We couldn’t subscribe you right now. Please try again.");
        }
    };

    return (
        <div className="newsletter">
            <h3>Subscribe to our Newsletter</h3>
            <div className="newsletter-content">
                <form onSubmit={handleSubmit}>
                    <label className="sr-only" htmlFor="newsletter-email">Email address</label>
                    <input
                        id="newsletter-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                    <LoadingButton type="submit" loading={status === "loading"} loadingLabel="Subscribing…" icon={Send}>Subscribe</LoadingButton>
                </form>
                {message && <p className={`message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
            </div>
        </div>
    );
};

export default Newsletter;
