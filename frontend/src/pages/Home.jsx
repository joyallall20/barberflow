import Barbers from "../components/home/Barbers";
import Hero from "../components/home/Hero";
import Services from "../components/home/Services";
import Shop from "../components/home/Shop";
import Trust from "../components/home/Trust";

const Home = () => {
  return (
    <>
      <Hero />
      <Trust />
      <Services/>
      <Barbers/>
      <Shop/>
    </>
  );
};

export default Home;