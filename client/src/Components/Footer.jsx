import Logo from "../img/logos/logo-no-background.png";

const Footer = () => {
  return (
    <footer className="footer">
      <img src={Logo} alt="" />
      <span>
        Made with <span style={{ color: "red" }}>❤</span> and <b>Reactjs</b>
      </span>
    </footer>
  );
};

export default Footer;
