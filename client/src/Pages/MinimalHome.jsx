import { useThemeContext } from "../Context/theme";

const MinimalHome = () => {
  const { theme } = useThemeContext();
  
  return (
    <div className="home">
      <h1>Minimal Home Page</h1>
      <p>Current theme: {theme}</p>
    </div>
  );
};

export default MinimalHome;