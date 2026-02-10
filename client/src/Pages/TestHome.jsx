import { useThemeContext } from "../Context/theme";

const TestHome = () => {
  const { theme } = useThemeContext();
  
  return (
    <div className="home" style={{ padding: "20px" }}>
      <h1>Blog App Test Page</h1>
      <p>Current theme: {theme}</p>
      <p>If you can see this, the basic setup is working!</p>
    </div>
  );
};

export default TestHome;